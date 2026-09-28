import { createClient } from "@/lib/supabase-server";
import { reserveCredits, finalizeReservation, releaseReservation } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/plans";
import { ComparisonResultSchema, calculateHealthScore, cleanNumericValue } from "@/lib/claude";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { z } from "zod";
import crypto from "crypto";

export const maxDuration = 60; // Prevent Vercel execution timeouts

const ComparePayloadSchema = z.object({
  idempotencyKey: z.string().trim().max(128).optional(),
  imageA: z.string().min(50, "Product image A is required"),
  imageB: z.string().min(50, "Product image B is required"),
  preferences: z.array(z.string()).optional().default([])
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

    const { imageA, imageB, preferences } = parsed.data;
    const headerIdempotencyKey = request.headers.get("x-idempotency-key")?.trim() || "";
    let idempotencyKey = parsed.data.idempotencyKey || headerIdempotencyKey;
    if (!idempotencyKey) {
      const normalizedPayload = {
        imageAHash: crypto.createHash("sha256").update(imageA).digest("hex"),
        imageBHash: crypto.createHash("sha256").update(imageB).digest("hex"),
        preferences: Array.isArray(preferences) ? [...preferences].sort() : []
      };
      const hash = crypto.createHash("sha256").update(`${user.id}:${JSON.stringify(normalizedPayload)}`).digest("hex").slice(0, 24);
      idempotencyKey = `det_${hash}`;
    }

    // 3. IDEMPOTENCY CHECK & ATOMIC CREDIT RESERVATION (2 credits for compare)
    const opId = `op_comp_${user.id.slice(0, 8)}_${idempotencyKey}`;

    // Check if comparison with this op_id already exists in history
    const { data: existingScan } = await supabase
      .from("scans")
      .select("*")
      .eq("user_id", user.id)
      .eq("op_id", opId)
      .maybeSingle();

    if (existingScan) {
      if (existingScan.accounting_status === "completed") {
        return NextResponse.json({
          success: true,
          comparison: existingScan.result_json,
          scanId: existingScan.id,
          already_completed: true
        });
      } else if (existingScan.accounting_status === "accounting_pending") {
        const finalization = await finalizeReservation(user.id, opId);
        if (finalization.success) {
          await supabase
            .from("scans")
            .update({ accounting_status: "completed" })
            .eq("id", existingScan.id);

          return NextResponse.json({
            success: true,
            comparison: existingScan.result_json,
            scanId: existingScan.id,
            remainingCredits: finalization.newBalance,
            recovered: true
          });
        } else {
          return NextResponse.json({
            success: false,
            status: "accounting_pending",
            error: "ACCOUNTING_FINALIZATION_FAILED",
            opId,
            scanId: existingScan.id,
            message: `Comparison analysis is saved, but credit finalization failed: ${finalization.error}. Please retry.`,
            comparison: existingScan.result_json
          }, { status: 500 });
        }
      }
    }

    const reservation = await reserveCredits(
      user.id,
      CREDIT_COSTS.COMPARE,
      "compare",
      opId,
      "Side-by-side product comparison"
    );

    if (!reservation.success) {
      return NextResponse.json({
        error: "INSUFFICIENT_CREDITS",
        message: reservation.error || "You need at least 2 scan credits to compare products. Please refill your scan pack.",
        availableCredits: reservation.availableCreditsAfter ?? 0
      }, { status: 403 });
    }

    activeReservationOpId = opId;

    const { mediaType: typeA, base64Data: dataA } = getBase64Data(imageA);
    const { mediaType: typeB, base64Data: dataB } = getBase64Data(imageB);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("AI service is not configured on server.");
    }

    const cookieStore = await cookies();
    const preferredLanguage = cookieStore.get("preferred_lang")?.value || "en";
    const langPrompt = preferredLanguage && preferredLanguage !== "en"
      ? "\nCRITICAL LANGUAGE REQUIREMENT: All user-facing explanations and rationale text fields (winner_reason, highlights, verdict_english) MUST be written in the language: " + preferredLanguage + "."
      : "";

    const systemPrompt = "You are ScanSafe COMPARE, an objective food toxicology and nutrition auditor.\n" +
"Compare the two product images (Image 1 = Product A, Image 2 = Product B) strictly based on visible label evidence against the user preferences: [" + preferences.join(", ") + "]." + langPrompt + "\n\n" +
"EVIDENCE INTEGRITY RULES:\n" +
"1. Extract nutrition and ingredient facts strictly from what is visible in the photos.\n" +
"2. If an image is unreadable or blurry, set safety_level to 'insufficient_evidence' and health_score to null.\n" +
"3. Compare NOVA UPF degree, sugar, saturated fat, sodium, fiber, protein, and presence of high-risk synthetic additives on the same basis (per 100g).\n" +
"4. Select winner as 'A', 'B', 'tie', or 'undetermined' with clear factual justification.\n\n" +
"Return a single JSON object matching:\n" +
JSON.stringify({
  winner: "A",
  winner_reason: "Clear factual explanation why product A is nutritionally superior or less processed than product B.",
  product_a: {
    name: "Product A Name",
    brand: "Brand A",
    health_score: 75,
    safety_level: "safe",
    highlights: ["Higher dietary fiber", "Zero added sugars"]
  },
  product_b: {
    name: "Product B Name",
    brand: "Brand B",
    health_score: 42,
    safety_level: "moderate",
    highlights: ["High added sugars (24g/100g)", "Contains artificial flavor"]
  },
  comparison_table: {
    calories: { a: "150 kcal", b: "220 kcal" },
    sugar: { a: "2g", b: "14g" },
    sodium: { a: "40mg", b: "280mg" },
    protein: { a: "5g", b: "2g" },
    fat: { a: "3g", b: "8g" },
    fiber: { a: "4g", b: "1g" },
    additives: { a: "0 additives", b: "3 additives" },
    basis: "per 100g"
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

    // Runtime Schema Validation (strictly fail-closed without raw bypass)
    const validated = ComparisonResultSchema.safeParse(rawComparison);
    if (!validated.success) {
      throw new Error(`Comparison AI returned invalid schema: ${validated.error.message}`);
    }
    const comparisonData = validated.data;

    // Calculate objective scores using the single canonical calculateHealthScore implementation
    const factsA = {
      product_name: comparisonData.product_a.name,
      brand: comparisonData.product_a.brand,
      panel_status: comparisonData.product_a.health_score === null ? ("unreadable" as const) : ("extracted" as const),
      nutrition_facts: {
        panel_status: "extracted" as const,
        per_100g: {
          calories: cleanNumericValue(comparisonData.comparison_table?.calories?.a),
          sugar_g: cleanNumericValue(comparisonData.comparison_table?.sugar?.a),
          sodium_mg: cleanNumericValue(comparisonData.comparison_table?.sodium?.a),
          protein_g: cleanNumericValue(comparisonData.comparison_table?.protein?.a),
          fat_g: cleanNumericValue(comparisonData.comparison_table?.fat?.a),
          fiber_g: cleanNumericValue(comparisonData.comparison_table?.fiber?.a),
        }
      }
    };

    const factsB = {
      product_name: comparisonData.product_b.name,
      brand: comparisonData.product_b.brand,
      panel_status: comparisonData.product_b.health_score === null ? ("unreadable" as const) : ("extracted" as const),
      nutrition_facts: {
        panel_status: "extracted" as const,
        per_100g: {
          calories: cleanNumericValue(comparisonData.comparison_table?.calories?.b),
          sugar_g: cleanNumericValue(comparisonData.comparison_table?.sugar?.b),
          sodium_mg: cleanNumericValue(comparisonData.comparison_table?.sodium?.b),
          protein_g: cleanNumericValue(comparisonData.comparison_table?.protein?.b),
          fat_g: cleanNumericValue(comparisonData.comparison_table?.fat?.b),
          fiber_g: cleanNumericValue(comparisonData.comparison_table?.fiber?.b),
        }
      }
    };

    const scoreResultA = calculateHealthScore(factsA);
    const scoreResultB = calculateHealthScore(factsB);

    if (scoreResultA.score !== null) {
      comparisonData.product_a.health_score = scoreResultA.score;
      comparisonData.product_a.safety_level = scoreResultA.safetyLevel as any;
    }
    if (scoreResultB.score !== null) {
      comparisonData.product_b.health_score = scoreResultB.score;
      comparisonData.product_b.safety_level = scoreResultB.safetyLevel as any;
    }

    // Determine deterministic winner based on calculated health score
    if (scoreResultA.score === null && scoreResultB.score === null) {
      comparisonData.winner = "undetermined";
      comparisonData.winner_reason = "Both products lack sufficient nutritional evidence on their packaging to determine a winner.";
    } else if (scoreResultA.score === null) {
      comparisonData.winner = "B";
      comparisonData.winner_reason = `${comparisonData.product_b.name} has verifiable nutrition facts (Score: ${scoreResultB.score}/100) while ${comparisonData.product_a.name} lacks sufficient label evidence.`;
    } else if (scoreResultB.score === null) {
      comparisonData.winner = "A";
      comparisonData.winner_reason = `${comparisonData.product_a.name} has verifiable nutrition facts (Score: ${scoreResultA.score}/100) while ${comparisonData.product_b.name} lacks sufficient label evidence.`;
    } else if (scoreResultA.score > scoreResultB.score) {
      comparisonData.winner = "A";
      comparisonData.winner_reason = `${comparisonData.product_a.name} achieves a higher health score (${scoreResultA.score} vs ${scoreResultB.score}) based on better macronutrient balance.`;
    } else if (scoreResultB.score > scoreResultA.score) {
      comparisonData.winner = "B";
      comparisonData.winner_reason = `${comparisonData.product_b.name} achieves a higher health score (${scoreResultB.score} vs ${scoreResultA.score}) based on better macronutrient balance.`;
    } else {
      comparisonData.winner = "tie";
      comparisonData.winner_reason = `Both products receive an identical nutritional health score of ${scoreResultA.score}/100.`;
    }

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
    let scanId = "";
    const { data: scanData, error: dbErr } = await supabase
      .from("scans")
      .insert({
        user_id: user.id,
        op_id: opId,
        accounting_status: "accounting_pending",
        product_name: `${comparisonData.product_a?.name || "Product A"} vs ${comparisonData.product_b?.name || "Product B"}`,
        barcode: `COMPARE:${comparisonData.winner}`,
        health_score: representativeScore,
        safety_level: representativeSafetyLevel,
        result_json: comparisonData
      })
      .select()
      .single();

    if (dbErr) {
      console.error("Failed to save comparison to history database:", dbErr);
    } else if (scanData) {
      scanId = scanData.id;
    }

    // Finalize 2 credits deduction
    if (activeReservationOpId) {
      const finalization = await finalizeReservation(user.id, activeReservationOpId);
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
    }

    return NextResponse.json({
      success: true,
      comparison: comparisonData,
      scanId
    });

  } catch (err: any) {
    console.error("Comparison API error:", err);
    if (activeReservationOpId && currentUserId) {
      await releaseReservation(currentUserId, activeReservationOpId, err.message || "Comparison processing error");
    }
    return NextResponse.json({
      error: "COMPARISON_FAILED",
      message: err.message || "An error occurred during comparison analysis. Your credits have not been deducted."
    }, { status: 500 });
  }
}
