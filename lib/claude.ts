import axios from "axios";
import https from "https";
import { z } from "zod";

const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 1000,
});

export const NutritionValuesSchema = z.object({
  calories: z.number().nullable().optional(),
  fat_g: z.number().nullable().optional(),
  saturated_fat_g: z.number().nullable().optional(),
  trans_fat_g: z.number().nullable().optional(),
  cholesterol_mg: z.number().nullable().optional(),
  sodium_mg: z.number().nullable().optional(),
  carbs_g: z.number().nullable().optional(),
  fiber_g: z.number().nullable().optional(),
  sugar_g: z.number().nullable().optional(),
  added_sugar_g: z.number().nullable().optional(),
  protein_g: z.number().nullable().optional(),
});

export const NutritionFactsSchema = z.object({
  panel_status: z.enum(["extracted", "unreadable", "missing"]).default("extracted"),
  unreadable_reason: z.string().nullable().optional(),
  serving_size: z.string().nullable().optional(),
  per_serving: NutritionValuesSchema.optional(),
  per_100g: NutritionValuesSchema.optional(),
  calories: z.number().nullable().optional(),
  calories_100g: z.number().nullable().optional(),
  fat: z.string().nullable().optional(),
  fat_100g: z.string().nullable().optional(),
  saturated_fat: z.string().nullable().optional(),
  saturated_fat_100g: z.string().nullable().optional(),
  trans_fat: z.string().nullable().optional(),
  trans_fat_100g: z.string().nullable().optional(),
  cholesterol: z.string().nullable().optional(),
  cholesterol_100g: z.string().nullable().optional(),
  sodium: z.string().nullable().optional(),
  sodium_100g: z.string().nullable().optional(),
  carbs: z.string().nullable().optional(),
  carbs_100g: z.string().nullable().optional(),
  fiber: z.string().nullable().optional(),
  fiber_100g: z.string().nullable().optional(),
  sugar: z.string().nullable().optional(),
  sugar_100g: z.string().nullable().optional(),
  protein: z.string().nullable().optional(),
  protein_100g: z.string().nullable().optional(),
});

export const IngredientItemSchema = z.object({
  name: z.string(),
  status: z.enum(["safe", "caution", "avoid"]).default("safe"),
  reason: z.string().default(""),
});

export const AdditiveItemSchema = z.object({
  name: z.string(),
  code: z.string().nullable().optional(),
  risk: z.enum(["low", "medium", "high"]).default("low"),
  description: z.string().default(""),
  source: z.string().nullable().optional(),
});

export const AlternativeItemSchema = z.object({
  name: z.string(),
  brand: z.string(),
  reason: z.string(),
  estimated_price_inr: z.number().nullable().optional(),
  buy_url_blinkit: z.string().nullable().optional(),
  buy_url_bigbasket: z.string().nullable().optional(),
});

export const DietaryCompatibilitySchema = z.object({
  is_compatible: z.boolean(),
  status: z.enum(["compatible", "incompatible", "precautionary_warning", "insufficient_data"]).default("compatible"),
  matched_preferences: z.array(z.string()),
  violations: z.array(
    z.object({
      preference: z.string(),
      ingredient: z.string(),
      reason: z.string(),
    })
  ),
  allergen_warnings: z.array(z.string()),
});

export const RawProductFactsSchema = z.object({
  product_name: z.string().default("Food Product"),
  brand: z.string().default("Brand"),
  panel_status: z.enum(["extracted", "unreadable", "missing"]).default("extracted"),
  unreadable_instructions: z.string().nullable().optional(),
  description: z.string().default("Food product label analysis."),
  ingredients: z.array(IngredientItemSchema).default([]),
  additives: z.array(AdditiveItemSchema).default([]),
  allergens_declared: z.array(z.string()).default([]),
  nutrition_facts: NutritionFactsSchema.default({ panel_status: "extracted" }),
  upf_score: z.number().min(1).max(4).default(3),
  upf_reason: z.string().optional(),
  glycemic_index_estimate: z.enum(["low", "medium", "high"]).default("medium"),
  glycemic_reason: z.string().optional(),
  recommendations: z.array(z.string()).default([]),
  alternatives_detailed: z.array(AlternativeItemSchema).default([]),
});

export const ComparisonResultSchema = z.object({
  winner: z.enum(["A", "B", "tie", "undetermined"]).default("tie"),
  winner_reason: z.string().default(""),
  product_a: z.object({
    name: z.string().default("Product A"),
    brand: z.string().default("Brand A"),
    panel_status: z.enum(["extracted", "unreadable", "missing"]).default("extracted"),
    ingredients: z.array(IngredientItemSchema).default([]),
    additives: z.array(AdditiveItemSchema).default([]),
    nutrition_facts: NutritionFactsSchema.optional(),
    upf_score: z.number().min(1).max(4).optional(),
    health_score: z.number().nullable().optional(),
    safety_level: z.enum(["safe", "moderate", "danger", "insufficient_evidence"]).default("safe"),
    highlights: z.array(z.string()).default([])
  }),
  product_b: z.object({
    name: z.string().default("Product B"),
    brand: z.string().default("Brand B"),
    panel_status: z.enum(["extracted", "unreadable", "missing"]).default("extracted"),
    ingredients: z.array(IngredientItemSchema).default([]),
    additives: z.array(AdditiveItemSchema).default([]),
    nutrition_facts: NutritionFactsSchema.optional(),
    upf_score: z.number().min(1).max(4).optional(),
    health_score: z.number().nullable().optional(),
    safety_level: z.enum(["safe", "moderate", "danger", "insufficient_evidence"]).default("safe"),
    highlights: z.array(z.string()).default([])
  }),
  comparison_table: z.object({
    calories: z.object({ a: z.string().nullable().optional(), b: z.string().nullable().optional() }).optional(),
    sugar: z.object({ a: z.string().nullable().optional(), b: z.string().nullable().optional() }).optional(),
    sodium: z.object({ a: z.string().nullable().optional(), b: z.string().nullable().optional() }).optional(),
    protein: z.object({ a: z.string().nullable().optional(), b: z.string().nullable().optional() }).optional(),
    fat: z.object({ a: z.string().nullable().optional(), b: z.string().nullable().optional() }).optional(),
    fiber: z.object({ a: z.string().nullable().optional(), b: z.string().nullable().optional() }).optional(),
    additives: z.object({ a: z.string().nullable().optional(), b: z.string().nullable().optional() }).optional(),
    basis: z.string().default("per 100g")
  }).optional(),
  verdict_english: z.string().default("")
});

export type RawProductFacts = z.infer<typeof RawProductFactsSchema>;
export type DietaryCompatibility = z.infer<typeof DietaryCompatibilitySchema>;
export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;

export interface IngredientAnalysis {
  id?: string;
  product_name: string;
  brand: string;
  health_score: number | null;
  health_score_reason: string;
  safety_level: "safe" | "moderate" | "danger" | "insufficient_evidence";
  description: string;
  panel_status?: "extracted" | "unreadable" | "missing";
  unreadable_instructions?: string | null;
  ingredients: Array<{
    name: string;
    status: "safe" | "caution" | "avoid";
    reason: string;
  }>;
  additives: Array<{
    name: string;
    code?: string | null;
    risk: "low" | "medium" | "high";
    description: string;
    source?: string | null;
  }>;
  allergens: string[];
  allergens_declared?: string[];
  nutrition_facts: z.infer<typeof NutritionFactsSchema>;
  recommendations: string[];
  alternatives_detailed?: Array<{
    name: string;
    brand: string;
    reason: string;
    estimated_price_inr?: number | null;
    buy_url_blinkit?: string | null;
    buy_url_bigbasket?: string | null;
  }>;
  upf_score?: number;
  upf_reason?: string;
  glycemic_index_estimate?: "low" | "medium" | "high";
  glycemic_reason?: string;
  dietary_compatibility?: DietaryCompatibility;
  image_url?: string;
  is_sample?: boolean;
}

const GLUTEN_GRAINS = [
  "wheat", "barley", "rye", "spelt", "kamut", "triticale", "semolina", 
  "durum", "maida", "atta", "farina", "graham", "malt extract", "malt syrup", "vital wheat gluten"
];

const GLUTEN_FREE_EXCLUSIONS = [
  "rice flour", "brown rice flour", "white rice flour", "almond flour", 
  "coconut flour", "tapioca flour", "tapioca starch", "corn flour", 
  "corn starch", "cornstarch", "besan", "gram flour", "potato starch", 
  "potato flour", "buckwheat", "chickpea flour", "oat flour (certified gluten-free)", 
  "gluten-free oat", "sorghum", "millet", "quinoa"
];

const DAIRY_ITEMS = [
  "butter", "dairy butter", "salted butter", "unsalted butter", "butter fat", "butterfat", "butter oil",
  "milk", "cow milk", "buffalo milk", "milk solids", "skimmed milk powder", "whole milk powder",
  "milk powder", "ghee", "clarified butter", "cream", "cheese", "paneer", "curd", "yogurt",
  "whey", "casein", "sodium caseinate", "calcium caseinate", "lactose", "condensed milk", "milk fat"
];

const DAIRY_FREE_EXCLUSIONS = [
  "cocoa butter", "cacao butter", "peanut butter", "almond butter", 
  "sunflower butter", "shea butter", "apple butter", "fruit butter", 
  "mango butter", "kokum butter", "coconut butter", "cashew butter",
  "soy butter", "seed butter"
];

const TREE_NUTS = [
  "almond", "walnut", "cashew", "hazelnut", "pecan", "pistachio", 
  "macadamia", "brazil nut", "pine nut", "chestnut"
];

const SEED_EXCLUSIONS = [
  "sunflower seed", "chia seed", "flax seed", "pumpkin seed", 
  "sesame seed", "tahini", "poppy seed", "hemp seed"
];

const JAIN_RESTRICTED_ROOTS = [
  "onion", "garlic", "potato", "carrot", "radish", "ginger", 
  "beetroot", "turnip", "sweet potato", "tapioca root", "yam", "shallot"
];

const ANIMAL_DERIVED_ITEMS = [
  "meat", "beef", "chicken", "pork", "lamb", "mutton", "fish", 
  "gelatin", "lard", "tallow", "carmine", "cochineal", "rennet", "egg", "egg yolk", "egg white"
];

const HIGH_GLYCEMIC_SWEETENERS = [
  "sugar", "cane sugar", "high fructose corn syrup", "corn syrup", 
  "glucose syrup", "maltodextrin", "dextrose", "sucrose", "invert sugar syrup"
];

/**
 * Splits a compound ingredient string into discrete clauses/tokens.
 */
function splitCompoundIngredients(rawName: string): string[] {
  if (!rawName) return [];
  // Split on commas, semicolons, brackets, parentheses, dots
  return rawName
    .split(/[,;()\[\]]/)
    .map(token => token.trim())
    .filter(token => token.length > 0);
}

/**
 * Cleans and validates a numeric nutrient measurement.
 * Rejects negative, non-finite, NaN, and malformed values (e.g. "1.2.3g"). Preserves true zeros.
 */
export function cleanNumericValue(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") {
    if (isNaN(val) || !isFinite(val) || val < 0) return null;
    return val;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.length === 0 || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") return null;
    if (/-\s*[\d.]/.test(trimmed)) return null; // Explicitly reject negative strings like "-20g"
    
    // Reject malformed strings with multiple decimal points (e.g. "1.2.3", "1.2.3g")
    if ((trimmed.match(/\./g) || []).length > 1) return null;

    // Match valid non-negative float or integer with optional unit
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:[a-zA-Z%]*)$/);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) return null;
      return parsed;
    }
  }
  return null;
}

/**
 * Extracts serving size in grams or milliliters from a string.
 * Supports "20g", "40 grams", "100ml", "1l", "1 liter", "1 bar (45g)", "1.5 oz", "8 fl oz", etc.
 * Strictly rejects negative values, malformed strings (e.g. "1.2.3g"), and ambiguous unitless sizes (e.g. "20").
 */
export function parseServingSizeGrams(servingSizeStr?: string | null): { grams: number | null; isLiquid: boolean; unit: string | null } {
  if (!servingSizeStr || typeof servingSizeStr !== "string") {
    return { grams: null, isLiquid: false, unit: null };
  }
  const str = servingSizeStr.trim().toLowerCase();

  // Reject negative quantities (e.g. "-20g", "-5ml")
  if (/-\s*[\d.]/.test(str)) {
    return { grams: null, isLiquid: false, unit: null };
  }

  // Reject malformed multiple decimal points (e.g. "1.2.3g")
  if ((str.match(/\./g) || []).length > 1) {
    return { grams: null, isLiquid: false, unit: null };
  }

  // 1. Milliliters (e.g. "100ml", "250 ml", "100 millilitres", "100 milliliters")
  const matchMl = str.match(/(\d+(?:\.\d+)?)\s*(?:ml|milliliters?|millilitres?)\b/i);
  if (matchMl) {
    const val = parseFloat(matchMl[1]);
    if (!isNaN(val) && isFinite(val) && val > 0) {
      return { grams: val, isLiquid: true, unit: "ml" };
    }
  }

  // 2. Liters (e.g. "1l", "1.5 l", "1 liter", "1 litre", "2 liters")
  const matchLiter = str.match(/(\d+(?:\.\d+)?)\s*(?:liters?|litres?|l)\b/i);
  if (matchLiter) {
    const val = parseFloat(matchLiter[1]);
    if (!isNaN(val) && isFinite(val) && val > 0) {
      return { grams: val * 1000, isLiquid: true, unit: "l" };
    }
  }

  // 3. Fluid Ounces (e.g. "8 fl oz", "8 fl. oz.", "8 floz")
  const matchFlOz = str.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*oz\.?|fluid\s+ounces?)\b/i);
  if (matchFlOz) {
    const val = parseFloat(matchFlOz[1]);
    if (!isNaN(val) && isFinite(val) && val > 0) {
      return { grams: val * 29.5735, isLiquid: true, unit: "fl oz" };
    }
  }

  // 4. Kilograms (e.g. "1kg", "1.5 kg")
  const matchKg = str.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)\b/i);
  if (matchKg) {
    const val = parseFloat(matchKg[1]);
    if (!isNaN(val) && isFinite(val) && val > 0) {
      return { grams: val * 1000, isLiquid: false, unit: "kg" };
    }
  }

  // 5. Grams (e.g. "20g", "20.5 g", "20 grams", "20 gm")
  const matchGrams = str.match(/(\d+(?:\.\d+)?)\s*(?:grams?|gm|g)\b/i);
  if (matchGrams) {
    const val = parseFloat(matchGrams[1]);
    if (!isNaN(val) && isFinite(val) && val > 0) {
      return { grams: val, isLiquid: false, unit: "g" };
    }
  }

  // 6. Ounces (e.g. "1.5 oz", "2 ounces")
  const matchOz = str.match(/(\d+(?:\.\d+)?)\s*(?:ounces?|oz)\b/i);
  if (matchOz) {
    const val = parseFloat(matchOz[1]);
    if (!isNaN(val) && isFinite(val) && val > 0) {
      return { grams: val * 28.3495, isLiquid: false, unit: "oz" };
    }
  }

  // Standalone numbers without units MUST be rejected (e.g. "20" cannot be assumed to be grams)
  return { grams: null, isLiquid: false, unit: null };
}

export interface Normalized100gNutrients {
  calories_100g: number | null;
  fat_100g: number | null;
  saturated_fat_100g: number | null;
  trans_fat_100g: number | null;
  cholesterol_100g: number | null;
  sodium_100g: number | null;
  carbs_100g: number | null;
  fiber_100g: number | null;
  sugar_100g: number | null;
  protein_100g: number | null;
  basis: "per_100g" | "per_100ml" | "normalized_from_serving" | "unavailable";
  serving_size_g: number | null;
  is_liquid: boolean;
  valid_nutrient_count: number;
}

/**
 * Explicit nutrient normalization function.
 * Normalizes EACH nutrient independently:
 * - If a nutrient has a valid direct per_100g value, it is preserved.
 * - If a nutrient is missing in per_100g but present in per_serving AND a valid serving mass/volume is known, it scales it.
 * - If normalization is impossible, that specific nutrient is null.
 * - Per-100g thresholds are never silently applied to per-serving numbers.
 * - Never infers nutrition table basis solely from serving text (e.g. 100g table remains per_100g even if serving is 250ml).
 */
export function normalizeNutrientsTo100g(nf?: any): Normalized100gNutrients {
  const emptyResult: Normalized100gNutrients = {
    calories_100g: null,
    fat_100g: null,
    saturated_fat_100g: null,
    trans_fat_100g: null,
    cholesterol_100g: null,
    sodium_100g: null,
    carbs_100g: null,
    fiber_100g: null,
    sugar_100g: null,
    protein_100g: null,
    basis: "unavailable",
    serving_size_g: null,
    is_liquid: false,
    valid_nutrient_count: 0
  };

  if (!nf) return emptyResult;

  const p100 = nf.per_100g || {};
  const ps = nf.per_serving || {};
  const rawServingSize = nf.serving_size || nf.serving_size_text || (nf.serving_size_g ? `${nf.serving_size_g}g` : null) || (nf.serving_size_ml ? `${nf.serving_size_ml}ml` : null);
  const servingInfo = parseServingSizeGrams(rawServingSize);
  const servingSizeGrams = servingInfo.grams ?? (typeof nf.serving_size_g === "number" && nf.serving_size_g > 0 ? nf.serving_size_g : null);
  
  // Distinguish nutrition table basis from serving size units
  const isExplicit100ml = nf.basis === "per_100ml" || !!nf.per_100ml;
  const isExplicit100g = nf.basis === "per_100g" || !!nf.per_100g;
  const isLiquid = isExplicit100ml ? true : (isExplicit100g ? false : servingInfo.isLiquid);

  const scaleFactor = (servingSizeGrams && servingSizeGrams > 0) ? (100 / servingSizeGrams) : null;

  // Helper to normalize a single nutrient independently
  const normalizeSingleNutrient = (
    p100Vals: any[],
    psVals: any[],
    flatVals: any[]
  ): { value: number | null; fromDirect: boolean } => {
    // 1. Direct per 100g/100ml check
    for (const v of p100Vals) {
      const clean = cleanNumericValue(v);
      if (clean !== null) return { value: clean, fromDirect: true };
    }

    // If flat vals are explicitly labeled as 100g/100ml basis
    if (nf.basis === "per_100g" || nf.basis === "per_100ml") {
      for (const v of flatVals) {
        const clean = cleanNumericValue(v);
        if (clean !== null) return { value: clean, fromDirect: true };
      }
    }

    // 2. Scaled from per-serving
    if (scaleFactor !== null) {
      for (const v of psVals) {
        const clean = cleanNumericValue(v);
        if (clean !== null) return { value: clean * scaleFactor, fromDirect: false };
      }
      if (nf.basis === "per_serving" || !nf.basis) {
        for (const v of flatVals) {
          const clean = cleanNumericValue(v);
          if (clean !== null) return { value: clean * scaleFactor, fromDirect: false };
        }
      }
    }

    return { value: null, fromDirect: false };
  };

  const normCalories = normalizeSingleNutrient(
    [p100.calories, nf.calories_100g],
    [ps.calories],
    [nf.calories]
  );
  const normFat = normalizeSingleNutrient(
    [p100.fat_g, nf.fat_100g],
    [ps.fat_g],
    [nf.fat_g, nf.fat]
  );
  const normSatFat = normalizeSingleNutrient(
    [p100.saturated_fat_g, nf.saturated_fat_100g],
    [ps.saturated_fat_g],
    [nf.saturated_fat_g, nf.saturated_fat]
  );
  const normTransFat = normalizeSingleNutrient(
    [p100.trans_fat_g, nf.trans_fat_100g],
    [ps.trans_fat_g],
    [nf.trans_fat_g, nf.trans_fat]
  );
  const normCholesterol = normalizeSingleNutrient(
    [p100.cholesterol_mg, nf.cholesterol_100g],
    [ps.cholesterol_mg],
    [nf.cholesterol_mg, nf.cholesterol]
  );
  const normSodium = normalizeSingleNutrient(
    [p100.sodium_mg, nf.sodium_100g],
    [ps.sodium_mg],
    [nf.sodium_mg, nf.sodium]
  );
  const normCarbs = normalizeSingleNutrient(
    [p100.carbs_g, nf.carbs_100g],
    [ps.carbs_g],
    [nf.carbs_g, nf.carbs]
  );
  const normFiber = normalizeSingleNutrient(
    [p100.fiber_g, nf.fiber_100g],
    [ps.fiber_g],
    [nf.fiber_g, nf.fiber]
  );
  const normSugar = normalizeSingleNutrient(
    [p100.sugar_g, nf.sugar_100g],
    [ps.sugar_g],
    [nf.sugar_g, nf.sugar]
  );
  const normProtein = normalizeSingleNutrient(
    [p100.protein_g, nf.protein_100g],
    [ps.protein_g],
    [nf.protein_g, nf.protein]
  );

  const nutrientList = [normCalories, normFat, normSatFat, normTransFat, normCholesterol, normSodium, normCarbs, normFiber, normSugar, normProtein];
  const validCount = nutrientList.filter(n => n.value !== null).length;

  if (validCount === 0) {
    return emptyResult;
  }

  const hasDirect = nutrientList.some(n => n.fromDirect && n.value !== null);
  let basis: "per_100g" | "per_100ml" | "normalized_from_serving" = "normalized_from_serving";
  if (isExplicit100ml) {
    basis = "per_100ml";
  } else if (isExplicit100g || hasDirect) {
    basis = "per_100g";
  } else {
    basis = "normalized_from_serving";
  }

  return {
    calories_100g: normCalories.value,
    fat_100g: normFat.value,
    saturated_fat_100g: normSatFat.value,
    trans_fat_100g: normTransFat.value,
    cholesterol_100g: normCholesterol.value,
    sodium_100g: normSodium.value,
    carbs_100g: normCarbs.value,
    fiber_100g: normFiber.value,
    sugar_100g: normSugar.value,
    protein_100g: normProtein.value,
    basis,
    serving_size_g: servingSizeGrams,
    is_liquid: isLiquid,
    valid_nutrient_count: validCount
  };
}

/**
 * Checks whether valid, non-negative numeric nutritional measurements are present.
 */
export function hasValidNumericNutrients(nf?: any): boolean {
  if (!nf) return false;
  const normalized = normalizeNutrientsTo100g(nf);
  if (normalized.valid_nutrient_count > 0) return true;

  const ps = nf.per_serving || {};
  const psVals = [ps.calories, ps.fat_g, ps.saturated_fat_g, ps.trans_fat_g, ps.cholesterol_mg, ps.sodium_mg, ps.carbs_g, ps.fiber_g, ps.sugar_g, ps.added_sugar_g, ps.protein_g, nf.calories, nf.fat, nf.sugar, nf.sodium];
  for (const v of psVals) {
    if (cleanNumericValue(v) !== null) return true;
  }
  return false;
}

/**
 * Calculates evidence-based health score strictly from verified, normalized data.
 * If evidence is insufficient (unreadable/missing panel, or missing ingredients AND nutrients),
 * it returns null score with safetyLevel: 'insufficient_evidence'.
 */
export function calculateHealthScore(facts: Partial<RawProductFacts>): { 
  score: number | null; 
  reason: string; 
  safetyLevel: "safe" | "moderate" | "danger" | "insufficient_evidence" 
} {
  const panelStatus = facts.panel_status || facts.nutrition_facts?.panel_status;
  const ingredients = facts.ingredients || [];
  const nf = facts.nutrition_facts;

  const normalized = normalizeNutrientsTo100g(nf);
  const hasIngredients = ingredients.length > 0;
  const hasSubstantialNutrients = normalized.valid_nutrient_count >= 2;

  // Minimum evidence rule:
  // Requires readable panel AND at least 2 normalized nutrients (or ingredients + at least 1 normalized nutrient)
  if (
    panelStatus === "unreadable" || 
    panelStatus === "missing" || 
    (!hasSubstantialNutrients && !(hasIngredients && normalized.valid_nutrient_count >= 1))
  ) {
    return {
      score: null,
      reason: "Insufficient readable evidence on product label. Please take a clear, well-lit photo of the ingredient list and nutrition table.",
      safetyLevel: "insufficient_evidence"
    };
  }

  let score = 100;
  const penalties: string[] = [];
  const bonuses: string[] = [];

  // UPF penalty only if explicitly extracted / verified
  if (facts.upf_score === 4) {
    score -= 25;
    penalties.push("ultra-processed NOVA 4 formulation");
  } else if (facts.upf_score === 3) {
    score -= 10;
    penalties.push("processed matrix (NOVA 3)");
  }

  const additives = facts.additives || [];
  let highRiskAdditives = 0;
  let medRiskAdditives = 0;
  additives.forEach(add => {
    if (add.risk === "high") {
      score -= 12;
      highRiskAdditives++;
    } else if (add.risk === "medium") {
      score -= 5;
      medRiskAdditives++;
    }
  });
  if (highRiskAdditives > 0) penalties.push(`${highRiskAdditives} high-risk additive(s)`);
  if (medRiskAdditives > 0) penalties.push(`${medRiskAdditives} moderate-risk additive(s)`);

  const avoidCount = ingredients.filter(i => i.status === "avoid").length;
  if (avoidCount > 0) {
    score -= Math.min(25, avoidCount * 6);
    penalties.push(`${avoidCount} restricted ingredient(s)`);
  }

  const trans100g = normalized.trans_fat_100g;
  const sugar100g = normalized.sugar_100g;
  const sodium100g = normalized.sodium_100g;
  const satFat100g = normalized.saturated_fat_100g;
  const fiber100g = normalized.fiber_100g;
  const protein100g = normalized.protein_100g;
  const isLiquid = normalized.is_liquid;

  if (trans100g !== null && trans100g > 0.1) {
    score -= 20;
    penalties.push("trans fats detected");
  }

  if (sugar100g !== null) {
    const highSugarThreshold = isLiquid ? 8 : 15;
    const medSugarThreshold = isLiquid ? 4 : 8;
    if (sugar100g > highSugarThreshold) {
      score -= 15;
      penalties.push(`high sugar (${sugar100g.toFixed(1)}g/100${isLiquid ? "ml" : "g"})`);
    } else if (sugar100g > medSugarThreshold) {
      score -= 6;
    }
  }

  if (sodium100g !== null) {
    const highSodiumThreshold = isLiquid ? 300 : 600;
    if (sodium100g > highSodiumThreshold) {
      score -= 12;
      penalties.push(`high sodium (${Math.round(sodium100g)}mg/100${isLiquid ? "ml" : "g"})`);
    }
  }

  if (satFat100g !== null && satFat100g > 5) {
    score -= 8;
    penalties.push("elevated saturated fat");
  }

  if (fiber100g !== null && fiber100g >= 3) {
    score = Math.min(100, score + 5);
    bonuses.push("beneficial fiber");
  }
  if (protein100g !== null && protein100g >= 10) {
    score = Math.min(100, score + 5);
    bonuses.push("good protein");
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  let safetyLevel: "safe" | "moderate" | "danger" = "safe";
  if (finalScore < 40 || highRiskAdditives > 0 || (trans100g !== null && trans100g > 0.5)) {
    safetyLevel = "danger";
  } else if (finalScore < 70) {
    safetyLevel = "moderate";
  }

  let reason = "";
  if (penalties.length > 0) {
    reason = `ScanSafe nutritional heuristic based on ${penalties.slice(0, 3).join(", ")}.`;
  } else {
    reason = "Formulated with clean, minimally processed ingredients and a balanced nutrition profile.";
  }

  return { score: finalScore, reason, safetyLevel };
}

/**
 * Evaluates dietary compatibility and personal allergen alerts independently from the base score.
 * Tokenizes compound ingredients to ensure exceptions like 'rice flour' or 'cocoa butter'
 * only apply to their specific token without suppressing adjacent tokens (e.g. 'wheat flour', 'milk powder').
 */
export function applyPreferences(
  product: IngredientAnalysis,
  userPreferences: string[] = []
): IngredientAnalysis {
  const cloned: IngredientAnalysis = JSON.parse(JSON.stringify(product));

  if (!userPreferences || userPreferences.length === 0) {
    cloned.dietary_compatibility = {
      is_compatible: true,
      status: "compatible",
      matched_preferences: [],
      violations: [],
      allergen_warnings: [],
    };
    return cloned;
  }

  const declaredAllergensList = cloned.allergens_declared || cloned.allergens || [];
  if (cloned.ingredients.length === 0 && declaredAllergensList.length === 0) {
    cloned.dietary_compatibility = {
      is_compatible: false,
      status: "insufficient_data",
      matched_preferences: userPreferences,
      violations: [],
      allergen_warnings: ["Insufficient ingredient or allergen data on packaging to verify dietary compatibility."],
    };
    return cloned;
  }

  const violations: Array<{ preference: string; ingredient: string; reason: string }> = [];
  const allergenWarnings: string[] = [];
  const normalizedPrefs = userPreferences.map(p => p.toLowerCase().trim());

  // Check discrete ingredient tokens
  cloned.ingredients = cloned.ingredients.map(ing => {
    const rawName = ing.name;
    let status = ing.status;
    let reason = ing.reason;
    const tokens = splitCompoundIngredients(rawName);

    const matchesSpecificToken = (tokenList: string[], searchTerms: string[], exclusions: string[]): { matched: boolean; matchedTerm?: string; offendingToken?: string } => {
      for (const token of tokenList) {
        const tokenLower = token.toLowerCase();
        const isExcluded = exclusions.some(ex => tokenLower.includes(ex));
        if (isExcluded) continue;

        for (const term of searchTerms) {
          const regex = new RegExp(`\\b${term}\\b`, "i");
          if (regex.test(tokenLower) || tokenLower.includes(term)) {
            return { matched: true, matchedTerm: term, offendingToken: token };
          }
        }
      }
      return { matched: false };
    };

    // 1. Gluten-Free Check
    if (normalizedPrefs.some(p => p.includes("gluten") || p === "celiac")) {
      const match = matchesSpecificToken(tokens, GLUTEN_GRAINS, GLUTEN_FREE_EXCLUSIONS);
      if (match.matched) {
        violations.push({
          preference: "Gluten-Free",
          ingredient: rawName,
          reason: `${match.offendingToken || rawName} contains gluten grains.`,
        });
        status = "avoid";
        reason = `${rawName} contains gluten (${match.offendingToken || match.matchedTerm}), violating your Gluten-Free preference.`;
      }
    }

    // 2. Dairy-Free / Milk Allergy Check
    if (normalizedPrefs.some(p => p.includes("dairy") || p.includes("milk"))) {
      const match = matchesSpecificToken(tokens, DAIRY_ITEMS, DAIRY_FREE_EXCLUSIONS);
      if (match.matched) {
        violations.push({
          preference: "Dairy-Free / Milk Allergy",
          ingredient: rawName,
          reason: `${match.offendingToken || rawName} contains dairy or milk protein.`,
        });
        status = "avoid";
        reason = `${rawName} contains dairy (${match.offendingToken || match.matchedTerm}), violating your Dairy-Free profile.`;
      }
    }

    // 3. Lactose Intolerance Check
    if (normalizedPrefs.some(p => p.includes("lactose"))) {
      const isLactoseFreeDeclared = rawName.toLowerCase().includes("lactose-free") || rawName.toLowerCase().includes("lactase");
      if (!isLactoseFreeDeclared) {
        const match = matchesSpecificToken(tokens, ["milk", "whey", "lactose", "cream", "curd", "paneer", "dairy"], DAIRY_FREE_EXCLUSIONS);
        if (match.matched) {
          violations.push({
            preference: "Lactose Intolerant",
            ingredient: rawName,
            reason: `${match.offendingToken || rawName} contains lactose.`,
          });
          status = "avoid";
          reason = `${rawName} contains lactose, which may cause digestive discomfort.`;
        }
      }
    }

    // 4. Nut Allergy Check
    if (normalizedPrefs.some(p => p.includes("nut"))) {
      const hasPeanut = matchesSpecificToken(tokens, ["peanut", "groundnut"], []);
      const hasTreeNut = matchesSpecificToken(tokens, TREE_NUTS, SEED_EXCLUSIONS);
      if (hasPeanut.matched || hasTreeNut.matched) {
        const off = hasPeanut.offendingToken || hasTreeNut.offendingToken || rawName;
        violations.push({
          preference: "Nut-Free",
          ingredient: rawName,
          reason: `${off} contains peanuts or tree nuts.`,
        });
        status = "avoid";
        reason = `${rawName} contains nuts, violating your Nut-Free allergy profile.`;
      }
    }

    // 5. Vegan Check
    if (normalizedPrefs.includes("vegan")) {
      const animalMatch = matchesSpecificToken(tokens, ANIMAL_DERIVED_ITEMS, []);
      const dairyMatch = matchesSpecificToken(tokens, DAIRY_ITEMS, DAIRY_FREE_EXCLUSIONS);
      const honeyMatch = matchesSpecificToken(tokens, ["honey", "beeswax"], []);
      if (animalMatch.matched || dairyMatch.matched || honeyMatch.matched) {
        violations.push({
          preference: "Vegan",
          ingredient: rawName,
          reason: `${rawName} is an animal-derived product.`,
        });
        status = "avoid";
        reason = `${rawName} is animal-derived, violating your Vegan preference.`;
      }
    }

    // 6. Vegetarian Check
    if (normalizedPrefs.includes("vegetarian")) {
      const animalMatch = matchesSpecificToken(tokens, ANIMAL_DERIVED_ITEMS, []);
      if (animalMatch.matched) {
        violations.push({
          preference: "Vegetarian",
          ingredient: rawName,
          reason: `${rawName} contains meat or animal byproducts.`,
        });
        status = "avoid";
        reason = `${rawName} contains non-vegetarian ingredients.`;
      }
    }

    // 7. Jain Check
    if (normalizedPrefs.includes("jain")) {
      const rootMatch = matchesSpecificToken(tokens, JAIN_RESTRICTED_ROOTS, []);
      const animalMatch = matchesSpecificToken(tokens, ANIMAL_DERIVED_ITEMS, []);
      if (rootMatch.matched || animalMatch.matched) {
        violations.push({
          preference: "Jain",
          ingredient: rawName,
          reason: `${rawName} is restricted in Jain dietary practice.`,
        });
        status = "avoid";
        reason = `${rawName} is restricted in Jain dietary rules.`;
      }
    }

    // 8. Diabetic / Low Sugar Check
    if (normalizedPrefs.some(p => p.includes("diabet") || p.includes("sugar"))) {
      const sugarMatch = matchesSpecificToken(tokens, HIGH_GLYCEMIC_SWEETENERS, []);
      if (sugarMatch.matched) {
        violations.push({
          preference: "Diabetic / Low Sugar",
          ingredient: rawName,
          reason: `${rawName} is a high glycemic sweetener.`,
        });
        status = "avoid";
        reason = `${rawName} is a high-glycemic added sugar.`;
      }
    }

    // 9. Hypertension / Low Sodium Check
    if (normalizedPrefs.some(p => p.includes("hypertens") || p.includes("salt") || p.includes("blood pressure"))) {
      const saltMatch = matchesSpecificToken(tokens, ["salt", "sodium", "msg", "monosodium glutamate"], []);
      if (saltMatch.matched) {
        violations.push({
          preference: "Hypertension / Low Sodium",
          ingredient: rawName,
          reason: `${rawName} contributes to elevated sodium intake.`,
        });
        if (ing.status === "safe") status = "caution";
      }
    }

    return { ...ing, status, reason };
  });

  // Check Declared & Precautionary Allergen Statements
  const declared = cloned.allergens_declared || cloned.allergens || [];
  let hasPrecautionaryWarning = false;

  declared.forEach(all => {
    const allLower = all.toLowerCase();
    const isPrecautionary = allLower.includes("may contain") || allLower.includes("processed in a facility") || allLower.includes("trace");

    // Gluten checks
    if (normalizedPrefs.some(p => p.includes("gluten") || p === "celiac")) {
      if (allLower.includes("gluten") || allLower.includes("wheat") || allLower.includes("barley") || allLower.includes("rye")) {
        allergenWarnings.push(isPrecautionary ? `Precautionary: ${all}` : `Declared Allergen: ${all}`);
        if (isPrecautionary) hasPrecautionaryWarning = true;
      }
    }

    // Dairy checks
    if (normalizedPrefs.some(p => p.includes("dairy") || p.includes("milk"))) {
      if (allLower.includes("milk") || allLower.includes("dairy") || allLower.includes("butter") || allLower.includes("cheese")) {
        allergenWarnings.push(isPrecautionary ? `Precautionary: ${all}` : `Declared Allergen: ${all}`);
        if (isPrecautionary) hasPrecautionaryWarning = true;
      }
    }

    // Nut checks
    if (normalizedPrefs.some(p => p.includes("nut"))) {
      if (allLower.includes("nut") || allLower.includes("peanut") || allLower.includes("almond") || allLower.includes("cashew")) {
        allergenWarnings.push(isPrecautionary ? `Precautionary: ${all}` : `Declared Allergen: ${all}`);
        if (isPrecautionary) hasPrecautionaryWarning = true;
      }
    }
  });

  const uniqueWarnings = Array.from(new Set(allergenWarnings));
  const isCompatible = violations.length === 0 && uniqueWarnings.length === 0;

  let compatibilityStatus: "compatible" | "incompatible" | "precautionary_warning" | "insufficient_data" = "compatible";
  if (violations.length > 0 || uniqueWarnings.some(w => w.startsWith("Declared Allergen:"))) {
    compatibilityStatus = "incompatible";
  } else if (hasPrecautionaryWarning || uniqueWarnings.length > 0) {
    compatibilityStatus = "precautionary_warning";
  }

  cloned.dietary_compatibility = {
    is_compatible: isCompatible,
    status: compatibilityStatus,
    matched_preferences: userPreferences,
    violations,
    allergen_warnings: uniqueWarnings,
  };

  return cloned;
}

export const SAMPLE_PRODUCTS: Record<string, IngredientAnalysis> = {
  sample_oats: {
    product_name: "Quaker Rolled Oats 100% Whole Grain",
    brand: "Quaker",
    health_score: 95,
    health_score_reason: "Single ingredient 100% whole grain oat groats. High beta-glucan soluble fiber with zero added sugars or preservatives.",
    safety_level: "safe",
    description: "Quaker Rolled Oats are 100% whole grain oats with no added sugar, artificial preservatives, or synthetic additives. Excellent source of beta-glucan soluble fiber.",
    panel_status: "extracted",
    ingredients: [
      { name: "100% Whole Grain Rolled Oats", status: "safe", reason: "Nutritious, fiber-rich, unrefined whole grains." }
    ],
    additives: [],
    allergens: ["May contain trace wheat"],
    allergens_declared: ["May contain trace wheat"],
    nutrition_facts: {
      panel_status: "extracted",
      serving_size: "40g",
      per_serving: {
        calories: 150,
        fat_g: 3,
        saturated_fat_g: 0.5,
        trans_fat_g: 0,
        cholesterol_mg: 0,
        sodium_mg: 0,
        carbs_g: 27,
        fiber_g: 4,
        sugar_g: 1,
        added_sugar_g: 0,
        protein_g: 5
      },
      per_100g: {
        calories: 375,
        fat_g: 7.5,
        saturated_fat_g: 1.25,
        trans_fat_g: 0,
        cholesterol_mg: 0,
        sodium_mg: 0,
        carbs_g: 67.5,
        fiber_g: 10,
        sugar_g: 2.5,
        added_sugar_g: 0,
        protein_g: 12.5
      },
      calories: 150,
      calories_100g: 375,
      fat: "3g",
      fat_100g: "7.5g",
      saturated_fat: "0.5g",
      saturated_fat_100g: "1.25g",
      trans_fat: "0g",
      trans_fat_100g: "0g",
      cholesterol: "0mg",
      cholesterol_100g: "0mg",
      sodium: "0mg",
      sodium_100g: "0mg",
      carbs: "27g",
      carbs_100g: "67.5g",
      fiber: "4g",
      fiber_100g: "10g",
      sugar: "1g",
      sugar_100g: "2.5g",
      protein: "5g",
      protein_100g: "12.5g"
    },
    recommendations: ["Pair with fresh chia seeds, raw walnuts, and blueberries"],
    alternatives_detailed: [],
    upf_score: 1,
    upf_reason: "NOVA Group 1 - Unprocessed or minimally processed whole grain.",
    glycemic_index_estimate: "low",
    glycemic_reason: "Intact soluble fiber slows carbohydrate digestion.",
    is_sample: true
  },
  sample_cookies: {
    product_name: "Lotte Choco Pie",
    brand: "Lotte",
    health_score: 24,
    health_score_reason: "Severely penalized due to ultra-processed formulation, high added sugars (40g/100g), and hydrogenated vegetable fats.",
    safety_level: "danger",
    description: "Lotte Choco Pie is an ultra-processed sweet confectionery snack consisting of cake, marshmallow filling, and a compound chocolate coating with high refined sugars and synthetic additives.",
    panel_status: "extracted",
    ingredients: [
      { name: "Sugar", status: "avoid", reason: "Refined sugar contributing to rapid glycemic spikes." },
      { name: "Wheat Flour (Maida)", status: "caution", reason: "Refined wheat flour stripped of fiber and nutrients." },
      { name: "Corn Syrup", status: "avoid", reason: "High glycemic liquid corn sweetener." },
      { name: "Hydrogenated Vegetable Fat (Palm Kernel Oil)", status: "avoid", reason: "Contains saturated and trans fatty acid structures linked to cardiovascular risk." },
      { name: "Cocoa Powder", status: "safe", reason: "Natural cocoa solids for chocolate flavor." },
      { name: "Milk Solids", status: "safe", reason: "Standard dairy ingredient." }
    ],
    additives: [
      { name: "Soy Lecithin", code: "E322", risk: "low", description: "Natural emulsifier extracted from soy.", source: "EFSA" },
      { name: "Sodium Bicarbonate", code: "E500", risk: "low", description: "Baking soda leavening agent.", source: "FDA GRAS" },
      { name: "Sorbitan Monostearate", code: "E491", risk: "medium", description: "Synthetic emulsifier. Excessive consumption may cause mild digestive discomfort.", source: "EFSA Food Additives Panel" }
    ],
    allergens: ["Gluten", "Wheat", "Milk", "Soy"],
    allergens_declared: ["Gluten", "Wheat", "Milk", "Soy"],
    nutrition_facts: {
      panel_status: "extracted",
      serving_size: "30g",
      per_serving: {
        calories: 130,
        fat_g: 5,
        saturated_fat_g: 3.5,
        trans_fat_g: 0.1,
        cholesterol_mg: 0,
        sodium_mg: 55,
        carbs_g: 20,
        fiber_g: 0.5,
        sugar_g: 12,
        added_sugar_g: 11,
        protein_g: 1
      },
      per_100g: {
        calories: 433,
        fat_g: 16.7,
        saturated_fat_g: 11.7,
        trans_fat_g: 0.3,
        cholesterol_mg: 0,
        sodium_mg: 183,
        carbs_g: 66.7,
        fiber_g: 1.7,
        sugar_g: 40,
        added_sugar_g: 36.7,
        protein_g: 3.3
      },
      calories: 130,
      calories_100g: 433,
      fat: "5g",
      fat_100g: "16.7g",
      saturated_fat: "3.5g",
      saturated_fat_100g: "11.7g",
      trans_fat: "0.1g",
      trans_fat_100g: "0.3g",
      cholesterol: "0mg",
      cholesterol_100g: "0mg",
      sodium: "55mg",
      sodium_100g: "183mg",
      carbs: "20g",
      carbs_100g: "66.7g",
      fiber: "0.5g",
      fiber_100g: "1.7g",
      sugar: "12g",
      sugar_100g: "40g",
      protein: "1g",
      protein_100g: "3.3g"
    },
    recommendations: [
      "Amul 70% Dark Chocolate with almonds",
      "Organic Whole Cacao Dates"
    ],
    alternatives_detailed: [
      {
        name: "Dark Chocolate (70%+ Cacao)",
        brand: "Amul",
        reason: "Rich in antioxidants, lower added sugar, no hydrogenated fats.",
        estimated_price_inr: 120,
        buy_url_blinkit: "https://blinkit.com/s/?q=amul+dark+chocolate+70",
        buy_url_bigbasket: "https://www.bigbasket.com/ps/?q=amul+dark+chocolate+70"
      }
    ],
    upf_score: 4,
    upf_reason: "NOVA Group 4 - Ultra-processed confectionery with hydrogenated fats and artificial emulsifiers.",
    glycemic_index_estimate: "high",
    glycemic_reason: "High concentration of refined sugars and syrups causes immediate blood glucose surge.",
    is_sample: true
  }
};

async function analyzeLabelWithGemini(
  base64Image: string,
  userPreferences: string[] = [],
  preferredLanguage: string = "en"
): Promise<IngredientAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables.");
  }

  let mediaType = "image/jpeg";
  let base64Data = base64Image;

  if (base64Image.startsWith("data:")) {
    const match = base64Image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mediaType = match[1];
      base64Data = match[2];
    }
  }

  const langPrompt = preferredLanguage && preferredLanguage !== "en"
    ? "\nCRITICAL LANGUAGE REQUIREMENT: All user-facing explanations and rationale text fields in the output JSON (health_score_reason, description, ingredients reasons, additives descriptions, recommendations, alternatives reasons, upf_reason, glycemic_reason, unreadable_instructions) MUST be written in the language: " + preferredLanguage + ". Write clear, natural conversational sentences."
    : "";

  const systemPrompt = "You are ScanSafe EVIDENCE-BASED FOOD OCR, a rigorous food intelligence auditor and food scientist.\n" +
"Analyze the provided product image strictly following EVIDENCE-BASED rules:\n" +
"1. ONLY extract information that is clearly visible in the image.\n" +
"2. If the nutrition facts panel or ingredients list is blurred, cropped, obscured, or missing:\n" +
"   - Set panel_status to unreadable or missing.\n" +
"   - DO NOT hallucinate, guess, or invent numbers or ingredients.\n" +
"   - In unreadable_instructions, provide camera guidance.\n" +
"3. Always distinguish between per-serving and per-100g values if both are printed.\n" +
"4. NOVA classification (1 to 4): 1-unprocessed, 2-culinary, 3-processed, 4-ultraprocessed.\n" +
"5. DO NOT include fake microplastics, heavy metals, organ damage triage, or carbon footprints.\n\n" +
"Return a single JSON object matching:\n" +
JSON.stringify({
  product_name: "Product Name from packaging (or Unknown Product)",
  brand: "Brand Name from packaging (or Unknown Brand)",
  panel_status: "extracted",
  unreadable_instructions: "Camera instructions if unreadable",
  description: "Factual 2-3 sentence overview",
  ingredients: [{ name: "ingredient", status: "safe", reason: "reason" }],
  additives: [{ name: "additive", code: "code", risk: "low", description: "desc", source: "citation" }],
  allergens_declared: ["Gluten"],
  nutrition_facts: {
    panel_status: "extracted",
    serving_size: "30g",
    per_serving: { calories: 100, fat_g: 2, saturated_fat_g: 0.5, trans_fat_g: 0, cholesterol_mg: 0, sodium_mg: 50, carbs_g: 15, fiber_g: 1, sugar_g: 5, added_sugar_g: 4, protein_g: 2 },
    per_100g: { calories: 333, fat_g: 6.7, saturated_fat_g: 1.7, trans_fat_g: 0, cholesterol_mg: 0, sodium_mg: 167, carbs_g: 50, fiber_g: 3.3, sugar_g: 16.7, added_sugar_g: 13.3, protein_g: 6.7 }
  },
  upf_score: 3,
  upf_reason: "NOVA rating explanation",
  glycemic_index_estimate: "medium",
  glycemic_reason: "Glycemic load rationale",
  recommendations: ["Healthy alternative ideas"],
  alternatives_detailed: [{ name: "Alternative Name", brand: "Brand", reason: "Why better", estimated_price_inr: 100, buy_url_blinkit: "url", buy_url_bigbasket: "url" }]
}, null, 2) + "\n\nReturn ONLY raw JSON string.";

  let response;
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount <= maxRetries) {
    try {
      response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
        {
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              parts: [
                { inlineData: { mimeType: mediaType, data: base64Data } },
                { text: "Extract and analyze the food product facts from this label image." + langPrompt }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        },
        {
          headers: { "content-type": "application/json" },
          httpsAgent: keepAliveAgent
        }
      );
      break;
    } catch (err: any) {
      retryCount++;
      if (retryCount > maxRetries) throw err;
      console.warn("Gemini API attempt " + retryCount + " failed. Retrying... Error: " + err.message);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

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

  let parsedRaw: any;
  try {
    parsedRaw = JSON.parse(cleanedText.trim());
  } catch (parseErr) {
    throw new Error("Failed to parse AI response as valid JSON.");
  }

  // Runtime Zod Schema Validation (strictly fail-closed)
  const validatedFacts = RawProductFactsSchema.safeParse(parsedRaw);
  if (!validatedFacts.success) {
    throw new Error(`AI generated invalid product facts schema: ${validatedFacts.error.message}`);
  }
  const rawJson = validatedFacts.data;

  const nf = rawJson.nutrition_facts || { panel_status: rawJson.panel_status || "extracted" };
  const ps = nf.per_serving || {};
  const p100 = nf.per_100g || {};

  // Preserve null / unknown values - do NOT convert to "0g" or "nullg"
  nf.calories = ps.calories !== undefined ? ps.calories : (nf.calories ?? null);
  nf.calories_100g = p100.calories !== undefined ? p100.calories : (nf.calories_100g ?? null);
  nf.fat = ps.fat_g != null ? `${ps.fat_g}g` : (nf.fat ?? null);
  nf.fat_100g = p100.fat_g != null ? `${p100.fat_g}g` : (nf.fat_100g ?? null);
  nf.saturated_fat = ps.saturated_fat_g != null ? `${ps.saturated_fat_g}g` : (nf.saturated_fat ?? null);
  nf.saturated_fat_100g = p100.saturated_fat_g != null ? `${p100.saturated_fat_g}g` : (nf.saturated_fat_100g ?? null);
  nf.trans_fat = ps.trans_fat_g != null ? `${ps.trans_fat_g}g` : (nf.trans_fat ?? null);
  nf.trans_fat_100g = p100.trans_fat_g != null ? `${p100.trans_fat_g}g` : (nf.trans_fat_100g ?? null);
  nf.cholesterol = ps.cholesterol_mg != null ? `${ps.cholesterol_mg}mg` : (nf.cholesterol ?? null);
  nf.cholesterol_100g = p100.cholesterol_mg != null ? `${p100.cholesterol_mg}mg` : (nf.cholesterol_100g ?? null);
  nf.sodium = ps.sodium_mg != null ? `${ps.sodium_mg}mg` : (nf.sodium ?? null);
  nf.sodium_100g = p100.sodium_mg != null ? `${p100.sodium_mg}mg` : (nf.sodium_100g ?? null);
  nf.carbs = ps.carbs_g != null ? `${ps.carbs_g}g` : (nf.carbs ?? null);
  nf.carbs_100g = p100.carbs_g != null ? `${p100.carbs_g}g` : (nf.carbs_100g ?? null);
  nf.fiber = ps.fiber_g != null ? `${ps.fiber_g}g` : (nf.fiber ?? null);
  nf.fiber_100g = p100.fiber_g != null ? `${p100.fiber_g}g` : (nf.fiber_100g ?? null);
  nf.sugar = ps.sugar_g != null ? `${ps.sugar_g}g` : (nf.sugar ?? null);
  nf.sugar_100g = p100.sugar_g != null ? `${p100.sugar_g}g` : (nf.sugar_100g ?? null);
  nf.protein = ps.protein_g != null ? `${ps.protein_g}g` : (nf.protein ?? null);
  nf.protein_100g = p100.protein_g != null ? `${p100.protein_g}g` : (nf.protein_100g ?? null);
  rawJson.nutrition_facts = nf;

  const { score, reason, safetyLevel } = calculateHealthScore(rawJson);

  const finalResult: IngredientAnalysis = {
    product_name: rawJson.product_name || "Food Product",
    brand: rawJson.brand || "Brand",
    health_score: score,
    health_score_reason: reason,
    safety_level: safetyLevel,
    description: rawJson.description || "Food product label analysis.",
    panel_status: rawJson.panel_status || "extracted",
    unreadable_instructions: rawJson.unreadable_instructions || null,
    ingredients: rawJson.ingredients || [],
    additives: rawJson.additives || [],
    allergens: rawJson.allergens_declared || [],
    allergens_declared: rawJson.allergens_declared || [],
    nutrition_facts: rawJson.nutrition_facts,
    recommendations: rawJson.recommendations || [],
    alternatives_detailed: rawJson.alternatives_detailed || [],
    upf_score: rawJson.upf_score || 3,
    upf_reason: rawJson.upf_reason,
    glycemic_index_estimate: rawJson.glycemic_index_estimate || "medium",
    glycemic_reason: rawJson.glycemic_reason,
  };

  return applyPreferences(finalResult, userPreferences);
}

export async function enrichIngredientsText(
  ingredientsText: string,
  productName: string,
  brand: string,
  nutriments: any = {},
  userPreferences: string[] = [],
  preferredLanguage: string = "en"
): Promise<IngredientAnalysis> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables.");
  }

  const langPrompt = preferredLanguage && preferredLanguage !== "en"
    ? "\nCRITICAL LANGUAGE REQUIREMENT: All user-facing explanations and rationale text fields in the output JSON (health_score_reason, description, ingredient reasons, additive descriptions, recommendations, alternative reasons, upf_reason, glycemic_reason) MUST be written in the language: " + preferredLanguage + "."
    : "";

  const systemPrompt = "You are ScanSafe EVIDENCE-BASED PARSER. Given raw verified food database ingredients text and nutrients, parse into clean structured JSON.\n" +
"Return a single JSON object matching:\n" +
JSON.stringify({
  product_name: productName,
  brand: brand,
  panel_status: "extracted",
  description: "2-3 sentences overview of the product",
  ingredients: [{ name: "ingredient", status: "safe", reason: "reason" }],
  additives: [{ name: "additive", code: "INS/E-code", risk: "low", description: "desc", source: "citation" }],
  allergens_declared: ["Gluten", "Milk"],
  nutrition_facts: {
    panel_status: "extracted",
    serving_size: "100g",
    per_100g: { calories: 300, fat_g: 5, saturated_fat_g: 1, trans_fat_g: 0, cholesterol_mg: 0, sodium_mg: 100, carbs_g: 50, fiber_g: 2, sugar_g: 10, added_sugar_g: 8, protein_g: 5 }
  },
  upf_score: 3,
  upf_reason: "NOVA group explanation",
  glycemic_index_estimate: "medium",
  glycemic_reason: "glycemic impact",
  recommendations: ["Healthier alternative names"],
  alternatives_detailed: [{ name: "Clean Alternative", brand: "Brand", reason: "Why better", estimated_price_inr: 100, buy_url_blinkit: "url" }]
}, null, 2) + "\nDo NOT wrap with markdown. Return ONLY raw JSON.";

  const response = await axios.post(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey,
    {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          parts: [
            { text: "Product: " + productName + "\nBrand: " + brand + "\nRaw Ingredients: " + ingredientsText + "\nRaw Nutriments: " + JSON.stringify(nutriments) + langPrompt }
          ]
        }
      ],
      generationConfig: { responseMimeType: "application/json" }
    },
    {
      headers: { "content-type": "application/json" },
      httpsAgent: keepAliveAgent
    }
  );

  const candidate = response && response.data && response.data.candidates && response.data.candidates[0];
  const responseText = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text ? candidate.content.parts[0].text.trim() : null;
  if (!responseText) throw new Error("Empty response from Gemini");

  let cleanedText = responseText;
  const jsonBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) cleanedText = jsonBlockMatch[1];

  let rawParsed: any;
  try {
    rawParsed = JSON.parse(cleanedText.trim());
  } catch {
    throw new Error("Failed to parse Gemini response as JSON.");
  }

  const validated = RawProductFactsSchema.safeParse(rawParsed);
  if (!validated.success) {
    throw new Error(`Enrichment AI returned invalid product facts: ${validated.error.message}`);
  }
  const rawJson = validated.data;

  const nf = rawJson.nutrition_facts || { per_100g: {} };
  const p100 = nf.per_100g || {};
  if (nutriments["energy-kcal_100g"] !== undefined) p100.calories = Math.round(nutriments["energy-kcal_100g"]);
  if (nutriments.fat_100g !== undefined) p100.fat_g = parseFloat(nutriments.fat_100g);
  if (nutriments["saturated-fat_100g"] !== undefined) p100.saturated_fat_g = parseFloat(nutriments["saturated-fat_100g"]);
  if (nutriments["trans-fat_100g"] !== undefined) p100.trans_fat_g = parseFloat(nutriments["trans-fat_100g"]);
  if (nutriments.sodium_100g !== undefined) p100.sodium_mg = Math.round(parseFloat(nutriments.sodium_100g) * 1000);
  if (nutriments.carbohydrates_100g !== undefined) p100.carbs_g = parseFloat(nutriments.carbohydrates_100g);
  if (nutriments.sugars_100g !== undefined) p100.sugar_g = parseFloat(nutriments.sugars_100g);
  if (nutriments.fiber_100g !== undefined) p100.fiber_g = parseFloat(nutriments.fiber_100g);
  if (nutriments.proteins_100g !== undefined) p100.protein_g = parseFloat(nutriments.proteins_100g);

  nf.per_100g = p100;
  nf.calories_100g = p100.calories ?? null;
  nf.fat_100g = p100.fat_g != null ? `${p100.fat_g}g` : (nf.fat_100g ?? null);
  nf.saturated_fat_100g = p100.saturated_fat_g != null ? `${p100.saturated_fat_g}g` : (nf.saturated_fat_100g ?? null);
  nf.trans_fat_100g = p100.trans_fat_g != null ? `${p100.trans_fat_g}g` : (nf.trans_fat_100g ?? null);
  nf.sodium_100g = p100.sodium_mg != null ? `${p100.sodium_mg}mg` : (nf.sodium_100g ?? null);
  nf.carbs_100g = p100.carbs_g != null ? `${p100.carbs_g}g` : (nf.carbs_100g ?? null);
  nf.sugar_100g = p100.sugar_g != null ? `${p100.sugar_g}g` : (nf.sugar_100g ?? null);
  nf.fiber_100g = p100.fiber_g != null ? `${p100.fiber_g}g` : (nf.fiber_100g ?? null);
  nf.protein_100g = p100.protein_g != null ? `${p100.protein_g}g` : (nf.protein_100g ?? null);
  rawJson.nutrition_facts = nf;

  const { score, reason, safetyLevel } = calculateHealthScore(rawJson);

  const finalResult: IngredientAnalysis = {
    product_name: rawJson.product_name || productName,
    brand: rawJson.brand || brand,
    health_score: score,
    health_score_reason: reason,
    safety_level: safetyLevel,
    description: rawJson.description || "Food product label analysis.",
    panel_status: "extracted",
    ingredients: rawJson.ingredients || [],
    additives: rawJson.additives || [],
    allergens: rawJson.allergens_declared || [],
    allergens_declared: rawJson.allergens_declared || [],
    nutrition_facts: rawJson.nutrition_facts,
    recommendations: rawJson.recommendations || [],
    alternatives_detailed: rawJson.alternatives_detailed || [],
    upf_score: rawJson.upf_score || 3,
    upf_reason: rawJson.upf_reason,
    glycemic_index_estimate: rawJson.glycemic_index_estimate || "medium",
    glycemic_reason: rawJson.glycemic_reason,
  };

  return applyPreferences(finalResult, userPreferences);
}

export async function analyzeLabel(
  base64Image: string,
  userPreferences: string[] = [],
  filename: string = "",
  productName: string = "",
  preferredLanguage: string = "en"
): Promise<IngredientAnalysis> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("AI Vision model is temporarily unavailable. Please verify API configuration.");
  }

  return await analyzeLabelWithGemini(base64Image, userPreferences, preferredLanguage);
}

export const MOCK_PRODUCTS: IngredientAnalysis[] = [
  SAMPLE_PRODUCTS.sample_cookies,
  SAMPLE_PRODUCTS.sample_oats
];
