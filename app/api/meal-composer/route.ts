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
import { normalizeNutrientsTo100g, parseServingSizeGrams, parseMeasurementQuantity } from "@/lib/claude";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";
import { z } from "zod";
import crypto from "crypto";

const MealItemSchema = z.object({
  scanId: z.string().min(1, "scanId is required"),
  quantity: z.number().positive("Quantity must be a positive number"),
  unit: z.enum(["g", "ml", "servings"])
});

const MealPayloadSchema = z.object({
  idempotencyKey: z.string().trim().max(128).optional(),
  mealName: z.string().max(100).optional().default("Composite Meal"),
  items: z.array(MealItemSchema).min(1, "At least one item with explicit quantity and unit is required")
});

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

    const { mealName, items } = parsed.data;
    const headerIdempotencyKey = request.headers.get("x-idempotency-key")?.trim() || "";
    const bodyIdempotencyKey = parsed.data.idempotencyKey?.trim() || "";
    if (headerIdempotencyKey && bodyIdempotencyKey && headerIdempotencyKey !== bodyIdempotencyKey) {
      return NextResponse.json({
        error: "IDEMPOTENCY_KEY_MISMATCH",
        message: "Conflicting idempotency keys provided in header and body."
      }, { status: 400 });
    }
    let idempotencyKey = bodyIdempotencyKey || headerIdempotencyKey;
    if (!idempotencyKey) {
      const normalizedPayload = {
        mealName: mealName || "Composite Meal",
        items: [...items].sort((a, b) => a.scanId.localeCompare(b.scanId))
      };
      const hash = crypto.createHash("sha256").update(`${user.id}:${JSON.stringify(normalizedPayload)}`).digest("hex").slice(0, 24);
      idempotencyKey = `det_${hash}`;
    }

    const scanIds = items.map(i => i.scanId);

    // 2. IDEMPOTENCY CHECK & ATOMIC CREDIT RESERVATION (1 credit for meal composition)
    const opId = `op_meal_${user.id.slice(0, 8)}_${idempotencyKey}`;
    const payloadHash = crypto.createHash("sha256").update(JSON.stringify({
      mealName: mealName || "Composite Meal",
      items: [...items].sort((a, b) => a.scanId.localeCompare(b.scanId))
    })).digest("hex");

    const workerId = `w_${process.pid || 1}_${crypto.randomBytes(4).toString("hex")}`;
    activeWorkerId = workerId;

    // Atomically claim operation
    const claim = await claimOperation(
      user.id,
      opId,
      "meal_composer",
      CREDIT_COSTS.MEAL_COMPOSER,
      payloadHash,
      workerId,
      120
    );

    if (!claim.success) {
      if (claim.error === "IDEMPOTENCY_CONFLICT") {
        return NextResponse.json({
          error: "IDEMPOTENCY_CONFLICT",
          message: "This idempotency key was previously used with different meal items."
        }, { status: 409 });
      }
      if (claim.error === "OPERATION_IN_PROGRESS") {
        return NextResponse.json({
          error: "OPERATION_IN_PROGRESS",
          message: "This meal composition is actively being processed by another worker. Please wait."
        }, { status: 409 });
      }
      if (claim.error === "INSUFFICIENT_CREDITS") {
        return NextResponse.json({
          error: "INSUFFICIENT_CREDITS",
          message: "You need at least 1 scan credit to compose a meal. Please refill your scan pack.",
          availableCredits: claim.availableCredits ?? 0
        }, { status: 403 });
      }
      return NextResponse.json({
        error: claim.error || "OPERATION_CLAIM_FAILED",
        message: claim.message || "Failed to claim meal composer operation."
      }, { status: 500 });
    }

    activeFencingToken = claim.fencingToken;

    if (claim.status === "completed" || claim.alreadyCompleted) {
      const savedMeal = claim.result?.meal || claim.result;
      const savedMealId = claim.result?.mealId || opId;
      return NextResponse.json({
        success: true,
        meal: savedMeal,
        mealId: savedMealId,
        already_completed: true
      });
    }

    if (claim.status === "accounting_pending" || claim.accountingPending) {
      const recovery = await recoverOperationAccounting(user.id, opId);
      const savedMeal = claim.result?.meal || claim.result;
      const savedMealId = claim.result?.mealId || opId;
      if (recovery.success) {
        return NextResponse.json({
          success: true,
          meal: savedMeal,
          mealId: savedMealId,
          remainingCredits: recovery.newBalance,
          recovered: true
        });
      } else {
        return NextResponse.json({
          success: false,
          status: "accounting_pending",
          error: "ACCOUNTING_FINALIZATION_FAILED",
          opId,
          mealId: savedMealId,
          message: `Meal was composed, but credit finalization failed: ${recovery.error}. Please retry.`,
          meal: savedMeal
        }, { status: 500 });
      }
    }

    activeReservationOpId = opId;

    // 3. Retrieve scans from user's history
    const { data: scans, error: scansError } = await supabase
      .from("scans")
      .select("*")
      .in("id", scanIds)
      .eq("user_id", user.id);

    const uniqueRequestedIds = new Set(scanIds);
    if (scansError || !scans || scans.length !== uniqueRequestedIds.size) {
      if (activeReservationOpId) {
        await releaseOperationOnFailure(user.id, activeReservationOpId, workerId, "Selected scan records not found", activeFencingToken);
        activeReservationOpId = null;
      }
      return NextResponse.json({ error: "One or more selected food scans could not be found or do not belong to your account." }, { status: 400 });
    }

    // Reject comparison records or unreadable scans
    const unsupportedScan = scans.find(s => s.barcode?.startsWith("COMPARE:") || s.safety_level === "insufficient_evidence");
    if (unsupportedScan) {
      if (activeReservationOpId) {
        await releaseOperationOnFailure(user.id, activeReservationOpId, workerId, "Unsupported scan type in meal", activeFencingToken);
        activeReservationOpId = null;
      }
      return NextResponse.json({ error: "Comparison results or unreadable scans without nutritional data cannot be used as meal components." }, { status: 400 });
    }

    // 4. Quantity-Aware Macro Aggregation with Propagated Unknowns
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
    const quantityBreakdown: Array<{ name: string; quantity: string; amount: number; unit: string }> = [];

    // Process every item entry in order (properly supporting duplicate items/scans with separate portions)
    items.forEach((itemConfig) => {
      const scan = scans.find(s => s.id === itemConfig.scanId);
      if (!scan) return;

      const res = scan.result_json || {};
      const prodName = res.product_name || scan.product_name || "Food Item";
      if (!productNames.includes(prodName)) {
        productNames.push(prodName);
      }

      const qty = itemConfig.quantity;
      const unit = itemConfig.unit;
      quantityBreakdown.push({
        name: prodName,
        quantity: `${qty} ${unit}`,
        amount: qty,
        unit
      });

      const nut = res.nutrition_facts || {};
      const ps = nut.per_serving || {};
      const normalized = normalizeNutrientsTo100g(nut);

      // Determine nutrient values scaled to the exact requested portion
      let itemCal: number | null = null;
      let itemFat: number | null = null;
      let itemSatFat: number | null = null;
      let itemCarbs: number | null = null;
      let itemSugar: number | null = null;
      let itemProtein: number | null = null;
      let itemSodium: number | null = null;

      if (unit === "servings") {
        // Option A: Direct per-serving facts scaled by number of servings
        const hasDirectPs = ps.calories != null || ps.fat_g != null || ps.sugar_g != null || ps.protein_g != null;
        if (hasDirectPs) {
          itemCal = ps.calories != null ? ps.calories * qty : (normalized.calories_100g != null && normalized.serving_size_g ? (normalized.calories_100g * normalized.serving_size_g * qty) / 100 : null);
          itemFat = ps.fat_g != null ? ps.fat_g * qty : (normalized.fat_100g != null && normalized.serving_size_g ? (normalized.fat_100g * normalized.serving_size_g * qty) / 100 : null);
          itemSatFat = ps.saturated_fat_g != null ? ps.saturated_fat_g * qty : (normalized.saturated_fat_100g != null && normalized.serving_size_g ? (normalized.saturated_fat_100g * normalized.serving_size_g * qty) / 100 : null);
          itemCarbs = ps.carbs_g != null ? ps.carbs_g * qty : (normalized.carbs_100g != null && normalized.serving_size_g ? (normalized.carbs_100g * normalized.serving_size_g * qty) / 100 : null);
          itemSugar = ps.sugar_g != null ? ps.sugar_g * qty : (normalized.sugar_100g != null && normalized.serving_size_g ? (normalized.sugar_100g * normalized.serving_size_g * qty) / 100 : null);
          itemProtein = ps.protein_g != null ? ps.protein_g * qty : (normalized.protein_100g != null && normalized.serving_size_g ? (normalized.protein_100g * normalized.serving_size_g * qty) / 100 : null);
          itemSodium = ps.sodium_mg != null ? ps.sodium_mg * qty : (normalized.sodium_100g != null && normalized.serving_size_g ? (normalized.sodium_100g * normalized.serving_size_g * qty) / 100 : null);
        } else if (normalized.serving_size_g && normalized.serving_size_g > 0) {
          // Option B: Convert servings to grams using known serving mass
          const totalGrams = qty * normalized.serving_size_g;
          const scale = totalGrams / 100;
          itemCal = normalized.calories_100g != null ? normalized.calories_100g * scale : null;
          itemFat = normalized.fat_100g != null ? normalized.fat_100g * scale : null;
          itemSatFat = normalized.saturated_fat_100g != null ? normalized.saturated_fat_100g * scale : null;
          itemCarbs = normalized.carbs_100g != null ? normalized.carbs_100g * scale : null;
          itemSugar = normalized.sugar_100g != null ? normalized.sugar_100g * scale : null;
          itemProtein = normalized.protein_100g != null ? normalized.protein_100g * scale : null;
          itemSodium = normalized.sodium_100g != null ? normalized.sodium_100g * scale : null;
        }
      } else {
        // Requested in grams or ml: verify dimensional compatibility
        const requestedDimension = unit === "ml" ? "volume" : "mass";
        const basisDimension = normalized.is_liquid || normalized.basis === "per_100ml" ? "volume" : (normalized.basis === "per_100g" ? "mass" : "unknown");

        if (requestedDimension === basisDimension) {
          const scale = qty / 100;
          itemCal = normalized.calories_100g != null ? normalized.calories_100g * scale : null;
          itemFat = normalized.fat_100g != null ? normalized.fat_100g * scale : null;
          itemSatFat = normalized.saturated_fat_100g != null ? normalized.saturated_fat_100g * scale : null;
          itemCarbs = normalized.carbs_100g != null ? normalized.carbs_100g * scale : null;
          itemSugar = normalized.sugar_100g != null ? normalized.sugar_100g * scale : null;
          itemProtein = normalized.protein_100g != null ? normalized.protein_100g * scale : null;
          itemSodium = normalized.sodium_100g != null ? normalized.sodium_100g * scale : null;
        } else {
          // Dimension mismatch (e.g. requested ml for solid 100g, or grams for liquid 100ml)
          // Do NOT assume 1 ml = 1 g. Check if serving size unit matches requested dimension.
          const rawServing = parseServingSizeGrams(nut.serving_size || nut.serving_size_text);
          if (rawServing.dimension === requestedDimension && rawServing.grams && rawServing.grams > 0) {
            const servingRatio = qty / rawServing.grams;
            itemCal = ps.calories != null ? ps.calories * servingRatio : null;
            itemFat = ps.fat_g != null ? ps.fat_g * servingRatio : null;
            itemSatFat = ps.saturated_fat_g != null ? ps.saturated_fat_g * servingRatio : null;
            itemCarbs = ps.carbs_g != null ? ps.carbs_g * servingRatio : null;
            itemSugar = ps.sugar_g != null ? ps.sugar_g * servingRatio : null;
            itemProtein = ps.protein_g != null ? ps.protein_g * servingRatio : null;
            itemSodium = ps.sodium_mg != null ? ps.sodium_mg * servingRatio : null;
          } else {
            // Incompatible dimension without density: nutrients cannot be scaled safely
            itemCal = null;
            itemFat = null;
            itemSatFat = null;
            itemCarbs = null;
            itemSugar = null;
            itemProtein = null;
            itemSodium = null;
          }
        }
      }

      // Propagate missing/unknown values: if a constituent product is missing calories, total becomes null
      if (itemCal == null) totalCalories = null;
      else if (totalCalories != null) totalCalories += itemCal;

      if (itemFat == null) totalFatGrams = null;
      else if (totalFatGrams != null) totalFatGrams += itemFat;

      if (itemSatFat == null) totalSaturatedFatGrams = null;
      else if (totalSaturatedFatGrams != null) totalSaturatedFatGrams += itemSatFat;

      if (itemCarbs == null) totalCarbsGrams = null;
      else if (totalCarbsGrams != null) totalCarbsGrams += itemCarbs;

      if (itemSugar == null) totalSugarGrams = null;
      else if (totalSugarGrams != null) totalSugarGrams += itemSugar;

      if (itemProtein == null) totalProteinGrams = null;
      else if (totalProteinGrams != null) totalProteinGrams += itemProtein;

      if (itemSodium == null) totalSodiumMg = null;
      else if (totalSodiumMg != null) totalSodiumMg += itemSodium;

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

    // Health Score Calculation: Dimensionally Sound Weighting
    // Strategy:
    // 1. If calories are known for all scored constituent items, calculate calorie-weighted average.
    // 2. Else if all scored constituent items share identical physical units (e.g. all grams or all ml), calculate quantity-weighted average.
    // 3. Otherwise (incompatible units without complete calories), calculate unweighted arithmetic mean.
    const scoredItems: Array<{ score: number; calories: number | null; quantity: number; unit: string }> = [];

    items.forEach((item) => {
      const scan = scans.find(s => s.id === item.scanId);
      if (scan && typeof scan.health_score === "number" && !isNaN(scan.health_score)) {
        const res = scan.result_json || {};
        const nut = res.nutrition_facts || {};
        const normalized = normalizeNutrientsTo100g(nut);
        let itemCal: number | null = null;

        if (item.unit === "servings") {
          if (nut.per_serving?.calories != null) {
            itemCal = nut.per_serving.calories * item.quantity;
          } else if (normalized.calories_100g != null && normalized.serving_size_g) {
            itemCal = (normalized.calories_100g * normalized.serving_size_g * item.quantity) / 100;
          }
        } else {
          if (normalized.calories_100g != null) {
            itemCal = (normalized.calories_100g * item.quantity) / 100;
          }
        }

        scoredItems.push({
          score: scan.health_score,
          calories: itemCal,
          quantity: item.quantity,
          unit: item.unit
        });
      }
    });

    let portionAwareHealthScore: number | null = null;
    if (scoredItems.length > 0) {
      const allHaveCalories = scoredItems.every(si => si.calories !== null && si.calories > 0);
      const allSameUnit = scoredItems.every(si => si.unit === scoredItems[0].unit);

      if (allHaveCalories) {
        // Option 1: Calorie-weighted
        const totalCal = scoredItems.reduce((acc, si) => acc + (si.calories || 0), 0);
        const weightedSum = scoredItems.reduce((acc, si) => acc + si.score * (si.calories || 0), 0);
        portionAwareHealthScore = totalCal > 0 ? Math.round(weightedSum / totalCal) : null;
      } else if (allSameUnit) {
        // Option 2: Quantity-weighted (homogeneous physical units)
        const totalQty = scoredItems.reduce((acc, si) => acc + si.quantity, 0);
        const weightedSum = scoredItems.reduce((acc, si) => acc + si.score * si.quantity, 0);
        portionAwareHealthScore = totalQty > 0 ? Math.round(weightedSum / totalQty) : null;
      } else {
        // Option 3: Unweighted arithmetic mean across distinct dimensions
        const sum = scoredItems.reduce((acc, si) => acc + si.score, 0);
        portionAwareHealthScore = Math.round(sum / scoredItems.length);
      }
    }

    let compositeVerdict = `Combined portion-weighted nutritional analysis of: ${quantityBreakdown.map(q => `${q.name} (${q.quantity})`).join(", ")}.`;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      try {
        const cookieStore = await cookies();
        const preferredLanguage = cookieStore.get("preferred_lang")?.value || "en";
        const promptText = `You are ScanSafe nutritional scientist.
Evaluate this meal combination strictly based on evidence:
Items consumed: ${quantityBreakdown.map(q => `${q.name} (${q.quantity})`).join(", ")}
Portion-Weighted Health Score: ${portionAwareHealthScore != null ? portionAwareHealthScore + "/100" : "Insufficient Data"}
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
      health_score: portionAwareHealthScore,
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

    let finalSavedMeal: any = null;

    const { data: savedMeal, error: saveErr } = await supabase
      .from("meal_compositions")
      .insert({
        user_id: user.id,
        op_id: opId,
        accounting_status: "accounting_pending",
        name: mealName || "Composite Meal",
        scans_list: scanIds,
        analysis_json: compositeAnalysis
      })
      .select()
      .maybeSingle();

    if (savedMeal) {
      finalSavedMeal = savedMeal;
    } else {
      // Check for table or column missing error
      const isMissingTableOrCol = saveErr?.code === "PGRST204" || 
        saveErr?.code === "PGRST205" || 
        saveErr?.code === "42P01" || 
        saveErr?.message?.includes("table") || 
        saveErr?.message?.includes("column");

      if (isMissingTableOrCol) {
        // Fall back to storing in scans table as a composite record
        const { data: scanMeal, error: scanMealErr } = await supabase
          .from("scans")
          .insert({
            user_id: user.id,
            product_name: mealName || "Composite Meal",
            barcode: `MEAL:${scanIds.slice(0, 3).join("_")}`,
            health_score: portionAwareHealthScore,
            safety_level: portionAwareHealthScore && portionAwareHealthScore >= 70 ? "safe" : "moderate",
            result_json: compositeAnalysis
          })
          .select()
          .maybeSingle();

        if (scanMeal) {
          finalSavedMeal = scanMeal;
        } else {
          console.error("Fallback scan meal save error:", scanMealErr);
          // Non-fatal fallback: synthesize in-memory ID if database write fails
          finalSavedMeal = { id: opId };
        }
      } else if (saveErr && (saveErr.code === "23505" || saveErr.message?.includes("unique") || saveErr.message?.includes("duplicate key"))) {
        const { data: existingSaved } = await supabase
          .from("meal_compositions")
          .select("*")
          .eq("user_id", user.id)
          .eq("op_id", opId)
          .maybeSingle();

        if (existingSaved) {
          finalSavedMeal = existingSaved;
        }
      }
    }

    if (!finalSavedMeal) {
      finalSavedMeal = { id: opId };
    }

    const mealId = finalSavedMeal.id;

    // Finalize credit deduction atomically
    const finalization = await saveOperationResultAndFinalize(user.id, opId, workerId, { meal: compositeAnalysis, mealId }, activeFencingToken);
    if (finalization.success) {
      if (mealId && mealId !== opId) {
        try {
          await supabase
            .from("meal_compositions")
            .update({ accounting_status: "completed" })
            .eq("id", mealId);
        } catch {
          // ignore
        }
      }
      activeReservationOpId = null;

      return NextResponse.json({
        success: true,
        meal: compositeAnalysis,
        mealId,
        remainingCredits: finalization.newBalance
      });
    } else {
      console.error("Credit finalization failed in meal composer:", finalization.error);
      return NextResponse.json({
        success: false,
        status: "accounting_pending",
        error: "ACCOUNTING_FINALIZATION_FAILED",
        opId: activeReservationOpId,
        mealId,
        message: `Meal was composed, but credit accounting could not be finalized: ${finalization.error}. Please retry.`,
        meal: compositeAnalysis
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Error in meal composer route:", error);
    if (activeReservationOpId && currentUserId && activeWorkerId && typeof activeFencingToken === "number") {
      await releaseOperationOnFailure(currentUserId, activeReservationOpId, activeWorkerId, error.message || "Meal composer calculation failure", activeFencingToken);
    }
    return NextResponse.json({ error: "Failed to compose meal nutrients. Your credit has been restored." }, { status: 500 });
  }
}
