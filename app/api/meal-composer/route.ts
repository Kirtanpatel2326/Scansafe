import { createClient } from "@/lib/supabase-server";
import { reserveCredits, finalizeReservation, releaseReservation } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/plans";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { z } from "zod";

const MealItemSchema = z.object({
  scanId: z.string().min(1),
  quantity: z.number().positive().default(100),
  unit: z.enum(["g", "ml", "servings"]).default("g")
});

const MealPayloadSchema = z.object({
  mealName: z.string().max(100).optional().default("Composite Meal"),
  items: z.array(MealItemSchema).optional(),
  scanIds: z.array(z.string()).optional()
}).refine(data => (data.items && data.items.length > 0) || (data.scanIds && data.scanIds.length > 0), {
  message: "Either items array or scanIds array must be provided"
});

export async function POST(request: Request) {
  let activeReservationOpId: string | null = null;
  let currentUserId: string | null = null;

  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    currentUserId = user.id;

    let rawBody: any;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const parsed = MealPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({
        error: "INVALID_PAYLOAD",
        details: parsed.error.format()
      }, { status: 400 });
    }

    const { mealName, items: rawItems, scanIds: rawScanIds } = parsed.data;

    // Normalize items with quantities
    const items = rawItems && rawItems.length > 0
      ? rawItems
      : (rawScanIds || []).map(id => ({ scanId: id, quantity: 100, unit: "g" as const }));

    if (items.length === 0) {
      return NextResponse.json({ error: "No scans selected for composer." }, { status: 400 });
    }

    const scanIds = items.map(i => i.scanId);

    // 2. Atomic Credit Reservation (1 credit for meal composition)
    const opId = `op_meal_${user.id.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const reservation = await reserveCredits(
      user.id,
      CREDIT_COSTS.MEAL_COMPOSER,
      "meal_compose",
      opId,
      `Meal composition: ${mealName}`
    );

    if (!reservation.success) {
      return NextResponse.json({
        error: "INSUFFICIENT_CREDITS",
        message: reservation.error || "You need at least 1 scan credit to compose a meal. Please refill your scan pack.",
        availableCredits: reservation.availableCreditsAfter ?? 0
      }, { status: 403 });
    }

    activeReservationOpId = opId;

    // 3. Retrieve scans from DB
    const { data: scans, error: scansError } = await supabase
      .from("scans")
      .select("*")
      .in("id", scanIds)
      .eq("user_id", user.id);

    if (scansError || !scans || scans.length === 0) {
      if (activeReservationOpId) {
        await releaseReservation(user.id, activeReservationOpId, "Failed to load selected scans");
      }
      return NextResponse.json({ error: "Failed to retrieve selected scans from your history." }, { status: 400 });
    }

    // 4. Quantity-Aware Macro Aggregation
    let totalCalories: number | null = 0;
    let totalFatGrams: number | null = 0;
    let totalSaturatedFatGrams: number | null = 0;
    let totalCarbsGrams: number | null = 0;
    let totalSugarGrams: number | null = 0;
    let totalProteinGrams: number | null = 0;
    let totalSodiumMg: number | null = 0;

    const mergedIngredients: string[] = [];
    const mergedAdditives: any[] = [];
    const mergedAllergens: string[] = [];
    const productNames: string[] = [];
    const quantityBreakdown: Array<{ name: string; quantity: string }> = [];

    scans.forEach((scan) => {
      const res = scan.result_json || {};
      const prodName = res.product_name || scan.product_name || "Food Item";
      productNames.push(prodName);

      const itemConfig = items.find(i => i.scanId === scan.id) || { quantity: 100, unit: "g" };
      quantityBreakdown.push({
        name: prodName,
        quantity: `${itemConfig.quantity}${itemConfig.unit}`
      });

      // Scaling factor: calculate scale relative to standard 100g or 1 serving
      const nut = res.nutrition_facts || {};
      const p100 = nut.per_100g || {};
      const ps = nut.per_serving || {};

      let scaleFactor = 1.0;
      let usingPer100g = true;

      if (itemConfig.unit === "servings") {
        usingPer100g = false;
        scaleFactor = itemConfig.quantity;
      } else {
        // grams or ml (approx 1g = 1ml for water-based liquids)
        scaleFactor = itemConfig.quantity / 100;
      }

      if (usingPer100g && (p100.calories != null || p100.fat_g != null || nut.calories_100g != null)) {
        const cal = p100.calories ?? nut.calories_100g;
        if (cal != null && totalCalories != null) totalCalories += cal * scaleFactor;

        const fat = p100.fat_g ?? (nut.fat_100g ? parseFloat(nut.fat_100g) : null);
        if (fat != null && totalFatGrams != null) totalFatGrams += fat * scaleFactor;

        const sat = p100.saturated_fat_g ?? (nut.saturated_fat_100g ? parseFloat(nut.saturated_fat_100g) : null);
        if (sat != null && totalSaturatedFatGrams != null) totalSaturatedFatGrams += sat * scaleFactor;

        const carbs = p100.carbs_g ?? (nut.carbs_100g ? parseFloat(nut.carbs_100g) : null);
        if (carbs != null && totalCarbsGrams != null) totalCarbsGrams += carbs * scaleFactor;

        const sugar = p100.sugar_g ?? (nut.sugar_100g ? parseFloat(nut.sugar_100g) : null);
        if (sugar != null && totalSugarGrams != null) totalSugarGrams += sugar * scaleFactor;

        const protein = p100.protein_g ?? (nut.protein_100g ? parseFloat(nut.protein_100g) : null);
        if (protein != null && totalProteinGrams != null) totalProteinGrams += protein * scaleFactor;

        const sodium = p100.sodium_mg ?? (nut.sodium_100g ? parseFloat(nut.sodium_100g) : null);
        if (sodium != null && totalSodiumMg != null) totalSodiumMg += sodium * scaleFactor;
      } else if (ps.calories != null || nut.calories != null) {
        const cal = ps.calories ?? nut.calories;
        if (cal != null && totalCalories != null) totalCalories += cal * scaleFactor;

        const fat = ps.fat_g ?? (nut.fat ? parseFloat(nut.fat) : null);
        if (fat != null && totalFatGrams != null) totalFatGrams += fat * scaleFactor;

        const sat = ps.saturated_fat_g ?? (nut.saturated_fat ? parseFloat(nut.saturated_fat) : null);
        if (sat != null && totalSaturatedFatGrams != null) totalSaturatedFatGrams += sat * scaleFactor;

        const carbs = ps.carbs_g ?? (nut.carbs ? parseFloat(nut.carbs) : null);
        if (carbs != null && totalCarbsGrams != null) totalCarbsGrams += carbs * scaleFactor;

        const sugar = ps.sugar_g ?? (nut.sugar ? parseFloat(nut.sugar) : null);
        if (sugar != null && totalSugarGrams != null) totalSugarGrams += sugar * scaleFactor;

        const protein = ps.protein_g ?? (nut.protein ? parseFloat(nut.protein) : null);
        if (protein != null && totalProteinGrams != null) totalProteinGrams += protein * scaleFactor;

        const sodium = ps.sodium_mg ?? (nut.sodium ? parseFloat(nut.sodium) : null);
        if (sodium != null && totalSodiumMg != null) totalSodiumMg += sodium * scaleFactor;
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
      scans.reduce((sum, s) => sum + (s.health_score || 50), 0) / scans.length
    );

    let compositeVerdict = `Combined analysis of: ${quantityBreakdown.map(q => `${q.name} (${q.quantity})`).join(", ")}.`;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      try {
        const cookieStore = await cookies();
        const preferredLanguage = cookieStore.get("preferred_lang")?.value || "en";
        const promptText = `You are ScanSafe nutritional scientist.
Evaluate this meal combination strictly based on evidence:
Items consumed: ${quantityBreakdown.map(q => `${q.name} (${q.quantity})`).join(", ")}
Total Calories: ${totalCalories != null ? Math.round(totalCalories) : "Unknown"} kcal
Total Carbs: ${totalCarbsGrams != null ? totalCarbsGrams.toFixed(1) + "g" : "Unknown"} (Sugar: ${totalSugarGrams != null ? totalSugarGrams.toFixed(1) + "g" : "Unknown"})
Total Fats: ${totalFatGrams != null ? totalFatGrams.toFixed(1) + "g" : "Unknown"} (Saturated: ${totalSaturatedFatGrams != null ? totalSaturatedFatGrams.toFixed(1) + "g" : "Unknown"})
Total Protein: ${totalProteinGrams != null ? totalProteinGrams.toFixed(1) + "g" : "Unknown"}
Total Sodium: ${totalSodiumMg != null ? totalSodiumMg.toFixed(0) + "mg" : "Unknown"}
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
      meal_name: mealName || "Composite Meal",
      health_score: averageHealthScore,
      composite_verdict: compositeVerdict,
      product_count: scans.length,
      quantity_breakdown: quantityBreakdown,
      products_scanned: productNames,
      nutrition_summary: {
        calories: totalCalories != null ? Math.round(totalCalories) : null,
        fat: totalFatGrams != null ? `${totalFatGrams.toFixed(1)}g` : null,
        saturated_fat: totalSaturatedFatGrams != null ? `${totalSaturatedFatGrams.toFixed(1)}g` : null,
        carbs: totalCarbsGrams != null ? `${totalCarbsGrams.toFixed(1)}g` : null,
        sugar: totalSugarGrams != null ? `${totalSugarGrams.toFixed(1)}g` : null,
        protein: totalProteinGrams != null ? `${totalProteinGrams.toFixed(1)}g` : null,
        sodium: totalSodiumMg != null ? `${totalSodiumMg.toFixed(1)}mg` : null
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

    let remainingCredits: number | undefined;
    if (activeReservationOpId) {
      const finalization = await finalizeReservation(user.id, activeReservationOpId);
      remainingCredits = finalization.newBalance;
      activeReservationOpId = null;
    }

    return NextResponse.json({
      success: true,
      meal: compositeAnalysis,
      mealId: savedMeal?.id,
      remainingCredits
    });
  } catch (error: any) {
    console.error("Error in meal composer route:", error);
    if (activeReservationOpId && currentUserId) {
      await releaseReservation(currentUserId, activeReservationOpId, "Meal composer calculation failure");
    }
    return NextResponse.json({ error: "Failed to compose meal nutrients. Your credit has been restored." }, { status: 500 });
  }
}
