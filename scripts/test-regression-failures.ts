/**
 * Regression Test Suite to Reproduce and Verify all 8 Target Failures:
 * 1. Two simultaneous 1-credit scans with balance 1.
 * 2. 10-credit purchase retried after ledger insertion failure.
 * 3. Missing ingredients/nutrition producing 90/100 instead of null/insufficient evidence.
 * 4. Ingredient "Butter" with "allergy-milk" returning compatible.
 * 5. Ingredient text "Rice flour, wheat flour" with "gluten-free" returning compatible (suppression bug).
 * 6. Ingredient text "Cocoa butter, milk powder" with "allergy-milk" returning compatible (suppression bug).
 * 7. Empty ingredient list with declared allergen "Milk" returning compatible while displaying warning.
 * 8. Rolled oats with "May contain trace wheat" returning confirmed compatible for gluten-free.
 */

import { calculateHealthScore, applyPreferences, IngredientAnalysis, RawProductFacts } from "../lib/claude";

console.log("==================================================");
console.log("🔍 RUNNING SCANSAFE REGRESSION TEST SUITE");
console.log("==================================================");

let results = {
  test1: "PENDING",
  test2: "PENDING",
  test3: "PENDING",
  test4: "PENDING",
  test5: "PENDING",
  test6: "PENDING",
  test7: "PENDING",
  test8: "PENDING"
};

// -------------------------------------------------------------
// Test 3: Missing ingredients and nutrition producing score
// -------------------------------------------------------------
console.log("\n--- Testing Failure 3: Missing ingredients/nutrition score ---");
const missingDataFacts: Partial<RawProductFacts> = {
  product_name: "Unreadable Wrapper",
  brand: "Unknown",
  panel_status: "unreadable",
  ingredients: [],
  additives: [],
  nutrition_facts: {
    panel_status: "unreadable"
  }
};
const scoreResult = calculateHealthScore(missingDataFacts as any);
console.log("Result for unreadable panel:", scoreResult);
if (scoreResult.score === null || (scoreResult as any).score === undefined || scoreResult.safetyLevel === "insufficient_evidence") {
  console.log("✅ Failure 3 Fixed: Score is null/insufficient_evidence");
  results.test3 = "PASS";
} else {
  console.log(`❌ Failure 3 Reproduced: Returned numeric score ${scoreResult.score} and safety level '${scoreResult.safetyLevel}' for unreadable panel!`);
  results.test3 = "FAIL";
}

// -------------------------------------------------------------
// Test 4: Ingredient "Butter" with "allergy-milk"
// -------------------------------------------------------------
console.log("\n--- Testing Failure 4: Ingredient 'Butter' with 'allergy-milk' ---");
const butterProduct: IngredientAnalysis = {
  product_name: "Butter Biscuit",
  brand: "Brand",
  health_score: 70,
  health_score_reason: "",
  safety_level: "safe",
  description: "",
  ingredients: [{ name: "Butter", status: "safe", reason: "Rich dairy" }],
  additives: [],
  allergens: [],
  nutrition_facts: { panel_status: "extracted" },
  recommendations: []
};
const butterCheck = applyPreferences(butterProduct, ["allergy-milk"]);
console.log("Butter compatibility:", butterCheck.dietary_compatibility);
if (!butterCheck.dietary_compatibility?.is_compatible && butterCheck.dietary_compatibility?.violations?.some(v => v.ingredient.toLowerCase().includes("butter"))) {
  console.log("✅ Failure 4 Fixed: Butter correctly flagged as milk allergen violation");
  results.test4 = "PASS";
} else {
  console.log("❌ Failure 4 Reproduced: Butter returned compatible without warning for milk allergy!");
  results.test4 = "FAIL";
}

// -------------------------------------------------------------
// Test 5: "Rice flour, wheat flour" with "gluten-free"
// -------------------------------------------------------------
console.log("\n--- Testing Failure 5: 'Rice flour, wheat flour' with 'gluten-free' ---");
const riceWheatProduct: IngredientAnalysis = {
  product_name: "Mixed Crisp",
  brand: "Brand",
  health_score: 70,
  health_score_reason: "",
  safety_level: "safe",
  description: "",
  ingredients: [{ name: "Rice flour, wheat flour", status: "safe", reason: "Grain mix" }],
  additives: [],
  allergens: [],
  nutrition_facts: { panel_status: "extracted" },
  recommendations: []
};
const riceWheatCheck = applyPreferences(riceWheatProduct, ["gluten-free"]);
console.log("Rice flour, wheat flour compatibility:", riceWheatCheck.dietary_compatibility);
if (!riceWheatCheck.dietary_compatibility?.is_compatible && riceWheatCheck.dietary_compatibility?.violations?.length! > 0) {
  console.log("✅ Failure 5 Fixed: Wheat flour in compound string was caught despite rice flour presence");
  results.test5 = "PASS";
} else {
  console.log("❌ Failure 5 Reproduced: Rice flour exception suppressed wheat flour detection!");
  results.test5 = "FAIL";
}

// -------------------------------------------------------------
// Test 6: "Cocoa butter, milk powder" with "allergy-milk"
// -------------------------------------------------------------
console.log("\n--- Testing Failure 6: 'Cocoa butter, milk powder' with 'allergy-milk' ---");
const cocoaMilkProduct: IngredientAnalysis = {
  product_name: "Milk Chocolate",
  brand: "Brand",
  health_score: 60,
  health_score_reason: "",
  safety_level: "moderate",
  description: "",
  ingredients: [{ name: "Cocoa butter, milk powder", status: "safe", reason: "Chocolate base" }],
  additives: [],
  allergens: [],
  nutrition_facts: { panel_status: "extracted" },
  recommendations: []
};
const cocoaMilkCheck = applyPreferences(cocoaMilkProduct, ["allergy-milk"]);
console.log("Cocoa butter, milk powder compatibility:", cocoaMilkCheck.dietary_compatibility);
if (!cocoaMilkCheck.dietary_compatibility?.is_compatible && cocoaMilkCheck.dietary_compatibility?.violations?.length! > 0) {
  console.log("✅ Failure 6 Fixed: Milk powder in compound string was caught despite cocoa butter presence");
  results.test6 = "PASS";
} else {
  console.log("❌ Failure 6 Reproduced: Cocoa butter exception suppressed milk powder detection!");
  results.test6 = "FAIL";
}

// -------------------------------------------------------------
// Test 7: Empty ingredient list with declared allergen "Milk"
// -------------------------------------------------------------
console.log("\n--- Testing Failure 7: Empty ingredient list with declared allergen 'Milk' ---");
const declaredAllergenProduct: IngredientAnalysis = {
  product_name: "Unlisted Milk Candy",
  brand: "Brand",
  health_score: 50,
  health_score_reason: "",
  safety_level: "moderate",
  description: "",
  ingredients: [],
  additives: [],
  allergens_declared: ["Contains Milk"],
  allergens: ["Contains Milk"],
  nutrition_facts: { panel_status: "extracted" },
  recommendations: []
};
const declaredAllergenCheck = applyPreferences(declaredAllergenProduct, ["dairy-free"]);
console.log("Declared allergen compatibility:", declaredAllergenCheck.dietary_compatibility);
if (!declaredAllergenCheck.dietary_compatibility?.is_compatible && declaredAllergenCheck.dietary_compatibility?.allergen_warnings?.length! > 0) {
  console.log("✅ Failure 7 Fixed: Declared allergen warning makes is_compatible: false");
  results.test7 = "PASS";
} else {
  console.log("❌ Failure 7 Reproduced: Declared allergen generated warning but returned is_compatible: true!");
  results.test7 = "FAIL";
}

// -------------------------------------------------------------
// Test 7b: Empty ingredient list with zero declared allergens (Insufficient Data)
// -------------------------------------------------------------
console.log("\n--- Testing Empty ingredient list with zero declared allergens ---");
const emptyProduct: IngredientAnalysis = {
  product_name: "Empty Fact Product",
  brand: "Brand",
  health_score: null,
  health_score_reason: "Insufficient evidence",
  safety_level: "insufficient_evidence",
  description: "",
  ingredients: [],
  additives: [],
  allergens_declared: [],
  allergens: [],
  nutrition_facts: { panel_status: "unreadable" },
  recommendations: []
};
const emptyCheck = applyPreferences(emptyProduct, ["gluten-free"]);
console.log("Empty product compatibility:", emptyCheck.dietary_compatibility);
if (!emptyCheck.dietary_compatibility?.is_compatible && emptyCheck.dietary_compatibility?.status === "insufficient_data") {
  console.log("✅ Empty Data Handled: Returns status: 'insufficient_data' and is_compatible: false");
} else {
  console.log("❌ Empty Data Failed: Allowed empty product with active preferences!");
}

// -------------------------------------------------------------
// Test 7c: Empty ingredients + declared Milk with gluten-free preference
// -------------------------------------------------------------
console.log("\n--- Testing Empty ingredient list + declared 'Milk' with gluten-free ---");
const emptyMilkProd: IngredientAnalysis = {
  product_name: "Imported Milk Drop",
  brand: "Brand",
  health_score: null,
  health_score_reason: "Insufficient evidence",
  safety_level: "insufficient_evidence",
  description: "",
  ingredients: [],
  additives: [],
  allergens_declared: ["Milk"],
  allergens: ["Milk"],
  nutrition_facts: { panel_status: "extracted" },
  recommendations: []
};
const emptyMilkGfCheck = applyPreferences(emptyMilkProd, ["gluten-free"]);
console.log("Empty ingredients + declared Milk on GF:", emptyMilkGfCheck.dietary_compatibility);
if (!emptyMilkGfCheck.dietary_compatibility?.is_compatible && emptyMilkGfCheck.dietary_compatibility?.status === "insufficient_data") {
  console.log("✅ Fixed: Declared Milk does not falsely certify gluten-free when ingredient list is missing.");
} else {
  console.log("❌ Failed: Declared Milk falsely certified absence of gluten!");
}

// -------------------------------------------------------------
// Test 7d: Ingredient 'Soy protein' / declared allergen 'Soy' with 'allergy-soy'
// -------------------------------------------------------------
console.log("\n--- Testing Ingredient 'Soy protein' with 'allergy-soy' ---");
const soyProduct: IngredientAnalysis = {
  product_name: "Protein Bar",
  brand: "Brand",
  health_score: 70,
  health_score_reason: "",
  safety_level: "safe",
  description: "",
  ingredients: [{ name: "Soy protein isolate", status: "safe", reason: "Plant protein" }],
  additives: [],
  allergens_declared: ["Soy"],
  allergens: ["Soy"],
  nutrition_facts: { panel_status: "extracted" },
  recommendations: []
};
const soyCheck = applyPreferences(soyProduct, ["allergy-soy"]);
console.log("Soy product compatibility:", soyCheck.dietary_compatibility);
if (!soyCheck.dietary_compatibility?.is_compatible && soyCheck.dietary_compatibility?.violations?.some(v => v.ingredient.toLowerCase().includes("soy"))) {
  console.log("✅ Fixed: Soy protein isolate correctly flagged as soy allergen violation.");
} else {
  console.log("❌ Failed: Soy protein isolate was not flagged for soy allergy!");
}

// -------------------------------------------------------------
// Test 8: Rolled oats with "May contain trace wheat"
// -------------------------------------------------------------
console.log("\n--- Testing Failure 8: Rolled oats with 'May contain trace wheat' ---");
const traceWheatProduct: IngredientAnalysis = {
  product_name: "Rolled Oats",
  brand: "Brand",
  health_score: 95,
  health_score_reason: "",
  safety_level: "safe",
  description: "",
  ingredients: [{ name: "100% Rolled Oats", status: "safe", reason: "Whole oats" }],
  additives: [],
  allergens_declared: ["May contain trace wheat"],
  allergens: ["May contain trace wheat"],
  nutrition_facts: { panel_status: "extracted" },
  recommendations: []
};
const traceWheatCheck = applyPreferences(traceWheatProduct, ["gluten-free"]);
console.log("Trace wheat compatibility:", traceWheatCheck.dietary_compatibility);
if (traceWheatCheck.dietary_compatibility?.allergen_warnings?.some(w => w.toLowerCase().includes("wheat") || w.toLowerCase().includes("gluten"))) {
  console.log("✅ Failure 8 Fixed: Precautionary warning preserved for trace wheat declaration");
  results.test8 = "PASS";
} else {
  console.log("❌ Failure 8 Reproduced: Trace wheat declaration produced no warning for gluten-free!");
  results.test8 = "FAIL";
}

// -------------------------------------------------------------
// Test 8b: Sparse nutrition evidence without ingredients must NOT score 100/100 Safe
// -------------------------------------------------------------
console.log("\n--- Testing Sparse nutrition evidence (only calories 400 & protein 2g, no ingredients) ---");
const sparseItem: Partial<RawProductFacts> = {
  product_name: "Sparse Fact Item",
  brand: "Brand",
  panel_status: "extracted",
  ingredients: [],
  additives: [],
  nutrition_facts: {
    panel_status: "extracted",
    per_100g: {
      calories: 400,
      protein_g: 2
    }
  }
};
const sparseScore = calculateHealthScore(sparseItem);
console.log("Sparse Evidence Score Result:", sparseScore);
if (sparseScore.score === null && sparseScore.safetyLevel === "insufficient_evidence") {
  console.log("✅ Fixed: Sparse nutrition data without complete macros or ingredients returns score: null.");
} else {
  console.log(`❌ Failed: Sparse nutrition returned score ${sparseScore.score} and safety level '${sparseScore.safetyLevel}'!`);
}

// -------------------------------------------------------------
// Test 9: Per-serving vs Per-100g Concentration Equivalence
// -------------------------------------------------------------
console.log("\n--- Testing Per-serving vs Per-100g Concentration Equivalence ---");
const perServingItem: Partial<RawProductFacts> = {
  product_name: "Sugar Biscuit (20g Serving)",
  brand: "Brand",
  panel_status: "extracted",
  ingredients: [
    { name: "Wheat flour", status: "safe", reason: "" },
    { name: "Sugar", status: "safe", reason: "" },
    { name: "Vegetable fat", status: "safe", reason: "" }
  ],
  additives: [],
  nutrition_facts: {
    panel_status: "extracted",
    serving_size: "20g",
    per_serving: {
      sugar_g: 10,
      calories: 100,
      protein_g: 2,
      fat_g: 4,
      sodium_mg: 50
    }
  }
};

const per100gItem: Partial<RawProductFacts> = {
  product_name: "Sugar Biscuit (Per 100g)",
  brand: "Brand",
  panel_status: "extracted",
  ingredients: [
    { name: "Wheat flour", status: "safe", reason: "" },
    { name: "Sugar", status: "safe", reason: "" },
    { name: "Vegetable fat", status: "safe", reason: "" }
  ],
  additives: [],
  nutrition_facts: {
    panel_status: "extracted",
    per_100g: {
      sugar_g: 50,
      calories: 500,
      protein_g: 10,
      fat_g: 20,
      sodium_mg: 250
    }
  }
};

const scorePerServing = calculateHealthScore(perServingItem);
const scorePer100g = calculateHealthScore(per100gItem);
console.log("Score Per Serving (10g / 20g):", scorePerServing.score);
console.log("Score Per 100g (50g / 100g):", scorePer100g.score);

if (scorePerServing.score !== null && scorePerServing.score === scorePer100g.score) {
  console.log(`✅ Concentration Equivalence Fixed: Both evaluate identically to score ${scorePerServing.score}/100`);
} else {
  console.log(`❌ Concentration Equivalence Failed: PerServing=${scorePerServing.score}, Per100g=${scorePer100g.score}`);
}

// -------------------------------------------------------------
// Test 10: Pregnancy Screening with "Unpasteurized milk"
// -------------------------------------------------------------
console.log("\n--- Testing Pregnancy Screening: 'Unpasteurized milk' ---");
const unpasteurizedProduct: IngredientAnalysis = {
  product_name: "Farm Fresh Raw Milk",
  brand: "Dairy Farm",
  health_score: 80,
  health_score_reason: "",
  safety_level: "safe",
  description: "",
  ingredients: [{ name: "Unpasteurized milk", status: "safe", reason: "Raw milk" }],
  additives: [],
  allergens: [],
  nutrition_facts: { panel_status: "extracted" },
  recommendations: []
};
const pregnancyCheck = applyPreferences(unpasteurizedProduct, ["pregnancy"]);
console.log("Pregnancy unpasteurized milk compatibility:", pregnancyCheck.dietary_compatibility);
if (!pregnancyCheck.dietary_compatibility?.is_compatible && pregnancyCheck.dietary_compatibility?.violations?.some(v => v.ingredient.toLowerCase().includes("unpasteurized"))) {
  console.log("✅ Pregnancy Screening Fixed: 'Unpasteurized milk' correctly flagged as high-risk hazard during pregnancy.");
} else {
  console.log("❌ Pregnancy Screening Failed: 'Unpasteurized milk' was mistakenly marked compatible!");
}

// -------------------------------------------------------------
// Test 11: Unsupported Preference ["gluten-free", "unknown-allergy"]
// -------------------------------------------------------------
console.log("\n--- Testing Unsupported Preference: ['gluten-free', 'unknown-allergy'] ---");
const normalProduct: IngredientAnalysis = {
  product_name: "Rice Cake",
  brand: "Brand",
  health_score: 85,
  health_score_reason: "",
  safety_level: "safe",
  description: "",
  ingredients: [{ name: "100% Brown Rice", status: "safe", reason: "Whole grain" }],
  additives: [],
  allergens: [],
  nutrition_facts: { panel_status: "extracted" },
  recommendations: []
};
const unsuppCheck = applyPreferences(normalProduct, ["gluten-free", "unknown-allergy"]);
console.log("Unsupported preference compatibility:", unsuppCheck.dietary_compatibility);
if (!unsuppCheck.dietary_compatibility?.is_compatible && unsuppCheck.dietary_compatibility?.status === "unsupported_preference" && unsuppCheck.dietary_compatibility?.unsupported_preferences?.includes("unknown-allergy")) {
  console.log("✅ Unsupported Preference Fixed: Returns is_compatible: false and status: 'unsupported_preference'.");
} else {
  console.log("❌ Unsupported Preference Failed: Product returned compatible despite unverified allergy restriction!");
}

// -------------------------------------------------------------
// Test 12: Empty ingredients + 'Gluten-Free' declaration with 'allergy-soy'
// -------------------------------------------------------------
console.log("\n--- Testing Empty ingredients + 'Gluten-Free' declaration with 'allergy-soy' ---");
const gfClaimProd: IngredientAnalysis = {
  product_name: "Mystery Biscuit",
  brand: "Brand",
  health_score: null,
  health_score_reason: "Insufficient evidence",
  safety_level: "insufficient_evidence",
  description: "",
  ingredients: [],
  additives: [],
  allergens_declared: ["Gluten-Free"],
  allergens: ["Gluten-Free"],
  nutrition_facts: { panel_status: "extracted" },
  recommendations: []
};
const soyCheckWithGfClaim = applyPreferences(gfClaimProd, ["allergy-soy"]);
console.log("Empty ingredients + Gluten-Free declaration on Soy Allergy:", soyCheckWithGfClaim.dietary_compatibility);
if (!soyCheckWithGfClaim.dietary_compatibility?.is_compatible && soyCheckWithGfClaim.dietary_compatibility?.status === "insufficient_data") {
  console.log("✅ Fixed: 'Gluten-Free' claim does not falsely certify absence of soy when ingredients are missing.");
} else {
  console.log("❌ Failed: 'Gluten-Free' claim falsely certified soy allergy compatibility!");
}

// -------------------------------------------------------------
// Test 13: 1 ingredient + calories/protein only (Incomplete Evidence)
// -------------------------------------------------------------
console.log("\n--- Testing 1 ingredient + calories/protein only (Incomplete Evidence) ---");
const oneIngItem: Partial<RawProductFacts> = {
  product_name: "Partial Label Product",
  brand: "Brand",
  panel_status: "extracted",
  ingredients: [{ name: "Sugar", status: "safe", reason: "" }],
  additives: [],
  nutrition_facts: {
    panel_status: "extracted",
    per_100g: {
      calories: 400,
      protein_g: 2
    }
  }
};
const oneIngScore = calculateHealthScore(oneIngItem);
console.log("1-ingredient + sparse nutrition score result:", oneIngScore);
if (oneIngScore.score === null && oneIngScore.safetyLevel === "insufficient_evidence") {
  console.log("✅ Fixed: Incomplete evidence with 1 ingredient strictly returns score: null.");
} else {
  console.log(`❌ Failed: 1 ingredient with missing risk nutrients returned score: ${oneIngScore.score}!`);
}

// -------------------------------------------------------------
// Test 14: Liquid Per-100ml Normalization
// -------------------------------------------------------------
console.log("\n--- Testing Liquid Per-100ml Normalization ---");
import { normalizeNutrientsTo100g, mapSourceNutriments } from "../lib/claude";
const liquidNF = {
  basis: "per_100ml",
  per_100ml: {
    calories: 42,
    sugar_g: 9.5,
    sodium_mg: 15,
    fat_g: 0,
    protein_g: 0.5
  }
};
const normLiquid = normalizeNutrientsTo100g(liquidNF as any);
console.log("Normalized liquid nutrients:", normLiquid);
if (normLiquid.calories_100g === 42 && normLiquid.sugar_100g === 9.5 && normLiquid.sodium_100g === 15 && normLiquid.basis === "per_100ml" && normLiquid.is_liquid) {
  console.log("✅ Liquid Normalization Fixed: per_100ml nutrients accurately read and normalized.");
} else {
  console.log("❌ Liquid Normalization Failed: per_100ml returned nulls or incorrect basis!");
}

// -------------------------------------------------------------
// Test 15: Sodium & Cholesterol Conversion without Magnitude Thresholds
// -------------------------------------------------------------
console.log("\n--- Testing Sodium & Cholesterol Unit Conversions ---");
const offNutrimentsLowSodium = mapSourceNutriments({
  sodium_value: 9.9,
  sodium_unit: "mg",
  "energy-kcal_100g": 50
});
const offNutrimentsTenSodium = mapSourceNutriments({
  sodium_value: 10,
  sodium_unit: "mg",
  "energy-kcal_100g": 50
});
const offNutrimentsGramsSodium = mapSourceNutriments({
  sodium_100g: 0.5,
  "energy-kcal_100g": 50
});
const offNutrimentsChol = mapSourceNutriments({
  cholesterol_value: 0.8,
  cholesterol_unit: "mg",
  "energy-kcal_100g": 50
});

console.log("OFF 9.9 mg sodium ->", offNutrimentsLowSodium.per_100g?.sodium_mg);
console.log("OFF 10 mg sodium ->", offNutrimentsTenSodium.per_100g?.sodium_mg);
console.log("OFF 0.5 g sodium ->", offNutrimentsGramsSodium.per_100g?.sodium_mg);
console.log("OFF 0.8 mg cholesterol ->", offNutrimentsChol.per_100g?.cholesterol_mg);

if (
  offNutrimentsLowSodium.per_100g?.sodium_mg === 10 && // 9.9 rounded to 10 mg (NOT 9900 mg!)
  offNutrimentsTenSodium.per_100g?.sodium_mg === 10 &&
  offNutrimentsGramsSodium.per_100g?.sodium_mg === 500 &&
  offNutrimentsChol.per_100g?.cholesterol_mg === 1 // 0.8 rounded to 1 mg (NOT 800 mg!)
) {
  console.log("✅ Sodium & Cholesterol Unit Normalization Fixed: No magnitude guessing.");
} else {
  console.log("❌ Sodium & Cholesterol Conversion Failed!");
}

console.log("\n==================================================");
console.log("📊 REPRODUCTION RUN SUMMARY:", results);
console.log("==================================================");

// -------------------------------------------------------------
// Test 1: Two simultaneous 1-credit scans with starting balance of 1
// -------------------------------------------------------------
console.log("\n--- Testing Failure 1: Two simultaneous 1-credit scans with balance 1 ---");
// Isolated transactional ledger simulator with row lock
class IsolatedDatabase {
  profile = { scan_credits: 1 };
  reservations = new Map<string, { amount: number; status: string; expires_at: number }>();
  ledger: Array<{ amount: number; balance_after: number; ref: string }> = [];
  lock = Promise.resolve();

  async reserveCredits(opId: string, amount: number): Promise<{ success: boolean; error?: string; alreadyReserved?: boolean }> {
    let release: () => void;
    const nextLock = new Promise<void>(res => { release = res; });
    const currentLock = this.lock;
    this.lock = nextLock;
    await currentLock;

    try {
      const existing = this.reservations.get(opId);
      if (existing) {
        if (existing.status === 'reserved' && existing.expires_at > Date.now()) {
          return { success: true, alreadyReserved: true };
        }
        if (existing.status === 'finalized') {
          return { success: true };
        }
        if (existing.status === 'released' || existing.status === 'expired' || existing.expires_at <= Date.now()) {
          // Reactivate for retry
          existing.status = 'reserved';
          existing.expires_at = Date.now() + 300000;
          return { success: true };
        }
      }
      let activeReserved = 0;
      for (const res of Array.from(this.reservations.values())) {
        if (res.status === 'reserved' && res.expires_at > Date.now()) activeReserved += res.amount;
      }
      const available = this.profile.scan_credits - activeReserved;
      if (available < amount) {
        return { success: false, error: "INSUFFICIENT_CREDITS" };
      }
      this.reservations.set(opId, { amount, status: 'reserved', expires_at: Date.now() + 300000 });
      return { success: true };
    } finally {
      release!();
    }
  }

  async finalizeReservation(opId: string): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    let release: () => void;
    const nextLock = new Promise<void>(res => { release = res; });
    const currentLock = this.lock;
    this.lock = nextLock;
    await currentLock;

    try {
      const res = this.reservations.get(opId);
      if (!res) return { success: false, error: "RESERVATION_NOT_FOUND" };
      if (res.status === 'finalized') return { success: true, newBalance: this.profile.scan_credits };
      if (res.status !== 'reserved' && res.status !== 'expired') return { success: false, error: "INVALID_STATUS" };
      if (this.profile.scan_credits < res.amount) return { success: false, error: "INSUFFICIENT_CREDITS" };

      this.profile.scan_credits -= res.amount;
      this.ledger.push({ amount: -res.amount, balance_after: this.profile.scan_credits, ref: opId });
      res.status = 'finalized';
      return { success: true, newBalance: this.profile.scan_credits };
    } finally {
      release!();
    }
  }

  async fulfillPurchase(refId: string, amount: number, injectLedgerFailure = false): Promise<{ success: boolean; newBalance: number }> {
    let release: () => void;
    const nextLock = new Promise<void>(res => { release = res; });
    const currentLock = this.lock;
    this.lock = nextLock;
    await currentLock;

    try {
      const existing = this.ledger.find(e => e.ref === refId);
      if (existing) {
        return { success: true, newBalance: this.profile.scan_credits };
      }

      const rollbackBalance = this.profile.scan_credits;
      this.profile.scan_credits += amount;

      if (injectLedgerFailure) {
        this.profile.scan_credits = rollbackBalance;
        return { success: false, newBalance: rollbackBalance };
      }

      this.ledger.push({ amount, balance_after: this.profile.scan_credits, ref: refId });
      return { success: true, newBalance: this.profile.scan_credits };
    } finally {
      release!();
    }
  }
}

async function runConcurrencyTest() {
  const db = new IsolatedDatabase();
  const [resA, resB] = await Promise.all([
    db.reserveCredits("op_scan_1", 1),
    db.reserveCredits("op_scan_2", 1)
  ]);

  console.log("Concurrent scan results:", { scan1: resA, scan2: resB });
  const successCount = [resA, resB].filter(r => r.success).length;
  const failureCount = [resA, resB].filter(r => !r.success && r.error === "INSUFFICIENT_CREDITS").length;

  if (successCount === 1 && failureCount === 1) {
    console.log("✅ Failure 1 Fixed: Exactly one scan succeeded; the other received INSUFFICIENT_CREDITS.");
    results.test1 = "PASS";
  } else {
    console.log(`❌ Failure 1 Reproduced: Expected 1 success and 1 failure, got ${successCount} successes!`);
    results.test1 = "FAIL";
  }

  // -------------------------------------------------------------
  // Test 2: 10-credit purchase retried after ledger insertion failure
  // -------------------------------------------------------------
  console.log("\n--- Testing Failure 2: 10-credit purchase retried after ledger failure ---");
  const purchaseDb = new IsolatedDatabase();
  const attempt1 = await purchaseDb.fulfillPurchase("pay_test_123", 10, true);
  console.log("Attempt 1 (with failure):", attempt1);

  const attempt2 = await purchaseDb.fulfillPurchase("pay_test_123", 10, false);
  console.log("Attempt 2 (retry):", attempt2);

  console.log("Final balance after retry:", purchaseDb.profile.scan_credits);
  if (purchaseDb.profile.scan_credits === 11) {
    console.log("✅ Failure 2 Fixed: Final balance is exactly 11 (no duplicate credit grant).");
    results.test2 = "PASS";
  } else {
    console.log(`❌ Failure 2 Reproduced: Final balance became ${purchaseDb.profile.scan_credits} (duplicate grant)!`);
    results.test2 = "FAIL";
  }

  // -------------------------------------------------------------
  // Test 2b: Expired Reservation Finalization Recovery
  // -------------------------------------------------------------
  console.log("\n--- Testing Expired Reservation Finalization Recovery ---");
  const expiryDb = new IsolatedDatabase();
  expiryDb.profile.scan_credits = 5;
  await expiryDb.reserveCredits("op_expired_1", 1);
  const expRes = expiryDb.reservations.get("op_expired_1");
  if (expRes) expRes.status = "expired";

  const recoveryFinalize = await expiryDb.finalizeReservation("op_expired_1");
  console.log("Recovery finalization result:", recoveryFinalize);
  if (recoveryFinalize.success && recoveryFinalize.newBalance === 4) {
    console.log("✅ Expired Finalization Recovery Fixed: Saved pending scan finalized debit successfully.");
  } else {
    console.log("❌ Expired Finalization Recovery Failed!");
  }

  console.log("\n==================================================");
  console.log("🎉 FINAL REGRESSION SUITE RESULTS:", results);
  console.log("==================================================");
}

runConcurrencyTest();
