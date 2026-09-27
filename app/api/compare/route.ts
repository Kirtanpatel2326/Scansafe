import { createClient } from "@/lib/supabase-server";
import { reserveCredits, finalizeReservation, releaseReservation } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/plans";
import { ComparisonResultSchema } from "@/lib/claude";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { z } from "zod";

export const maxDuration = 60;

const ComparePayloadSchema = z.object({
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

    // 1. Verify session
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

    // 3. Atomic Credit Reservation (2 credits for compare)
    const opId = `op_comp_${user.id.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
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

    // Runtime Schema Validation
    const validated = ComparisonResultSchema.safeParse(rawComparison);
    const comparisonData = validated.success ? validated.data : rawComparison;

    // Save comparison scan to history database
    let scanId = "";
    try {
      const { data: scanData } = await supabase
        .from("scans")
        .insert({
          user_id: user.id,
          product_name: (comparisonData.product_a?.name || "Product A") + " vs " + (comparisonData.product_b?.name || "Product B"),
          barcode: "COMPARE:" + comparisonData.winner,
          health_score: comparisonData.product_a?.health_score ?? comparisonData.product_b?.health_score ?? null,
          safety_level: comparisonData.winner === "A" 
            ? (comparisonData.product_a?.safety_level || "safe")
            : comparisonData.winner === "B" 
            ? (comparisonData.product_b?.safety_level || "safe")
            : "moderate",
          result_json: comparisonData
        })
        .select()
        .single();
      scanId = scanData?.id || "";
    } catch (dbErr) {
      console.error("Failed to save comparison to history database:", dbErr);
    }

    // Finalize 2 credits deduction
    let remainingCredits: number | undefined;
    if (activeReservationOpId) {
      const finalization = await finalizeReservation(user.id, activeReservationOpId);
      remainingCredits = finalization.newBalance;
      activeReservationOpId = null;
    }

    return NextResponse.json({
      success: true,
      comparison: comparisonData,
      scanId,
      remainingCredits
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
