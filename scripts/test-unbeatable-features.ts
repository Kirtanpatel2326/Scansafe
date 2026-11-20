import { detectChemicalSynergies } from "../lib/synergies";
import { detectGreenwashing } from "../lib/greenwashing";
import { getSmartSwaps } from "../lib/smart-swap";
import { evaluateDietaryCompatibility, CANONICAL_PREFERENCES } from "../lib/preferences";
import { applyPreferences } from "../lib/claude";
import { RawProductFacts } from "../lib/claude";

/**
 * SCANSAFE UNBEATABLE COMPETITIVE FEATURES SUITE
 * Validates:
 * 1. Combinatorial Chemical Synergies Engine (Additive Cocktails & Reaction Formations)
 * 2. Greenwashing & Deceptive Marketing Detector (Front-of-pack claims vs back-of-pack truth)
 * 3. Smart Swap Engine ("Buy This Instead" clean alternative recommendations)
 * 4. Hyper-Personalized Clinical Profiles (PCOD/PCOS, Kids Clean Screen, Renal/Kidney)
 * 5. Full End-to-End Pipeline Enrichment via applyPreferences
 */

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (failureDetails) {
      console.error(`     Details: ${failureDetails}`);
    }
    failedTests++;
  }
}

console.log("\n======================================================================");
console.log("🛡️  TESTING SCANSAFE UNBEATABLE COMPETITIVE FEATURES SUITE");
console.log("======================================================================\n");

// ============================================================================
// 1. COMBINATORIAL CHEMICAL SYNERGIES ENGINE
// ============================================================================
console.log("▶ Feature 1: Combinatorial Chemical Interaction Engine (Synergies)");

// Test 1.1: Benzene Formation (Sodium Benzoate + Ascorbic Acid)
{
  const testIngredients = [
    { name: "Carbonated Water" },
    { name: "High Fructose Corn Syrup" },
    { name: "Citric Acid" },
    { name: "Sodium Benzoate" },
    { name: "Ascorbic Acid (Vitamin C)" }
  ];
  const synergies = detectChemicalSynergies(testIngredients);
  assert(
    synergies.some(s => s.id === "benzene_formation" && s.severity === "critical"),
    "Detects Benzene formation hazard when Sodium Benzoate meets Ascorbic Acid"
  );
}

// Test 1.2: Southampton ADHD Cocktail (Tartrazine + Sodium Benzoate)
{
  const testIngredients = [
    { name: "Sugar" },
    { name: "Tartrazine" },
    { name: "Sodium Benzoate" },
    { name: "Natural Flavour" }
  ];
  const synergies = detectChemicalSynergies(testIngredients);
  assert(
    synergies.some(s => s.id === "southampton_adhd_cocktail" && s.severity === "high"),
    "Detects Southampton ADHD cocktail (Tartrazine + Sodium Benzoate / Lancet landmark trial)"
  );
}

// Test 1.3: Gut Barrier Erosion (Polysorbate 80 + Carboxymethylcellulose)
{
  const testIngredients = [
    { name: "Skimmed Milk" },
    { name: "Polysorbate 80" },
    { name: "Sodium Carboxymethylcellulose" },
    { name: "Vanilla extract" }
  ];
  const synergies = detectChemicalSynergies(testIngredients);
  assert(
    synergies.some(s => s.id === "gut_mucosal_barrier_breakdown" && s.severity === "high"),
    "Detects Gut Mucosal Barrier Erosion (Polysorbate 80 + Carboxymethylcellulose synergy)"
  );
}

// Test 1.4: Nitrosamine Carcinogen Formation (Nitrites + Hydrolyzed Protein)
{
  const testIngredients = [
    { name: "Mechanically Separated Chicken" },
    { name: "Sodium Nitrite" },
    { name: "Hydrolyzed Soy Protein" },
    { name: "Spices" }
  ];
  const synergies = detectChemicalSynergies(testIngredients);
  assert(
    synergies.some(s => s.id === "nitrosamine_formation" && s.severity === "critical"),
    "Detects Nitrosamine Formation (Sodium Nitrite + Secondary Amine Protein)"
  );
}

// Test 1.5: Artificial Sweetener Metabolic Confusion (Sucralose + Acesulfame K)
{
  const testIngredients = [
    { name: "Water" },
    { name: "Sucralose" },
    { name: "Acesulfame Potassium" },
    { name: "Citric Acid" }
  ];
  const synergies = detectChemicalSynergies(testIngredients);
  assert(
    synergies.some(s => s.id === "artificial_sweetener_insulin_synergy"),
    "Detects Sweetener Cocktail (Sucralose + Acesulfame-K insulin response synergy)"
  );
}

// Test 1.6: Negative Control (Single Additive or Clean Recipe)
{
  const cleanIngredients = [
    { name: "Organic Rolled Oats" },
    { name: "Almonds" },
    { name: "Raw Honey" },
    { name: "Sea Salt" }
  ];
  const synergies = detectChemicalSynergies(cleanIngredients);
  assert(
    synergies.length === 0,
    "Clean whole-food ingredients yield 0 chemical synergies (no false positives)"
  );
}

// ============================================================================
// 2. GREENWASHING & DECEPTIVE MARKETING DETECTOR
// ============================================================================
console.log("\n▶ Feature 2: Greenwashing & Deceptive Marketing Detector");

// Test 2.1: Zero Sugar Illusion (Maltodextrin / Maltitol loophole)
{
  const flags = detectGreenwashing(
    "Sugar-Free Protein Snack",
    "No added sugar guilt-free snack",
    [{ name: "Maltodextrin" }, { name: "Wheat Flour" }, { name: "Palm Oil" }],
    { sugar_100g: "0" },
    ["Zero Sugar", "0% Sugar"]
  );
  assert(
    flags.some(f => f.id === "zero_sugar_illusion" && f.severity === "high"),
    "Flags Zero Sugar front claim when product contains high-GI Maltodextrin (GI > 110)"
  );
}

// Test 2.2: Premium Olive Oil Dilution (Palm olein base)
{
  const flags = detectGreenwashing(
    "Artisan Olive Oil Mayonnaise",
    "Made with authentic olive oil",
    [
      { name: "Refined Palm Olein" },
      { name: "Water" },
      { name: "Egg Yolk" },
      { name: "Extra Virgin Olive Oil (2%)" }
    ],
    undefined,
    ["Made with Olive Oil"]
  );
  assert(
    flags.some(f => f.id === "premium_oil_dilution"),
    "Flags 'Made with Olive Oil' when base oil is Refined Palm Olein"
  );
}

// Test 2.3: Whole Wheat Ruse (Maida as #1 ingredient)
{
  const flags = detectGreenwashing(
    "Whole Wheat Brown Bread",
    "Healthy multigrain breakfast",
    [
      { name: "Refined Wheat Flour (Maida)" },
      { name: "Water" },
      { name: "Whole Wheat Flour (15%)" },
      { name: "Yeast" }
    ],
    undefined,
    ["100% Whole Wheat Bread", "High Fiber Whole Grain"]
  );
  assert(
    flags.some(f => f.id === "refined_flour_whole_grain_ruse"),
    "Flags 'Whole Wheat' front claim when ingredient #1 is Refined Wheat Flour (Maida)"
  );
}

// Test 2.4: 100% Natural Facade (Synthetic additives present)
{
  const flags = detectGreenwashing(
    "All Natural Gourmet Crisps",
    "Pure natural goodness from the farm",
    [
      { name: "Potatoes" },
      { name: "Sunflower Oil" },
      { name: "Caramel Color IV" },
      { name: "Maltodextrin" }
    ],
    undefined,
    ["All Natural", "Pure Natural"]
  );
  assert(
    flags.some(f => f.id === "synthetic_chemical_natural_facade"),
    "Flags 'All Natural' claim when product contains synthetic caramel color and maltodextrin"
  );
}

// Test 2.5: Real Fruit Juice Dilution
{
  const flags = detectGreenwashing(
    "Real Mixed Fruit Nectar",
    "Made with 100% real fruit",
    [
      { name: "Water" },
      { name: "Invert Sugar Syrup" },
      { name: "Reconstituted Apple Juice Concentrate (10%)" }
    ],
    { sugar_100g: "14" },
    ["Made with Real Fruit", "100% Fruit Taste"]
  );
  assert(
    flags.some(f => f.id === "diluted_fruit_illusion"),
    "Flags 'Real Fruit' claim when product is sugar syrup with reconstituted concentrate"
  );
}

// Test 2.6: Negative Control (Honest Labeling)
{
  const flags = detectGreenwashing(
    "Traditional Rolled Oats",
    "Pure whole oats",
    [{ name: "100% Whole Grain Rolled Oats" }],
    undefined,
    ["Traditional Rolled Oats"]
  );
  assert(
    flags.length === 0,
    "Truthful front-of-pack claims yield 0 greenwashing flags (no false flags)"
  );
}

// ============================================================================
// 3. SMART SWAP ENGINE ("BUY THIS INSTEAD")
// ============================================================================
console.log("\n▶ Feature 3: Smart Swap Engine ('Buy This Instead')");

// Test 3.1: Ultra-processed Biscuit / Cookie Swaps
{
  const swaps = getSmartSwaps(
    "Britannia Bourbon Chocolate Cream Biscuits",
    "Biscuits & Cookies",
    35,
    true
  );
  assert(
    swaps.length > 0 && swaps.some(s => s.name.toLowerCase().includes("ragi") || s.name.toLowerCase().includes("cracker")),
    "Provides clean whole-grain alternatives for high-sugar commercial biscuits"
  );
  assert(
    swaps.every(s => s.clean_badges.length > 0 && s.why_better.length > 10),
    "Each Smart Swap includes verified clean badges and clinical rationale"
  );
  assert(
    swaps.every(s => s.quick_links && (s.quick_links.blinkit || s.quick_links.zepto || s.quick_links.bigbasket || s.quick_links.amazon)),
    "Each Smart Swap provides verified 1-click purchase quick links"
  );
}

// Test 3.2: Instant Noodles Swaps
{
  const swaps = getSmartSwaps(
    "Maggi Masala Instant Noodles",
    "Instant Noodles",
    30,
    true
  );
  assert(
    swaps.some(s => s.name.toLowerCase().includes("millet") || s.name.toLowerCase().includes("pasta")),
    "Provides non-fried, air-dried millet/chickpea alternatives for instant noodles"
  );
}

// Test 3.3: Chips / Savory Snack Swaps
{
  const swaps = getSmartSwaps(
    "Lays Spanish Tomato Tango Potato Chips",
    "Chips & Crisps",
    42,
    true
  );
  assert(
    swaps.some(s => s.name.toLowerCase().includes("popped") || s.name.toLowerCase().includes("pita")),
    "Provides air-popped and sourdough-baked clean snacks for deep-fried chips"
  );
}

// Test 3.4: High Health Score Bypass (No unnecessary swaps for pristine items)
{
  const swaps = getSmartSwaps(
    "Organic Rolled Oats",
    "Breakfast Cereals",
    92,
    false
  );
  assert(
    swaps.length === 0,
    "Pristine, healthy whole foods (score 92/100, 0 hazards) do not show unnecessary swaps"
  );
}

// ============================================================================
// 4. HYPER-PERSONALIZED CLINICAL HEALTH PROFILES
// ============================================================================
console.log("\n▶ Feature 4: Hyper-Personalized Clinical Health Profiles");

// Test 4.1: PCOD / PCOS Hormonal Care Screening
{
  const result = evaluateDietaryCompatibility(
    [{ name: "Maltodextrin" }, { name: "Hydrogenated Palm Oil" }, { name: "Sugar" }],
    [],
    ["pcod-pcos"]
  );
  assert(
    !result.is_compatible && result.violations.some(v => v.preference.includes("PCOD")),
    "PCOD/PCOS profile flags high-glycemic Maltodextrin and inflammatory hydrogenated fats"
  );
  assert(
    result.disclaimers?.some(d => d.includes("PCOD/PCOS")) ?? false,
    "PCOD/PCOS includes clinical reproductive endocrinology disclaimer"
  );
}

// Test 4.2: Kids & Toddler Clean Screen (Southampton Dyes + Synthetic Additives)
{
  const result = evaluateDietaryCompatibility(
    [{ name: "Water" }, { name: "Sugar" }, { name: "Tartrazine" }, { name: "TBHQ" }],
    [],
    ["kids-safe"]
  );
  assert(
    !result.is_compatible && result.violations.some(v => v.ingredient.includes("Tartrazine")),
    "Kids Clean Screen flags Southampton ADHD dye Tartrazine"
  );
  assert(
    result.violations.some(v => v.ingredient.includes("TBHQ")),
    "Kids Clean Screen flags petroleum antioxidant TBHQ"
  );
}

// Test 4.3: Renal / Kidney-Conscious (Inorganic Phosphate Overload)
{
  const result = evaluateDietaryCompatibility(
    [{ name: "Water" }, { name: "Sodium Tripolyphosphate" }, { name: "Potassium Chloride" }],
    [],
    ["renal-kidney"]
  );
  assert(
    !result.is_compatible && result.violations.some(v => v.ingredient.includes("Sodium Tripolyphosphate")),
    "Renal profile flags hidden inorganic phosphate additive (Tripolyphosphate)"
  );
  assert(
    result.violations.some(v => v.ingredient.includes("Potassium Chloride")),
    "Renal profile flags potassium salt additives"
  );
}

// Test 4.4: Canonical Definitions Integrity
{
  const pcod = CANONICAL_PREFERENCES.find(p => p.id === "pcod-pcos");
  const kids = CANONICAL_PREFERENCES.find(p => p.id === "kids-safe");
  const renal = CANONICAL_PREFERENCES.find(p => p.id === "renal-kidney");

  assert(
    !!pcod && !!kids && !!renal,
    "All 3 new clinical profiles exist in CANONICAL_PREFERENCES"
  );
  assert(
    (pcod?.searchTerms.length || 0) > 5 && (kids?.searchTerms.length || 0) > 5 && (renal?.searchTerms.length || 0) > 5,
    "All new profiles have comprehensive, clinically-grounded trigger lists"
  );
}

// ============================================================================
// 5. END-TO-END PIPELINE ENRICHMENT VIA applyPreferences
// ============================================================================
console.log("\n▶ Feature 5: End-to-End Pipeline Enrichment");

{
  const rawFacts: any = {
    product_name: "Commercial Diet Cola Soda",
    brand: "Soda Brand",
    health_score: 30,
    health_score_reason: "High chemical additive density with artificial sweeteners",
    safety_level: "danger",
    description: "Commercial soda drink",
    ingredients: [
      { name: "Carbonated Water", status: "safe", reason: "" },
      { name: "Caramel Color IV", status: "caution", reason: "Color" },
      { name: "Phosphoric Acid", status: "avoid", reason: "Inorganic acid" },
      { name: "Sodium Benzoate", status: "caution", reason: "Preservative" },
      { name: "Ascorbic Acid", status: "safe", reason: "Vitamin C" },
      { name: "Sucralose", status: "avoid", reason: "Artificial sweetener" },
      { name: "Acesulfame Potassium", status: "avoid", reason: "Artificial sweetener" }
    ],
    additives: [
      { name: "Phosphoric Acid", code: "E338", risk: "medium", description: "Acid" },
      { name: "Sodium Benzoate", code: "E211", risk: "high", description: "Preservative" },
      { name: "Ascorbic Acid", code: "E300", risk: "low", description: "Antioxidant" },
      { name: "Sucralose", code: "E955", risk: "medium", description: "Sweetener" },
      { name: "Acesulfame Potassium", code: "E950", risk: "medium", description: "Sweetener" }
    ],
    allergens: [],
    front_claims: ["Zero Sugar", "Natural Refreshment"],
    nutrition_facts: {
      panel_status: "extracted",
      serving_size: "250 ml",
      sugar_100g: "0",
      calories_100g: "0"
    },
    recommendations: []
  };

  const enriched = applyPreferences(rawFacts, ["kids-safe", "renal-kidney"]);

  assert(
    enriched.chemical_synergies !== undefined && enriched.chemical_synergies.length >= 2,
    "Pipeline enriches result with detected chemical synergies (Benzene + Sweetener cocktail)"
  );
  assert(
    enriched.greenwashing_flags !== undefined && enriched.greenwashing_flags.length >= 1,
    "Pipeline enriches result with greenwashing audit (Natural claim on synthetic cola)"
  );
  assert(
    enriched.dietary_compatibility !== undefined && enriched.dietary_compatibility.violations.length >= 2,
    "Pipeline enforces kids and renal dietary protections"
  );
  assert(
    enriched.smart_swaps !== undefined && enriched.smart_swaps.length > 0,
    "Pipeline attaches smart swaps for low-scoring ultra-processed items"
  );
}

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log("\n======================================================================");
console.log(`📊 TEST SUITE COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log("======================================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log("🏆 ALL UNBEATABLE FEATURES VERIFIED WITH ZERO FALSE CLAIMS!\n");
  process.exit(0);
}
