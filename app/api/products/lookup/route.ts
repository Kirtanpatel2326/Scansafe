import { createClient } from "@/lib/supabase-server";
import { RawProductFactsSchema, calculateHealthScore, applyPreferences } from "@/lib/claude";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode")?.trim();
    const query = searchParams.get("q")?.trim();

    if (!barcode && !query) {
      return NextResponse.json({
        error: "MISSING_QUERY",
        message: "Please provide a barcode or search query."
      }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Direct Barcode Lookup
    if (barcode) {
      let cached: any = null;
      try {
        const { data } = await supabase
          .from("products_cache")
          .select("*")
          .eq("barcode", barcode)
          .maybeSingle();
        cached = data;
      } catch {
        // Fall back to product_cache table
      }

      if (!cached) {
        try {
          const { data: legacy } = await supabase
            .from("product_cache")
            .select("*")
            .eq("barcode", barcode)
            .maybeSingle();
          if (legacy && legacy.result_json) {
            cached = {
              barcode: legacy.barcode,
              product_name: legacy.result_json.product_name,
              brand: legacy.result_json.brand,
              raw_data: legacy.result_json
            };
          }
        } catch {
          // Non-fatal
        }
      }

      if (cached && cached.raw_data) {
        const rawData = cached.raw_data;
        const scoreResult = calculateHealthScore(rawData);

        // Fetch version history if available
        let versions: any[] = [];
        try {
          const { data: vData } = await supabase
            .from("product_versions")
            .select("version, reason, created_at, created_by")
            .eq("barcode", barcode)
            .order("version", { ascending: false });
          versions = vData || [];
        } catch {
          // Non-fatal
        }

        return NextResponse.json({
          success: true,
          found: true,
          product: {
            barcode: cached.barcode,
            product_name: cached.product_name,
            brand: cached.brand,
            variant: cached.variant || null,
            pack_size: cached.pack_size || null,
            nutrition_basis: cached.nutrition_basis || "per_100g",
            serving_size: cached.serving_size || rawData.nutrition_facts?.serving_size || null,
            evidence_images: cached.evidence_images || [],
            review_status: cached.review_status || "ai_extracted",
            last_reviewed_at: cached.last_reviewed_at || null,
            version: cached.version || 1,
            version_history: versions,
            source: cached.source || "catalog",
            raw_data: rawData,
            health_score: scoreResult.score,
            health_score_reason: scoreResult.reason,
            safety_level: scoreResult.safetyLevel,
            ingredients: rawData.ingredients || [],
            additives: rawData.additives || [],
            allergens_declared: rawData.allergens_declared || [],
            nutrition_facts: rawData.nutrition_facts || null,
            description: rawData.description || ""
          }
        });
      }

      // If not in database, attempt Open Food Facts lookup as public reference (with strict 2.5s timeout)
      try {
        const offRes = await fetch(`https://world.openfoodfacts.org/api/v3/product/${barcode}.json`, {
          headers: { "User-Agent": "ScanSafe/1.0 (contact@scansafe.co.in)" },
          signal: AbortSignal.timeout(2500)
        });
        if (offRes.ok) {
          const offData = await offRes.json();
          if (offData.product && offData.status === "success") {
            const p = offData.product;
            const offName = p.product_name || p.product_name_en || "Packaged Product";
            const offBrand = p.brands || p.brand_owner || "Unknown Brand";
            const offVariant = p.generic_name || p.quantity || null;

            return NextResponse.json({
              success: true,
              found: true,
              product: {
                barcode,
                product_name: offName,
                brand: offBrand,
                variant: offVariant,
                pack_size: p.quantity || null,
                nutrition_basis: p.nutrition_data_per === "100ml" ? "per_100ml" : "per_100g",
                serving_size: p.serving_size || null,
                evidence_images: p.image_url ? [p.image_url] : [],
                review_status: "ai_extracted", // Never claim unverified OFF data is 'reviewed'
                last_reviewed_at: null,
                version: 1,
                version_history: [],
                source: "openfoodfacts_public_database",
                description: `${offName} by ${offBrand}`,
                ingredients: (p.ingredients_text || "").split(/[,;]/).filter(Boolean).map((t: string) => ({
                  name: t.trim(),
                  status: "safe",
                  reason: ""
                })),
                additives: [],
                allergens_declared: (p.allergens_tags || []).map((t: string) => t.replace(/^[a-z]+:/i, "")),
                nutrition_facts: {
                  panel_status: "extracted",
                  basis: p.nutrition_data_per === "100ml" ? "per_100ml" : "per_100g",
                  per_100g: {
                    calories: p.nutriments?.["energy-kcal_100g"] || null,
                    fat_g: p.nutriments?.fat_100g || null,
                    saturated_fat_g: p.nutriments?.["saturated-fat_100g"] || null,
                    trans_fat_g: p.nutriments?.["trans-fat_100g"] || null,
                    sodium_mg: p.nutriments?.sodium_100g ? Math.round(p.nutriments.sodium_100g * 1000) : null,
                    carbs_g: p.nutriments?.carbohydrates_100g || null,
                    fiber_g: p.nutriments?.fiber_100g || null,
                    sugar_g: p.nutriments?.sugars_100g || null,
                    protein_g: p.nutriments?.proteins_100g || null
                  }
                }
              }
            });
          }
        }
      } catch (err) {
        console.warn("OpenFoodFacts lookup failed:", err);
      }

      // Not found anywhere: prompt user to snap label photos
      return NextResponse.json({
        success: true,
        found: false,
        barcode,
        message: "No existing product record found for this barcode. Please capture or upload label photos to scan."
      });
    }

    // 2. Query / Ambiguity Search by Product Name
    if (query) {
      let matches: any[] = [];
      try {
        const { data } = await supabase
          .from("products_cache")
          .select("barcode, product_name, brand, variant, pack_size, review_status, updated_at")
          .or(`product_name.ilike.%${query}%,brand.ilike.%${query}%`)
          .limit(10);
        matches = data || [];
      } catch {
        // Non-fatal if table not yet migrated
      }

      const variants = (matches || []).map(m => ({
        barcode: m.barcode,
        product_name: m.product_name,
        brand: m.brand,
        variant: m.variant || "Standard Pack",
        pack_size: m.pack_size || "Standard Size",
        review_status: m.review_status || "ai_extracted"
      }));

      return NextResponse.json({
        success: true,
        query,
        count: variants.length,
        is_ambiguous: variants.length > 1,
        variants
      });
    }

    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err.message }, { status: 500 });
  }
}
