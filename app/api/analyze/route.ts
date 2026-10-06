import { createClient, createAdminClient } from "@/lib/supabase-server";
import { analyzeLabel, enrichIngredientsText, applyPreferences, SAMPLE_PRODUCTS, IngredientAnalysis, RawProductFactsSchema, calculateHealthScore } from "@/lib/claude";
import { 
  reserveCredits, 
  finalizeReservation, 
  releaseReservation,
  claimOperation,
  saveOperationResultAndFinalize,
  releaseOperationOnFailure,
  recoverOperationAccounting
} from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/plans";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { z } from "zod";
import crypto from "crypto";

export const maxDuration = 60; // Prevent Vercel execution timeouts

const AnalyzePayloadSchema = z.object({
  idempotencyKey: z.string().trim().max(128).optional(),
  barcode: z.string().trim().max(50).nullable().optional(),
  image: z.string()
    .max(10 * 1024 * 1024, "Image payload too large (max 10MB base64)")
    .refine(val => !val || val.startsWith("data:image/") || val.length > 50, {
      message: "Invalid file type. Only image data URLs are allowed."
    })
    .nullable()
    .optional(),
  preferences: z.array(z.string().max(100)).nullable().optional(),
  isDemo: z.boolean().nullable().optional(),
  isSample: z.boolean().nullable().optional(),
  filename: z.string().max(255).nullable().optional(),
  productName: z.string().max(255).nullable().optional()
}).refine(data => !!data.barcode || !!data.image || !!data.isDemo || !!data.isSample || !!data.productName, {
  message: "Either barcode, image, productName, isDemo, or isSample must be provided"
});

// In-memory rate limiter per IP
const globalLimiter = globalThis as unknown as {
  ipRequestCounts?: Map<string, { count: number; resetAt: number }>
};

if (!globalLimiter.ipRequestCounts) {
  globalLimiter.ipRequestCounts = new Map();
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitWindowMs = 60 * 1000;
  const maxRequests = 20;

  if (globalLimiter.ipRequestCounts!.size > 1000) {
    for (const [key, val] of Array.from(globalLimiter.ipRequestCounts!.entries())) {
      if (now > val.resetAt) globalLimiter.ipRequestCounts!.delete(key);
    }
  }

  const record = globalLimiter.ipRequestCounts!.get(ip);
  if (!record || now > record.resetAt) {
    globalLimiter.ipRequestCounts!.set(ip, { count: 1, resetAt: now + limitWindowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function POST(request: Request) {
  let activeReservationOpId: string | null = null;
  let currentUserId: string | null = null;
  let activeWorkerId: string | null = null;
  let activeFencingToken: number | undefined = undefined;

  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please wait a minute before trying again."
      }, { status: 429 });
    }

    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parsedBody = AnalyzePayloadSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({
        error: "Invalid request payload",
        details: parsedBody.error.format()
      }, { status: 400 });
    }

    const { barcode, image, preferences, isDemo, isSample, filename, productName } = parsedBody.data;

    const supabase = await createClient();
    let { data: { user } } = await supabase.auth.getUser();

    // Fallback: If cookie-based session is missing/expired, check Bearer token in Authorization header
    if (!user) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7).trim();
        if (token) {
          const adminClient = createAdminClient();
          const tokenUserRes = await adminClient.auth.getUser(token);
          if (tokenUserRes.data?.user) {
            user = tokenUserRes.data.user;
          }
        }
      }
    }

    const isLoggedIn = !!user;
    if (isLoggedIn && user) {
      currentUserId = user.id;
    }

    // 1. SAMPLE / DEMO MODE (0 credits cost, no DB pollution)
    if (isDemo || isSample) {
      const sampleKey = (productName && productName.toLowerCase().includes("oat")) ? "sample_oats" : "sample_cookies";
      const baseSample = SAMPLE_PRODUCTS[sampleKey] || SAMPLE_PRODUCTS.sample_cookies;
      const finalPrefs = preferences || [];
      const sampleAnalysis = applyPreferences(baseSample, finalPrefs);
      sampleAnalysis.is_sample = true;

      return NextResponse.json({
        success: true,
        analysis: sampleAnalysis,
        scanId: "sample_demo_id",
        source: "sample_demo",
        is_sample: true
      });
    }

    // 2. AUTHENTICATION & CREDITS REQUIREMENT
    if (!isLoggedIn || !user) {
      return NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Please sign in to scan food products. You can test our interactive Sample Mode without signing in."
      }, { status: 401 });
    }

    // 2.1 Resolve user dietary preferences from profile if not passed in body BEFORE payload hashing
    let finalPrefs = preferences || [];
    if (!preferences || preferences.length === 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("dietary_profile")
        .eq("id", user.id)
        .single();
      if (profile?.dietary_profile?.allergies) {
        finalPrefs = profile.dietary_profile.allergies;
      }
    }

    // 3. IDEMPOTENCY CHECK & ATOMIC CREDIT RESERVATION (1 Credit per single scan)
    const headerIdempotencyKey = request.headers.get("x-idempotency-key")?.trim() || "";
    const bodyIdempotencyKey = parsedBody.data.idempotencyKey?.trim() || "";
    if (headerIdempotencyKey && bodyIdempotencyKey && headerIdempotencyKey !== bodyIdempotencyKey) {
      return NextResponse.json({
        error: "IDEMPOTENCY_KEY_MISMATCH",
        message: "Conflicting idempotency keys provided in header and body."
      }, { status: 400 });
    }
    let idempotencyKey = bodyIdempotencyKey || headerIdempotencyKey;

    const cookieStore = await cookies();
    const preferredLanguage = cookieStore.get("preferred_lang")?.value || "en";

    const normalizedPayload = {
      barcode: barcode || null,
      imageHash: image ? crypto.createHash("sha256").update(image).digest("hex") : null,
      preferences: Array.isArray(finalPrefs) ? [...finalPrefs].sort() : [],
      productName: productName || null,
      filename: filename || null,
      preferredLanguage
    };

    if (!idempotencyKey) {
      const hash = crypto.createHash("sha256").update(`${user.id}:${JSON.stringify(normalizedPayload)}`).digest("hex").slice(0, 24);
      idempotencyKey = `det_${hash}`;
    }

    const opId = `op_scan_${user.id.slice(0, 8)}_${idempotencyKey}`;
    const payloadHash = crypto.createHash("sha256").update(JSON.stringify(normalizedPayload)).digest("hex");

    const workerId = `w_${process.pid || 1}_${crypto.randomBytes(4).toString("hex")}`;
    activeWorkerId = workerId;

    // Atomically claim operation
    const claim = await claimOperation(
      user.id,
      opId,
      "scan",
      CREDIT_COSTS.SCAN,
      payloadHash,
      workerId,
      120
    );

    if (!claim.success) {
      if (claim.error === "IDEMPOTENCY_CONFLICT") {
        return NextResponse.json({
          error: "IDEMPOTENCY_CONFLICT",
          message: "This idempotency key was previously used with a different request payload."
        }, { status: 409 });
      }
      if (claim.error === "OPERATION_IN_PROGRESS") {
        return NextResponse.json({
          error: "OPERATION_IN_PROGRESS",
          message: "This scan is actively being processed by another worker. Please wait."
        }, { status: 409 });
      }
      if (claim.error === "INSUFFICIENT_CREDITS") {
        return NextResponse.json({
          error: "INSUFFICIENT_CREDITS",
          message: "You do not have enough scan credits. Please purchase a scan pack to continue.",
          availableCredits: claim.availableCredits ?? 0
        }, { status: 403 });
      }
      return NextResponse.json({
        error: claim.error || "OPERATION_CLAIM_FAILED",
        message: claim.message || "Failed to claim operation."
      }, { status: 500 });
    }

    activeFencingToken = claim.fencingToken;

    // If operation was already completed, return durable result with exact saved scanId
    if (claim.status === "completed" || claim.alreadyCompleted) {
      const savedAnalysis = claim.result?.analysis || claim.result;
      const savedScanId = claim.result?.scanId || opId;
      return NextResponse.json({
        success: true,
        analysis: savedAnalysis,
        scanId: savedScanId,
        source: "idempotent_retry",
        already_completed: true
      });
    }

    // If operation was in accounting_pending, recover accounting
    if (claim.status === "accounting_pending" || claim.accountingPending) {
      const recovery = await recoverOperationAccounting(user.id, opId);
      const savedAnalysis = claim.result?.analysis || claim.result;
      const savedScanId = claim.result?.scanId || opId;
      if (recovery.success) {
        return NextResponse.json({
          success: true,
          analysis: savedAnalysis,
          scanId: savedScanId,
          remainingCredits: recovery.newBalance,
          recovered: true
        });
      } else {
        return NextResponse.json({
          success: false,
          status: "accounting_pending",
          error: "ACCOUNTING_FINALIZATION_FAILED",
          opId,
          scanId: savedScanId,
          message: `Scan analysis is saved, but credit finalization failed: ${recovery.error}. Please retry.`,
          analysis: savedAnalysis
        }, { status: 500 });
      }
    }

    activeReservationOpId = opId;

    // 4. BARCODE LOOKUP (CACHE OR OPEN FOOD FACTS)
    if (barcode) {
      // A. Local cache lookup with schema version & schema validation check
      const { data: cachedProduct } = await supabase
        .from("products_cache")
        .select("*")
        .eq("barcode", barcode)
        .eq("schema_version", "2.0")
        .maybeSingle();

      if (cachedProduct && cachedProduct.raw_data) {
        // Validate cached raw facts schema
        const cacheParsed = RawProductFactsSchema.safeParse(cachedProduct.raw_data);
        if (cacheParsed.success) {
          const rawFacts = cacheParsed.data;
          const { score, reason, safetyLevel } = calculateHealthScore(rawFacts);

          const baseAnalysis: IngredientAnalysis = {
            product_name: rawFacts.product_name,
            brand: rawFacts.brand,
            health_score: score,
            health_score_reason: reason,
            safety_level: safetyLevel,
            description: rawFacts.description,
            panel_status: rawFacts.panel_status,
            unreadable_instructions: rawFacts.unreadable_instructions,
            ingredients: rawFacts.ingredients,
            additives: rawFacts.additives,
            allergens: rawFacts.allergens_declared,
            allergens_declared: rawFacts.allergens_declared,
            nutrition_facts: rawFacts.nutrition_facts,
            recommendations: rawFacts.recommendations,
            alternatives_detailed: rawFacts.alternatives_detailed,
            upf_score: rawFacts.upf_score,
            upf_reason: rawFacts.upf_reason,
            glycemic_index_estimate: rawFacts.glycemic_index_estimate,
            glycemic_reason: rawFacts.glycemic_reason
          };

          // Apply user preferences dynamically on read
          const personalizedAnalysis = applyPreferences(baseAnalysis, finalPrefs);

          const { data: scanData, error: scanInsertErr } = await supabase
            .from("scans")
            .insert({
              user_id: user.id,
              op_id: opId,
              accounting_status: "accounting_pending",
              product_name: personalizedAnalysis.product_name,
              barcode: barcode,
              health_score: personalizedAnalysis.health_score,
              safety_level: personalizedAnalysis.safety_level,
              result_json: personalizedAnalysis
            })
            .select()
            .single();

          let finalScanData = scanData;
          if (scanInsertErr || !scanData) {
            if (scanInsertErr && (scanInsertErr.code === "23505" || scanInsertErr.message?.includes("unique") || scanInsertErr.message?.includes("duplicate key"))) {
              const { data: existingSaved } = await supabase
                .from("scans")
                .select("*")
                .eq("user_id", user.id)
                .eq("op_id", opId)
                .maybeSingle();

              if (existingSaved) {
                finalScanData = existingSaved;
              }
            }

            if (!finalScanData) {
              console.error("Failed to save cached scan to database:", scanInsertErr);
              if (activeReservationOpId) {
                await releaseOperationOnFailure(user.id, activeReservationOpId, workerId, "Database save failure for cached scan", activeFencingToken);
                activeReservationOpId = null;
              }
              return NextResponse.json({
                error: "DATABASE_ERROR",
                message: "Failed to save scan record. Your credits have not been charged."
              }, { status: 500 });
            }
          }

          const scanId = finalScanData.id;

          // Finalize credit deduction via atomic saveOperationResultAndFinalize
          const finalization = await saveOperationResultAndFinalize(
            user.id, 
            opId, 
            workerId, 
            { analysis: personalizedAnalysis, scanId }, 
            activeFencingToken
          );
          if (finalization.success) {
            await supabase
              .from("scans")
              .update({ accounting_status: "completed" })
              .eq("id", scanId);
            activeReservationOpId = null;

            return NextResponse.json({
              success: true,
              analysis: personalizedAnalysis,
              scanId,
              source: "cache",
              remainingCredits: finalization.newBalance
            });
          } else {
            console.error("Credit finalization failed after cached scan:", finalization.error);
            return NextResponse.json({
              success: false,
              status: "accounting_pending",
              error: "ACCOUNTING_FINALIZATION_FAILED",
              opId: activeReservationOpId,
              scanId,
              message: `Scan analysis succeeded, but credit accounting could not be finalized: ${finalization.error}. Please retry.`,
              analysis: personalizedAnalysis
            }, { status: 500 });
          }
        }
      }

      // B. Open Food Facts API query
      try {
        const offRes = await axios.get(
          `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
          { timeout: 8000 }
        );

        if (offRes.data && offRes.data.status === 1 && offRes.data.product) {
          const offProd = offRes.data.product;
          const offName = offProd.product_name || offProd.product_name_en || "Food Product";
          const offBrand = offProd.brands || "Brand";
          const offIngredients = offProd.ingredients_text || offProd.ingredients_text_en || "";

          if (offIngredients.length > 5) {
            const enriched = await enrichIngredientsText(
              offIngredients,
              offName,
              offBrand,
              offProd.nutriments || {},
              [], // Generate neutral facts without user-specific preferences
              "en" // Neutral language
            );

            // Store product image front if available from official catalog
            const offImageUrl = offProd.image_url || offProd.image_front_url || offProd.image_front_small_url || null;
            if (offImageUrl) {
              enriched.image_url = offImageUrl;
            }

            // Save ONLY neutral facts to shared products_cache (never user profile data or private images)
            const adminClient = createAdminClient();
            await adminClient
              .from("products_cache")
              .upsert({
                barcode,
                product_name: offName,
                brand: offBrand,
                raw_data: {
                  product_name: enriched.product_name,
                  brand: enriched.brand,
                  panel_status: enriched.panel_status,
                  description: enriched.description,
                  ingredients: enriched.ingredients,
                  additives: enriched.additives,
                  allergens_declared: enriched.allergens_declared,
                  nutrition_facts: enriched.nutrition_facts,
                  upf_score: enriched.upf_score,
                  upf_reason: enriched.upf_reason,
                  glycemic_index_estimate: enriched.glycemic_index_estimate,
                  glycemic_reason: enriched.glycemic_reason,
                  recommendations: enriched.recommendations,
                  alternatives_detailed: enriched.alternatives_detailed
                },
                schema_version: "2.0",
                source: "openfoodfacts",
                updated_at: new Date().toISOString()
              }, { onConflict: "barcode" });

            // Apply user preferences dynamically for current user
            const personalizedAnalysis = applyPreferences(enriched, finalPrefs);

            const { data: scanData, error: offScanErr } = await supabase
              .from("scans")
              .insert({
                user_id: user.id,
                op_id: opId,
                accounting_status: "accounting_pending",
                product_name: offName,
                barcode: barcode,
                health_score: personalizedAnalysis.health_score,
                safety_level: personalizedAnalysis.safety_level,
                result_json: personalizedAnalysis
              })
              .select()
              .single();

            let finalScanData = scanData;
            if (offScanErr || !scanData) {
              if (offScanErr && (offScanErr.code === "23505" || offScanErr.message?.includes("unique") || offScanErr.message?.includes("duplicate key"))) {
                const { data: existingSaved } = await supabase
                  .from("scans")
                  .select("*")
                  .eq("user_id", user.id)
                  .eq("op_id", opId)
                  .maybeSingle();

                if (existingSaved) {
                  finalScanData = existingSaved;
                }
              }

              if (!finalScanData) {
                console.error("Failed to save OFF scan to database:", offScanErr);
                if (activeReservationOpId) {
                  await releaseOperationOnFailure(user.id, activeReservationOpId, workerId, "Database save failure for OFF scan", activeFencingToken);
                  activeReservationOpId = null;
                }
                return NextResponse.json({
                  error: "DATABASE_ERROR",
                  message: "Failed to save scan record. Your credits have not been charged."
                }, { status: 500 });
              }
            }

            const scanId = finalScanData.id;

            const finalization = await saveOperationResultAndFinalize(
              user.id, 
              opId, 
              workerId, 
              { analysis: personalizedAnalysis, scanId }, 
              activeFencingToken
            );
            if (finalization.success) {
              await supabase
                .from("scans")
                .update({ accounting_status: "completed" })
                .eq("id", scanId);
              activeReservationOpId = null;

              return NextResponse.json({
                success: true,
                analysis: personalizedAnalysis,
                scanId,
                source: "openfoodfacts",
                remainingCredits: finalization.newBalance
              });
            } else {
              console.error("Credit finalization failed after OpenFoodFacts scan:", finalization.error);
              return NextResponse.json({
                success: false,
                status: "accounting_pending",
                error: "ACCOUNTING_FINALIZATION_FAILED",
                opId: activeReservationOpId,
                scanId,
                message: `Scan analysis succeeded, but credit accounting could not be finalized: ${finalization.error}. Please retry.`,
                analysis: personalizedAnalysis
              }, { status: 500 });
            }
          }
        }
      } catch (offErr) {
        console.warn("OpenFoodFacts lookup failed:", offErr);
      }
    }

    // 5. OCR VISION SCANNING VIA GEMINI
    if (!image) {
      if (activeReservationOpId && currentUserId && activeWorkerId && typeof activeFencingToken === "number") {
        await releaseOperationOnFailure(currentUserId, activeReservationOpId, activeWorkerId, "Missing product image or barcode", activeFencingToken);
        activeReservationOpId = null;
      }
      return NextResponse.json({
        error: "IMAGE_REQUIRED",
        message: "No product image provided or product could not be found by barcode."
      }, { status: 400 });
    }

    // Extract neutral facts first without user preferences
    const baseAnalysis = await analyzeLabel(
      image,
      [], // Neutral preferences for raw extraction
      filename || "",
      productName || "",
      preferredLanguage
    );

    // Apply user preferences dynamically for user response
    const personalizedAnalysis = applyPreferences(baseAnalysis, finalPrefs);

    // Attach user image only to private user scan record
    if (image && image.length > 50) {
      personalizedAnalysis.image_url = image;
    }

    // Save scan to user's private history
    const { data: scanData, error: scanInsertErr } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        op_id: opId,
        accounting_status: "accounting_pending",
        product_name: personalizedAnalysis.product_name,
        barcode: barcode || null,
        health_score: personalizedAnalysis.health_score,
        safety_level: personalizedAnalysis.safety_level,
        result_json: personalizedAnalysis
      })
      .select()
      .single();

    let finalScanData = scanData;
    if (scanInsertErr || !scanData) {
      if (scanInsertErr && (scanInsertErr.code === "23505" || scanInsertErr.message?.includes("unique") || scanInsertErr.message?.includes("duplicate key"))) {
        const { data: existingSaved } = await supabase
          .from("scans")
          .select("*")
          .eq("user_id", user.id)
          .eq("op_id", opId)
          .maybeSingle();

        if (existingSaved) {
          finalScanData = existingSaved;
        }
      }

      if (!finalScanData) {
        console.error("Failed to save vision scan to database:", scanInsertErr);
        if (activeReservationOpId) {
          await releaseOperationOnFailure(user.id, activeReservationOpId, workerId, "Database save failure for vision scan", activeFencingToken);
          activeReservationOpId = null;
        }
        return NextResponse.json({
          error: "DATABASE_ERROR",
          message: "Failed to save scan record. Your credits have not been charged."
        }, { status: 500 });
      }
    }

    const scanId = finalScanData.id;

    // If barcode was provided and panel was extracted, cache neutral raw facts (strictly excluding user image & personalized preferences)
    if (barcode && baseAnalysis.panel_status === "extracted") {
      const adminClient = createAdminClient();
      await adminClient
        .from("products_cache")
        .upsert({
          barcode,
          product_name: baseAnalysis.product_name,
          brand: baseAnalysis.brand,
          raw_data: {
            product_name: baseAnalysis.product_name,
            brand: baseAnalysis.brand,
            panel_status: baseAnalysis.panel_status,
            description: baseAnalysis.description,
            ingredients: baseAnalysis.ingredients,
            additives: baseAnalysis.additives,
            allergens_declared: baseAnalysis.allergens_declared,
            nutrition_facts: baseAnalysis.nutrition_facts,
            upf_score: baseAnalysis.upf_score,
            upf_reason: baseAnalysis.upf_reason,
            glycemic_index_estimate: baseAnalysis.glycemic_index_estimate,
            glycemic_reason: baseAnalysis.glycemic_reason,
            recommendations: baseAnalysis.recommendations,
            alternatives_detailed: baseAnalysis.alternatives_detailed
          },
          schema_version: "2.0",
          source: "ocr",
          updated_at: new Date().toISOString()
        }, { onConflict: "barcode" });
    }

    // Finalize credit deduction atomically
    const finalization = await saveOperationResultAndFinalize(
      user.id, 
      opId, 
      workerId, 
      { analysis: personalizedAnalysis, scanId }, 
      activeFencingToken
    );
    if (finalization.success) {
      if (scanId) {
        await supabase
          .from("scans")
          .update({ accounting_status: "completed" })
          .eq("id", scanId);
      }
      activeReservationOpId = null;

      return NextResponse.json({
        success: true,
        analysis: personalizedAnalysis,
        scanId,
        source: "gemini_vision",
        remainingCredits: finalization.newBalance
      });
    } else {
      console.error("Credit finalization failed after scan analysis:", finalization.error);
      return NextResponse.json({
        success: false,
        status: "accounting_pending",
        error: "ACCOUNTING_FINALIZATION_FAILED",
        opId: activeReservationOpId,
        scanId,
        message: `Scan analysis succeeded, but credit accounting could not be finalized: ${finalization.error}. Please retry.`,
        analysis: personalizedAnalysis
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Scan analysis failed:", error);

    // Release reserved credit on failure
    if (activeReservationOpId && currentUserId && activeWorkerId && typeof activeFencingToken === "number") {
      await releaseOperationOnFailure(currentUserId, activeReservationOpId, activeWorkerId, error.message || "Scan execution error", activeFencingToken);
    }

    return NextResponse.json({
      error: "ANALYSIS_FAILED",
      message: error.message || "An unexpected error occurred during scan processing. Your credits have not been deducted."
    }, { status: 500 });
  }
}
