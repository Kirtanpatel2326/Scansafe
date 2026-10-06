import { createClient } from "@/lib/supabase-server";
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
import { ComparisonResultSchema, calculateHealthScore, cleanNumericValue, normalizeNutrientsTo100g, evaluateComparison } from "@/lib/claude";
import { evaluateDietaryCompatibility } from "@/lib/preferences";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { z } from "zod";
import crypto from "crypto";

export const maxDuration = 60; // Prevent Vercel execution timeouts

const ComparePayloadSchema = z.object({
  idempotencyKey: z.string().trim().max(128).optional(),
  imageA: z.string().min(50, "Product image A is required").optional().nullable(),
  imageB: z.string().min(50, "Product image B is required").optional().nullable(),
  productA: z.any().optional().nullable(),
  productB: z.any().optional().nullable(),
  preferences: z.array(z.string()).optional().default([])
}).refine(data => (!!data.imageA && !!data.imageB) || (!!data.productA && !!data.productB), {
  message: "Either (imageA and imageB) or (productA and productB) must be provided."
});

function getBase64Data(base64Image: string) {
  let mediaType = "image/jpeg";
  let base64Data = base64Image;

  if (base64Image.startsWith("data:")) {
    const match = base64Image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mediaType = match[1];
      base64Data = match[2];
    }
  }
  return { mediaType, base64Data };
}

export async function POST(request: Request) {
  let activeReservationOpId: string | null = null;
  let currentUserId: string | null = null;
  let activeWorkerId: string | null = null;
  let activeFencingToken: number | undefined = undefined;

  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        error: "AUTH_REQUIRED",
        message: "Please sign in to run side-by-side food comparisons."
      }, { status: 401 });
    }

    currentUserId = user.id;

    // 2. Validate request payload
    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parsed = ComparePayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({
        error: "INVALID_PAYLOAD",
        details: parsed.error.format()
      }, { status: 400 });
    }

    const { imageA, imageB, productA, productB, preferences } = parsed.data;

    // Resolve user dietary preferences from profile if not passed in body BEFORE payload hashing
    let finalPrefs = preferences || [];
    if (!preferences || preferences.length === 0) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("dietary_profile")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.dietary_profile?.allergies) {
          finalPrefs = profile.dietary_profile.allergies;
        }
      } catch {
        // dietary_profile column may not exist yet in live database
      }
    }

    // Direct Pre-Analyzed Products Comparison (0 credits, no vision calls required)
    if (productA && productB) {
      const pA = productA;
      const pB = productB;

      const scoreResultA = calculateHealthScore(pA);
      const scoreResultB = calculateHealthScore(pB);

      const normNutA = normalizeNutrientsTo100g(pA.nutrition_facts);
      const normNutB = normalizeNutrientsTo100g(pB.nutrition_facts);
      const basisA = normNutA.basis === "per_100ml" ? "per 100ml" : "per 100g";
      const basisB = normNutB.basis === "per_100ml" ? "per 100ml" : "per 100g";
      const nameA = pA.name || pA.product_name || "Product A";
      const nameB = pB.name || pB.product_name || "Product B";
      const basisLabel = basisA === basisB ? basisA : `${nameA} (${basisA}) vs ${nameB} (${basisB})`;

      const evalResult = evaluateComparison(pA, pB);

      const comparisonData = {
        winner: evalResult.winner,
        winner_reason: evalResult.winner_reason,
        verdict_english: evalResult.winner_reason,
        concrete_differences: evalResult.concrete_differences || [],
        is_basis_compatible: evalResult.is_basis_compatible ?? true,
        product_a: {
          ...pA,
          name: nameA,
          health_score: scoreResultA.score,
          safety_level: scoreResultA.safetyLevel,
          highlights: pA.highlights || [],
          dietary_compatibility: evaluateDietaryCompatibility(pA.ingredients || [], pA.allergens_declared || [], finalPrefs)
        },
        product_b: {
          ...pB,
          name: nameB,
          health_score: scoreResultB.score,
          safety_level: scoreResultB.safetyLevel,
          highlights: pB.highlights || [],
          dietary_compatibility: evaluateDietaryCompatibility(pB.ingredients || [], pB.allergens_declared || [], finalPrefs)
        },
        comparison_table: {
          calories: {
            a: normNutA.calories_100g != null ? `${normNutA.calories_100g} kcal` : null,
            b: normNutB.calories_100g != null ? `${normNutB.calories_100g} kcal` : null
          },
          sugar: {
            a: normNutA.sugar_100g != null ? `${normNutA.sugar_100g}g` : null,
            b: normNutB.sugar_100g != null ? `${normNutB.sugar_100g}g` : null
          },
          sodium: {
            a: normNutA.sodium_100g != null ? `${normNutA.sodium_100g}mg` : null,
            b: normNutB.sodium_100g != null ? `${normNutB.sodium_100g}mg` : null
          },
          protein: {
            a: normNutA.protein_100g != null ? `${normNutA.protein_100g}g` : null,
            b: normNutB.protein_100g != null ? `${normNutB.protein_100g}g` : null
          },
          fat: {
            a: normNutA.fat_100g != null ? `${normNutA.fat_100g}g` : null,
            b: normNutB.fat_100g != null ? `${normNutB.fat_100g}g` : null
          },
          fiber: {
            a: normNutA.fiber_100g != null ? `${normNutA.fiber_100g}g` : null,
            b: normNutB.fiber_100g != null ? `${normNutB.fiber_100g}g` : null
          },
          additives: {
            a: `${pA.additives?.length || 0} additives`,
            b: `${pB.additives?.length || 0} additives`
          },
          basis: basisLabel
        }
      };

      return NextResponse.json({
        success: true,
        comparison: comparisonData,
        creditsCost: 0,
        source: "saved_catalog"
      });
    }

    const headerIdempotencyKey = request.headers.get("x-idempotency-key")?.trim() || "";
    const bodyIdempotencyKey = parsed.data.idempotencyKey?.trim() || "";
    if (headerIdempotencyKey && bodyIdempotencyKey && headerIdempotencyKey !== bodyIdempotencyKey) {
      return NextResponse.json({
        error: "IDEMPOTENCY_KEY_MISMATCH",
        message: "Conflicting idempotency keys provided in header and body."
      }, { status: 400 });
    }
    let idempotencyKey = bodyIdempotencyKey || headerIdempotencyKey;

    const cookieStore = await cookies();
    const preferredLanguage = cookieStore.get("preferred_lang")?.value || "en";

    const imgA = imageA || "";
    const imgB = imageB || "";
    const normalizedPayload = {
      imageAHash: crypto.createHash("sha256").update(imgA).digest("hex"),
      imageBHash: crypto.createHash("sha256").update(imgB).digest("hex"),
      preferences: Array.isArray(finalPrefs) ? [...finalPrefs].sort() : [],
      preferredLanguage
    };

    if (!idempotencyKey) {
      const hash = crypto.createHash("sha256").update(`${user.id}:${JSON.stringify(normalizedPayload)}`).digest("hex").slice(0, 24);
      idempotencyKey = `det_${hash}`;
    }

    // 3. IDEMPOTENCY CHECK & ATOMIC CREDIT RESERVATION (2 credits for compare)
    const opId = `op_comp_${user.id.slice(0, 8)}_${idempotencyKey}`;
    const payloadHash = crypto.createHash("sha256").update(JSON.stringify(normalizedPayload)).digest("hex");

    const workerId = `w_${process.pid || 1}_${crypto.randomBytes(4).toString("hex")}`;
    activeWorkerId = workerId;

    // Atomically claim operation
    const claim = await claimOperation(
      user.id,
      opId,
      "compare",
      CREDIT_COSTS.COMPARE,
      payloadHash,
      workerId,
      120
    );

    if (!claim.success) {
      if (claim.error === "IDEMPOTENCY_CONFLICT") {
        return NextResponse.json({
          error: "IDEMPOTENCY_CONFLICT",
          message: "This idempotency key was previously used with different comparison inputs."
        }, { status: 409 });
      }
      if (claim.error === "OPERATION_IN_PROGRESS") {
        return NextResponse.json({
          error: "OPERATION_IN_PROGRESS",
          message: "This comparison is actively being processed by another worker. Please wait."
        }, { status: 409 });
      }
      if (claim.error === "INSUFFICIENT_CREDITS") {
        return NextResponse.json({
          error: "INSUFFICIENT_CREDITS",
          message: "You need at least 2 scan credits to compare products. Please refill your scan pack.",
          availableCredits: claim.availableCredits ?? 0
        }, { status: 403 });
      }
      return NextResponse.json({
        error: claim.error || "OPERATION_CLAIM_FAILED",
        message: claim.message || "Failed to claim comparison operation."
      }, { status: 500 });
    }

    activeFencingToken = claim.fencingToken;

    if (claim.status === "completed" || claim.alreadyCompleted) {
      const savedComparison = claim.result?.comparison || claim.result;
      const savedScanId = claim.result?.scanId || opId;
      return NextResponse.json({
        success: true,
        comparison: savedComparison,
        scanId: savedScanId,
        already_completed: true
      });
    }

    if (claim.status === "accounting_pending" || claim.accountingPending) {
      const recovery = await recoverOperationAccounting(user.id, opId);
      const savedComparison = claim.result?.comparison || claim.result;
      const savedScanId = claim.result?.scanId || opId;
      if (recovery.success) {
        return NextResponse.json({
          success: true,
          comparison: savedComparison,
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
          message: `Comparison analysis is saved, but credit finalization failed: ${recovery.error}. Please retry.`,
          comparison: savedComparison
        }, { status: 500 });
      }
    }

    activeReservationOpId = opId;

    const { mediaType: typeA, base64Data: dataA } = getBase64Data(imgA);
    const { mediaType: typeB, base64Data: dataB } = getBase64Data(imgB);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("AI service is not configured on server.");
    }

    const langPrompt = preferredLanguage && preferredLanguage !== "en"
      ? "\nCRITICAL LANGUAGE REQUIREMENT: All user-facing explanations and rationale text fields (winner_reason, highlights, verdict_english) MUST be written in the language: " + preferredLanguage + "."
      : "";

    const systemPrompt = "You are ScanSafe COMPARE, an objective food toxicology and nutrition auditor.\n" +
"Compare the two product images (Image 1 = Product A, Image 2 = Product B) strictly based on visible label evidence against the user preferences: [" + preferences.join(", ") + "]." + langPrompt + "\n\n" +
"EVIDENCE INTEGRITY RULES:\n" +
"1. Extract full structured facts for Product A and Product B strictly from what is visible in the photos.\n" +
"2. If an image is unreadable or blurry, set panel_status to 'unreadable' or 'missing'.\n" +
"3. Extract discrete ingredients, additives, declared allergens, and nutrition facts (calories, sugar, sodium, protein, fat, fiber).\n" +
"4. Select winner as 'A', 'B', 'tie', or 'undetermined' with clear factual justification.\n\n" +
"Return a single JSON object matching:\n" +
JSON.stringify({
  winner: "A",
  winner_reason: "Clear factual explanation why product A is nutritionally superior or less processed than product B.",
  product_a: {
    product_name: "Product A Name",
    brand: "Brand A",
    panel_status: "extracted",
    description: "Overview of product A",
    ingredients: [{ name: "Ingredient A", status: "safe", reason: "" }],
    additives: [],
    allergens_declared: ["Gluten"],
    nutrition_facts: {
      panel_status: "extracted",
      basis: "per_100g",
      per_100g: { calories: 150, fat_g: 3, saturated_fat_g: 0.5, trans_fat_g: 0, cholesterol_mg: 0, sodium_mg: 40, carbs_g: 25, fiber_g: 4, sugar_g: 2, protein_g: 5 }
    },
    upf_score: 2,
    upf_reason: "Minimally processed",
    glycemic_index_estimate: "low",
    highlights: ["Higher dietary fiber", "Zero added sugars"]
  },
  product_b: {
    product_name: "Product B Name",
    brand: "Brand B",
    panel_status: "extracted",
    description: "Overview of product B",
    ingredients: [{ name: "Ingredient B", status: "caution", reason: "Refined sugar" }],
    additives: [{ name: "Artificial flavor", code: null, risk: "low", description: "Synthetic flavoring" }],
    allergens_declared: ["Milk"],
    nutrition_facts: {
      panel_status: "extracted",
      basis: "per_100g",
      per_100g: { calories: 220, fat_g: 8, saturated_fat_g: 4, trans_fat_g: 0, cholesterol_mg: 10, sodium_mg: 280, carbs_g: 35, fiber_g: 1, sugar_g: 14, protein_g: 2 }
    },
    upf_score: 4,
    upf_reason: "Ultra-processed confectionery",
    glycemic_index_estimate: "high",
    highlights: ["High added sugars (14g/100g)", "Contains synthetic additives"]
  },
  verdict_english: "Comprehensive plain-language comparison summary."
}, null, 2) + "\n\nReturn ONLY raw JSON string.";

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
      {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            parts: [
              { inlineData: { mimeType: typeA, data: dataA } },
              { inlineData: { mimeType: typeB, data: dataB } },
              { text: "Compare these two products side-by-side against the profile." }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      },
      { headers: { "content-type": "application/json" } }
    );

    const candidate = response?.data?.candidates?.[0];
    const responseText = candidate?.content?.parts?.[0]?.text?.trim();
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    let cleanedText = responseText;
    const jsonBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonBlockMatch) {
      cleanedText = jsonBlockMatch[1];
    }

    let rawComparison: any;
    try {
      rawComparison = JSON.parse(cleanedText.trim());
    } catch {
      throw new Error("Failed to parse comparison response as JSON");
    }

    // Ensure product_a and product_b have name fallback if omitted
    if (rawComparison.product_a && !rawComparison.product_a.name) {
      rawComparison.product_a.name = rawComparison.product_a.product_name || "Product A";
    }
    if (rawComparison.product_b && !rawComparison.product_b.name) {
      rawComparison.product_b.name = rawComparison.product_b.product_name || "Product B";
    }

    // Runtime Schema Validation (strictly fail-closed without raw bypass)
    const validated = ComparisonResultSchema.safeParse(rawComparison);
    if (!validated.success) {
      throw new Error(`Comparison AI returned invalid schema: ${validated.error.message}`);
    }
    const comparisonData = validated.data;

    // Calculate objective scores using canonical calculateHealthScore implementation on full structured facts
    const scoreResultA = calculateHealthScore(comparisonData.product_a);
    const scoreResultB = calculateHealthScore(comparisonData.product_b);

    // Assign calculated scores and safety levels
    comparisonData.product_a.health_score = scoreResultA.score;
    comparisonData.product_a.safety_level = scoreResultA.safetyLevel as any;
    comparisonData.product_b.health_score = scoreResultB.score;
    comparisonData.product_b.safety_level = scoreResultB.safetyLevel as any;

    // Evaluate dietary compatibility for both products against requested preferences
    comparisonData.product_a.dietary_compatibility = evaluateDietaryCompatibility(
      comparisonData.product_a.ingredients || [],
      comparisonData.product_a.allergens_declared || [],
      preferences
    );
    comparisonData.product_b.dietary_compatibility = evaluateDietaryCompatibility(
      comparisonData.product_b.ingredients || [],
      comparisonData.product_b.allergens_declared || [],
      preferences
    );

    // Format authoritative comparison table from the normalized product facts
    const normNutA = normalizeNutrientsTo100g(comparisonData.product_a.nutrition_facts);
    const normNutB = normalizeNutrientsTo100g(comparisonData.product_b.nutrition_facts);
    const basisA = normNutA.basis === "per_100ml" ? "per 100ml" : "per 100g";
    const basisB = normNutB.basis === "per_100ml" ? "per 100ml" : "per 100g";
    const nameA = comparisonData.product_a.name || comparisonData.product_a.product_name || "Product A";
    const nameB = comparisonData.product_b.name || comparisonData.product_b.product_name || "Product B";
    const basisLabel = basisA === basisB ? basisA : `${nameA} (${basisA}) vs ${nameB} (${basisB})`;

    comparisonData.comparison_table = {
      calories: {
        a: normNutA.calories_100g != null ? `${normNutA.calories_100g} kcal` : null,
        b: normNutB.calories_100g != null ? `${normNutB.calories_100g} kcal` : null
      },
      sugar: {
        a: normNutA.sugar_100g != null ? `${normNutA.sugar_100g}g` : null,
        b: normNutB.sugar_100g != null ? `${normNutB.sugar_100g}g` : null
      },
      sodium: {
        a: normNutA.sodium_100g != null ? `${normNutA.sodium_100g}mg` : null,
        b: normNutB.sodium_100g != null ? `${normNutB.sodium_100g}mg` : null
      },
      protein: {
        a: normNutA.protein_100g != null ? `${normNutA.protein_100g}g` : null,
        b: normNutB.protein_100g != null ? `${normNutB.protein_100g}g` : null
      },
      fat: {
        a: normNutA.fat_100g != null ? `${normNutA.fat_100g}g` : null,
        b: normNutB.fat_100g != null ? `${normNutB.fat_100g}g` : null
      },
      fiber: {
        a: normNutA.fiber_100g != null ? `${normNutA.fiber_100g}g` : null,
        b: normNutB.fiber_100g != null ? `${normNutB.fiber_100g}g` : null
      },
      additives: {
        a: `${comparisonData.product_a.additives?.length || 0} additives`,
        b: `${comparisonData.product_b.additives?.length || 0} additives`
      },
      basis: basisLabel
    };

    // Determine deterministic winner based on calculated health score
    // Rule: Return 'undetermined' when either product lacks evidence required for a fair comparison.
    const evalResult = evaluateComparison(comparisonData.product_a, comparisonData.product_b);
    comparisonData.winner = evalResult.winner;
    comparisonData.winner_reason = evalResult.winner_reason;
    comparisonData.verdict_english = evalResult.winner_reason;
    comparisonData.concrete_differences = evalResult.concrete_differences || [];
    comparisonData.is_basis_compatible = evalResult.is_basis_compatible ?? true;

    // Determine representative health score and safety level
    let representativeScore: number | null = null;
    if (comparisonData.winner === "A" && comparisonData.product_a.health_score != null) {
      representativeScore = comparisonData.product_a.health_score;
    } else if (comparisonData.winner === "B" && comparisonData.product_b.health_score != null) {
      representativeScore = comparisonData.product_b.health_score;
    } else if (comparisonData.product_a.health_score != null) {
      representativeScore = comparisonData.product_a.health_score;
    } else if (comparisonData.product_b.health_score != null) {
      representativeScore = comparisonData.product_b.health_score;
    }

    let representativeSafetyLevel = "moderate";
    if (comparisonData.winner === "A") {
      representativeSafetyLevel = comparisonData.product_a.safety_level || "safe";
    } else if (comparisonData.winner === "B") {
      representativeSafetyLevel = comparisonData.product_b.safety_level || "safe";
    } else if (comparisonData.winner === "undetermined") {
      representativeSafetyLevel = "insufficient_evidence";
    }

    // Save comparison scan to history database
    let finalScanData: any = null;

    const { data: scanDataWithOp, error: dbErrWithOp } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        op_id: opId,
        accounting_status: "accounting_pending",
        product_name: `${nameA} vs ${nameB}`,
        barcode: `COMPARE:${comparisonData.winner}`,
        health_score: representativeScore,
        safety_level: representativeSafetyLevel,
        result_json: comparisonData
      })
      .select()
      .maybeSingle();

    if (scanDataWithOp) {
      finalScanData = scanDataWithOp;
    } else {
      const isMissingColumn = dbErrWithOp?.code === "PGRST204" || 
        dbErrWithOp?.code === "42703" ||
        dbErrWithOp?.message?.includes("column");

      if (isMissingColumn) {
        const { data: baseScanData, error: baseDbErr } = await supabase
          .from("scans")
          .insert({
            user_id: user.id,
            product_name: `${nameA} vs ${nameB}`,
            barcode: `COMPARE:${comparisonData.winner}`,
            health_score: representativeScore,
            safety_level: representativeSafetyLevel,
            result_json: comparisonData
          })
          .select()
          .maybeSingle();

        if (baseScanData) {
          finalScanData = baseScanData;
        } else {
          console.error("Base comparison scan insert error:", baseDbErr);
        }
      } else if (dbErrWithOp && (dbErrWithOp.code === "23505" || dbErrWithOp.message?.includes("unique") || dbErrWithOp.message?.includes("duplicate key"))) {
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
    }

    if (!finalScanData) {
      console.error("Failed to save comparison to history database:", dbErrWithOp);
      if (activeReservationOpId) {
        await releaseOperationOnFailure(user.id, activeReservationOpId, workerId, "Database save failure for comparison", activeFencingToken);
        activeReservationOpId = null;
      }
      return NextResponse.json({
        error: "DATABASE_ERROR",
        message: "Failed to save comparison result. Your scan credits have been preserved."
      }, { status: 500 });
    }

    const scanId = finalScanData.id;

    // Finalize 2 credits deduction atomically
    const finalization = await saveOperationResultAndFinalize(
      user.id, 
      opId, 
      workerId, 
      { comparison: comparisonData, scanId }, 
      activeFencingToken
    );
    if (finalization.success) {
      if (scanId) {
        try {
          await supabase
            .from("scans")
            .update({ accounting_status: "completed" })
            .eq("id", scanId);
        } catch {
          // accounting_status column may not exist yet
        }
      }
      activeReservationOpId = null;

      return NextResponse.json({
        success: true,
        comparison: comparisonData,
        scanId,
        remainingCredits: finalization.newBalance
      });
    } else {
      console.error("Credit finalization failed in comparison:", finalization.error);
      return NextResponse.json({
        success: false,
        status: "accounting_pending",
        error: "ACCOUNTING_FINALIZATION_FAILED",
        opId: activeReservationOpId,
        scanId,
        message: `Comparison succeeded, but credit accounting could not be finalized: ${finalization.error}. Please retry.`,
        comparison: comparisonData
      }, { status: 500 });
    }

  } catch (err: any) {
    console.error("Comparison API error:", err);
    if (activeReservationOpId && currentUserId && activeWorkerId && typeof activeFencingToken === "number") {
      await releaseOperationOnFailure(currentUserId, activeReservationOpId, activeWorkerId, err.message || "Comparison processing error", activeFencingToken);
    }
    return NextResponse.json({
      error: "COMPARISON_FAILED",
      message: err.message || "An error occurred during comparison analysis. Your credits have not been deducted."
    }, { status: 500 });
  }
}
