import { createClient } from "@/lib/supabase-server";
import { checkAndDeductCredits, refundCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/plans";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";

export const maxDuration = 60;

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
  let reservedCredit = false;
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

    // 2. Atomic Credit Deduction (2 credits for compare)
    const deduction = await checkAndDeductCredits(
      user.id,
      CREDIT_COSTS.COMPARE,
      "compare",
      null,
      "Side-by-side product comparison"
    );

    if (!deduction.success) {
      return NextResponse.json({
        error: "INSUFFICIENT_CREDITS",
        message: deduction.error || "You need at least 2 scan credits to compare products. Please refill your scan pack.",
        availableCredits: deduction.previousBalance
      }, { status: 403 });
    }

    reservedCredit = true;

    const body = await request.json();
    const { imageA, imageB, preferences } = body;

    if (!imageA || !imageB) {
      await refundCredits(user.id, CREDIT_COSTS.COMPARE, null, "Missing comparison images");
      return NextResponse.json({
        error: "MISSING_IMAGES",
        message: "Both product images must be provided to run comparison."
      }, { status: 400 });
    }

    const { mediaType: typeA, base64Data: dataA } = getBase64Data(imageA);
    const { mediaType: typeB, base64Data: dataB } = getBase64Data(imageB);

    const userPrefs = preferences || [];
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      await refundCredits(user.id, CREDIT_COSTS.COMPARE, null, "AI service not configured");
      return NextResponse.json({
        error: "CONFIGURATION_ERROR",
        message: "Gemini API is not configured on server."
      }, { status: 500 });
    }

    const cookieStore = await cookies();
    const preferredLanguage = cookieStore.get("preferred_lang")?.value || "en";
    const langPrompt = preferredLanguage && preferredLanguage !== "en"
      ? "\nCRITICAL LANGUAGE REQUIREMENT: All user-facing explanations and rationale text fields (winner_reason, highlights, verdict_english) MUST be written in the language: " + preferredLanguage + "."
      : "";

    const systemPrompt = "You are ScanSafe COMPARE, an objective food toxicology and nutrition auditor.\n" +
"Compare the two product images (Image 1 = Product A, Image 2 = Product B) strictly based on visible label evidence against the user preferences: [" + userPrefs.join(", ") + "]." + langPrompt + "\n\n" +
"EVIDENCE INTEGRITY RULES:\n" +
"1. Extract nutrition and ingredient facts strictly from what is visible in the photos.\n" +
"2. If an image is unreadable or blurry, mark its panel_status as unreadable or missing, and evaluate based only on what can be reliably identified.\n" +
"3. Compare NOVA UPF degree, sugar, saturated fat, sodium, fiber, protein, and presence of high-risk synthetic additives.\n" +
"4. Select the healthier, less processed choice as the winner with clear factual justification.\n\n" +
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
    additives: { a: "0 additives", b: "3 additives (E322, E471, E150d)" }
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

    const candidate = response && response.data && response.data.candidates && response.data.candidates[0];
    const responseText = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text ? candidate.content.parts[0].text.trim() : null;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    let cleanedText = responseText;
    const jsonBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonBlockMatch) {
      cleanedText = jsonBlockMatch[1];
    }
    const comparisonData = JSON.parse(cleanedText.trim());

    // Save comparison scan to history database
    let scanId = "";
    try {
      const { data: scanData } = await supabase
        .from("scans")
        .insert({
          user_id: user.id,
          product_name: (comparisonData.product_a?.name || "Product A") + " vs " + (comparisonData.product_b?.name || "Product B"),
          barcode: "COMPARE:" + comparisonData.winner,
          health_score: Math.max(comparisonData.product_a?.health_score || 0, comparisonData.product_b?.health_score || 0),
          safety_level: comparisonData.winner === "A" 
            ? (comparisonData.product_a?.safety_level || "safe")
            : comparisonData.winner === "B" 
            ? (comparisonData.product_b?.safety_level || "safe")
            : (comparisonData.product_a?.safety_level || "moderate"),
          result_json: comparisonData
        })
        .select()
        .single();
      scanId = scanData?.id || "";
    } catch (dbErr) {
      console.error("Failed to save comparison to history database:", dbErr);
    }

    return NextResponse.json({
      success: true,
      comparison: comparisonData,
      scanId,
      remainingCredits: deduction.newBalance
    });

  } catch (err: any) {
    console.error("Comparison API error:", err);
    if (reservedCredit && currentUserId) {
      await refundCredits(currentUserId, CREDIT_COSTS.COMPARE, null, "Comparison processing error");
    }
    return NextResponse.json({
      error: "COMPARISON_FAILED",
      message: err.message || "An error occurred during comparison analysis. Your credits have been restored."
    }, { status: 500 });
  }
}
