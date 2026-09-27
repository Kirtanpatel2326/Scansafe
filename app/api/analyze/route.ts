import { createClient, createAdminClient } from "@/lib/supabase-server";
import { analyzeLabel, enrichIngredientsText, applyPreferences, SAMPLE_PRODUCTS, IngredientAnalysis } from "@/lib/claude";
import { reserveCredits, finalizeReservation, releaseReservation } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/plans";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { z } from "zod";

export const maxDuration = 60; // Prevent Vercel execution timeouts

const AnalyzePayloadSchema = z.object({
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
  const maxRequests = 15;

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
    const { data: { user } } = await supabase.auth.getUser();
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

    // 3. ATOMIC CREDIT RESERVATION (1 Credit per single scan)
    const opId = `op_scan_${user.id.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const reservation = await reserveCredits(
      user.id,
      CREDIT_COSTS.SCAN,
      "scan",
      opId,
      `Food label scan: ${productName || filename || barcode || "Image Scan"}`
    );

    if (!reservation.success) {
      return NextResponse.json({
        error: "INSUFFICIENT_CREDITS",
        message: reservation.error || "You do not have enough scan credits. Please purchase a scan pack to continue.",
        availableCredits: reservation.availableCreditsAfter ?? 0
      }, { status: 403 });
    }

    activeReservationOpId = opId;

    // Fetch user dietary preferences from profile if not passed in body
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

    const cookieStore = await cookies();
    const preferredLanguage = cookieStore.get("preferred_lang")?.value || "en";

    // 4. BARCODE LOOKUP (CACHE OR OPEN FOOD FACTS)
    if (barcode) {
      // A. Local cache lookup with schema version check
      const { data: cachedProduct } = await supabase
        .from("products_cache")
        .select("*")
        .eq("barcode", barcode)
        .eq("schema_version", "2.0")
        .maybeSingle();

      if (cachedProduct && cachedProduct.raw_data) {
        // Cache contains neutral raw facts; apply preferences & localization dynamically
        const analysis = applyPreferences(cachedProduct.raw_data, finalPrefs);

        let scanId = "";
        const { data: scanData } = await supabase
          .from("scans")
          .insert({
            user_id: user.id,
            product_name: analysis.product_name,
            barcode: barcode,
            health_score: analysis.health_score,
            safety_level: analysis.safety_level,
            result_json: analysis
          })
          .select()
          .single();

        scanId = scanData?.id || "";

        // Finalize credit deduction on successful scan
        if (activeReservationOpId) {
          await finalizeReservation(user.id, activeReservationOpId);
          activeReservationOpId = null;
        }

        return NextResponse.json({
          success: true,
          analysis,
          scanId,
          source: "cache"
        });
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
              finalPrefs,
              preferredLanguage
            );

            // Store product image
            const offImageUrl = offProd.image_url || offProd.image_front_url || offProd.image_front_small_url || null;
            if (offImageUrl) {
              enriched.image_url = offImageUrl;
            }

            // Save neutral facts to shared products_cache
            const adminClient = createAdminClient();
            await adminClient
              .from("products_cache")
              .upsert({
                barcode,
                product_name: offName,
                brand: offBrand,
                raw_data: enriched,
                schema_version: "2.0",
                source: "openfoodfacts",
                updated_at: new Date().toISOString()
              }, { onConflict: "barcode" });

            const { data: scanData } = await supabase
              .from("scans")
              .insert({
                user_id: user.id,
                product_name: offName,
                barcode: barcode,
                health_score: enriched.health_score,
                safety_level: enriched.safety_level,
                result_json: enriched
              })
              .select()
              .single();

            if (activeReservationOpId) {
              await finalizeReservation(user.id, activeReservationOpId);
              activeReservationOpId = null;
            }

            return NextResponse.json({
              success: true,
              analysis: enriched,
              scanId: scanData?.id || "",
              source: "openfoodfacts"
            });
          }
        }
      } catch (offErr) {
        console.warn("OpenFoodFacts lookup failed:", offErr);
      }
    }

    // 5. OCR VISION SCANNING VIA GEMINI
    if (!image) {
      if (activeReservationOpId && currentUserId) {
        await releaseReservation(currentUserId, activeReservationOpId, "Missing product image or barcode");
        activeReservationOpId = null;
      }
      return NextResponse.json({
        error: "IMAGE_REQUIRED",
        message: "No product image provided or product could not be found by barcode."
      }, { status: 400 });
    }

    const analysis = await analyzeLabel(
      image,
      finalPrefs,
      filename || "",
      productName || "",
      preferredLanguage
    );

    if (image && image.length > 50) {
      analysis.image_url = image;
    }

    // Save scan to history
    let scanId = "";
    const { data: scanData, error: scanInsertErr } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        product_name: analysis.product_name,
        barcode: barcode || null,
        health_score: analysis.health_score,
        safety_level: analysis.safety_level,
        result_json: analysis
      })
      .select()
      .single();

    if (!scanInsertErr && scanData) {
      scanId = scanData.id;
    }

    // If barcode was provided, cache the neutral facts
    if (barcode && analysis.panel_status === "extracted") {
      const adminClient = createAdminClient();
      await adminClient
        .from("products_cache")
        .upsert({
          barcode,
          product_name: analysis.product_name,
          brand: analysis.brand,
          raw_data: analysis,
          schema_version: "2.0",
          source: "ocr",
          updated_at: new Date().toISOString()
        }, { onConflict: "barcode" });
    }

    // Finalize credit deduction
    if (activeReservationOpId) {
      await finalizeReservation(user.id, activeReservationOpId);
      activeReservationOpId = null;
    }

    return NextResponse.json({
      success: true,
      analysis,
      scanId,
      source: "gemini_vision"
    });

  } catch (error: any) {
    console.error("Scan analysis failed:", error);

    // Release reserved credit on failure
    if (activeReservationOpId && currentUserId) {
      await releaseReservation(currentUserId, activeReservationOpId, error.message || "Scan execution error");
    }

    return NextResponse.json({
      error: "ANALYSIS_FAILED",
      message: error.message || "An unexpected error occurred during scan processing. Your credits have not been deducted."
    }, { status: 500 });
  }
}
