import { createClient } from "@/lib/supabase-server";
import { checkAndDeductCredits, refundCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/plans";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";

export async function POST(request: Request) {
  let reservedCredit = false;
  let currentUserId: string | null = null;

  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    currentUserId = user.id;

    const { scanIds, mealName } = await request.json();
    if (!scanIds || !Array.isArray(scanIds) || scanIds.length === 0) {
      return NextResponse.json({ error: "No scans selected for composer." }, { status: 400 });
    }

    // Atomic Credit Deduction (1 credit for meal composition)
    const deduction = await checkAndDeductCredits(
      user.id,
      CREDIT_COSTS.MEAL_COMPOSER,
      "meal_compose",
      null,
      `Meal composition: ${mealName || "Composite Meal"}`
    );

    if (!deduction.success) {
      return NextResponse.json({
        error: "INSUFFICIENT_CREDITS",
        message: deduction.error || "You need at least 1 scan credit to compose a meal. Please refill your scan pack.",
        availableCredits: deduction.previousBalance
      }, { status: 403 });
    }

    reservedCredit = true;

    // Retrieve scans from DB
    const { data: scans, error: scansError } = await supabase
      .from("scans")
      .select("*")
      .in("id", scanIds)
      .eq("user_id", user.id);

    if (scansError || !scans || scans.length === 0) {
      await refundCredits(user.id, CREDIT_COSTS.MEAL_COMPOSER, null, "Failed to load selected scans");
      return NextResponse.json({ error: "Failed to retrieve selected scans." }, { status: 400 });
    }

    // Aggregate macros and details
    let totalCalories = 0;
    let totalFatGrams = 0;
    let totalSaturatedFatGrams = 0;
    let totalCarbsGrams = 0;
    let totalSugarGrams = 0;
    let totalProteinGrams = 0;
    let totalSodiumMg = 0;

    const mergedIngredients: string[] = [];
    const mergedAdditives: any[] = [];
    const mergedAllergens: string[] = [];
    const productNames: string[] = [];

    scans.forEach((scan) => {
      const res = scan.result_json || {};
      productNames.push(res.product_name || scan.product_name);

      const nut = res.nutrition_facts || {};
      if (nut.per_100g) {
        const p100 = nut.per_100g;
        if (p100.calories) totalCalories += Number(p100.calories) || 0;
        if (p100.fat_g) totalFatGrams += parseFloat(p100.fat_g) || 0;
        if (p100.saturated_fat_g) totalSaturatedFatGrams += parseFloat(p100.saturated_fat_g) || 0;
        if (p100.carbs_g) totalCarbsGrams += parseFloat(p100.carbs_g) || 0;
        if (p100.sugar_g) totalSugarGrams += parseFloat(p100.sugar_g) || 0;
        if (p100.protein_g) totalProteinGrams += parseFloat(p100.protein_g) || 0;
        if (p100.sodium_mg) totalSodiumMg += parseFloat(p100.sodium_mg) || 0;
      } else {
        if (nut.calories) totalCalories += Number(nut.calories) || 0;
        if (nut.fat) totalFatGrams += parseFloat(nut.fat) || 0;
        if (nut.saturated_fat) totalSaturatedFatGrams += parseFloat(nut.saturated_fat) || 0;
        if (nut.carbs) totalCarbsGrams += parseFloat(nut.carbs) || 0;
        if (nut.sugar) totalSugarGrams += parseFloat(nut.sugar) || 0;
        if (nut.protein) totalProteinGrams += parseFloat(nut.protein) || 0;
        if (nut.sodium) totalSodiumMg += parseFloat(nut.sodium) || 0;
      }

      if (Array.isArray(res.additives)) {
        res.additives.forEach((add: any) => {
          if (!mergedAdditives.some((a) => a.name === add.name || (add.code && a.code === add.code))) {
            mergedAdditives.push(add);
          }
        });
      }

      if (Array.isArray(res.ingredients)) {
        res.ingredients.forEach((ing: any) => {
          if (!mergedIngredients.some((i) => i.toLowerCase() === ing.name.toLowerCase())) {
            mergedIngredients.push(ing.name);
          }
        });
      }

      const alls = res.allergens_declared || res.allergens || [];
      if (Array.isArray(alls)) {
        alls.forEach((all: string) => {
          if (!mergedAllergens.some((a) => a.toLowerCase() === all.toLowerCase())) {
            mergedAllergens.push(all);
          }
        });
      }
    });

    const averageHealthScore = Math.round(
      scans.reduce((sum, s) => sum + (s.health_score || 0), 0) / scans.length
    );

    let compositeVerdict = `Combined analysis of: ${productNames.join(", ")}.`;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      try {
        const cookieStore = await cookies();
        const preferredLanguage = cookieStore.get("preferred_lang")?.value || "en";
        const promptText = `You are ScanSafe ULTRA nutritional scientist.
Evaluate this meal combination strictly based on evidence:
Products: ${productNames.join(", ")}
Total Calories: ${totalCalories} kcal
Total Carbs: ${totalCarbsGrams.toFixed(1)}g (Sugar: ${totalSugarGrams.toFixed(1)}g)
Total Fats: ${totalFatGrams.toFixed(1)}g (Saturated: ${totalSaturatedFatGrams.toFixed(1)}g)
Total Protein: ${totalProteinGrams.toFixed(1)}g
Total Sodium: ${totalSodiumMg.toFixed(0)}mg
Additives: ${JSON.stringify(mergedAdditives.map(a => a.name))}

Provide a concise 3-sentence scientific assessment of this combination (macro balance, glycemic load, sodium density, and a whole-food addition to optimize nutrition).
Respond in language: ${preferredLanguage}.
Return ONLY plain text.`;

        const geminiRes = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            contents: [{ parts: [{ text: promptText }] }]
          },
          { headers: { "content-type": "application/json" } }
        );
        const text = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) compositeVerdict = text;
      } catch (err: any) {
        console.warn("Composite AI generation warning:", err.message);
      }
    }

    const compositeAnalysis = {
      meal_name: mealName || "My Composite Meal",
      health_score: averageHealthScore,
      composite_verdict: compositeVerdict,
      product_count: scans.length,
      products_scanned: productNames,
      nutrition_summary: {
        calories: totalCalories,
        fat: `${totalFatGrams.toFixed(1)}g`,
        saturated_fat: `${totalSaturatedFatGrams.toFixed(1)}g`,
        carbs: `${totalCarbsGrams.toFixed(1)}g`,
        sugar: `${totalSugarGrams.toFixed(1)}g`,
        protein: `${totalProteinGrams.toFixed(1)}g`,
        sodium: `${totalSodiumMg.toFixed(1)}mg`
      },
      additives: mergedAdditives,
      allergens: mergedAllergens,
      ingredients: mergedIngredients
    };

    const { data: savedMeal, error: saveErr } = await supabase
      .from("meal_compositions")
      .insert({
        user_id: user.id,
        name: mealName || "Composite Meal",
        scans_list: scanIds,
        analysis_json: compositeAnalysis
      })
      .select()
      .single();

    if (saveErr) {
      console.error("Failed to save meal composition record:", saveErr);
    }

    return NextResponse.json({
      success: true,
      meal: compositeAnalysis,
      mealId: savedMeal?.id,
      remainingCredits: deduction.newBalance
    });
  } catch (error: any) {
    console.error("Error in meal composer route:", error);
    if (reservedCredit && currentUserId) {
      await refundCredits(currentUserId, CREDIT_COSTS.MEAL_COMPOSER, null, "Meal composer calculation failure");
    }
    return NextResponse.json({ error: "Failed to compose meal nutrients. Your credit has been restored." }, { status: 500 });
  }
}
