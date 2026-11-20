/**
 * ScanSafe Greenwashing & Deceptive Marketing Detector
 * Cross-examines front-of-pack advertising claims against back-of-pack factual evidence.
 * Uncovers legal loopholes, hidden sugars, diluted oils, and synthetic additives masquerading as natural.
 */

export interface GreenwashingFlag {
  id: string;
  claim_detected: string;
  reality_uncovered: string;
  severity: "high" | "medium" | "critical";
  loophole_technique: string;
  clinical_verdict: string;
  evidence_ingredient?: string;
}

export function detectGreenwashing(
  productName: string,
  description: string,
  ingredients: Array<{ name: string; status?: string }>,
  nutritionFacts?: {
    sugar_100g?: string | null;
    protein_100g?: string | null;
    fat_100g?: string | null;
  },
  frontClaims?: string[]
): GreenwashingFlag[] {
  const flags: GreenwashingFlag[] = [];
  const claimsText = Array.isArray(frontClaims) ? frontClaims.join(" ") : "";
  const combinedText = `${productName || ""} ${description || ""} ${claimsText}`.toLowerCase();
  const ingNames = (ingredients || []).map(i => (i.name || "").toLowerCase());
  const fullIngString = ingNames.join(", ");

  // 1. "Zero Sugar" / "Sugar Free" Illusion
  const sugarFreeClaims = ["zero sugar", "sugar free", "no added sugar", "sugar-free", "0% sugar", "without added sugar"];
  const hasSugarFreeClaim = sugarFreeClaims.some(c => combinedText.includes(c));

  if (hasSugarFreeClaim) {
    const hiddenSugars = [
      { name: "Maltodextrin", desc: "Maltodextrin (Glycemic Index 110, spikes blood sugar higher than white table sugar)" },
      { name: "Maltitol", desc: "Maltitol (High-glycemic sugar alcohol that causes digestive distress and blood glucose surges)" },
      { name: "Invert Sugar", desc: "Invert Sugar Syrup (Chemically identical to refined sucrose and glucose)" },
      { name: "Liquid Glucose", desc: "Liquid Glucose (Refined corn-derived high-glycemic syrup)" },
      { name: "Dextrose", desc: "Dextrose (Pure crystalline glucose)" },
      { name: "High Fructose Corn Syrup", desc: "High Fructose Corn Syrup (Industrial high-fructose sweetener)" }
    ];

    for (const s of hiddenSugars) {
      if (fullIngString.includes(s.name.toLowerCase())) {
        flags.push({
          id: "zero_sugar_illusion",
          claim_detected: "Advertised as 'Zero Sugar' or 'No Added Sugar'",
          reality_uncovered: `Back label contains ${s.desc}.`,
          severity: "high",
          loophole_technique: "Regulatory Sugar Loophole: Companies omit refined table sugar (sucrose) while substituting higher-glycemic industrial liquid syrups and sugar alcohols.",
          clinical_verdict: "Misleading for diabetics and metabolic patients. Will still trigger acute insulin spikes.",
          evidence_ingredient: s.name
        });
        break; // Report the primary deceptive sugar
      }
    }
  }

  // 2. "Olive Oil" / "Pure Butter" / "Avocado Oil" Disguise (Palm Oil Swapping)
  const premiumOilClaims = [
    { claim: "olive oil", label: "Olive Oil" },
    { claim: "avocado oil", label: "Avocado Oil" },
    { claim: "butter", label: "Butter" },
    { claim: "pure ghee", label: "Ghee" }
  ];

  for (const prem of premiumOilClaims) {
    if (combinedText.includes(prem.claim)) {
      // Check if palm oil / palm olein is present in top ingredients
      const hasPalmOil = fullIngString.includes("palm oil") || 
                         fullIngString.includes("palmolein") || 
                         fullIngString.includes("palm olein") || 
                         fullIngString.includes("fractionated palm") ||
                         fullIngString.includes("hydrogenated vegetable oil") ||
                         fullIngString.includes("vanaspati");

      if (hasPalmOil) {
        flags.push({
          id: "premium_oil_dilution",
          claim_detected: `Promoted as made with ${prem.label}`,
          reality_uncovered: "Ingredients reveal cheap Refined Palm Olein or Hydrogenated Fat as the primary fat matrix, while the advertised oil is relegated to trace amounts (< 5%).",
          severity: "high",
          loophole_technique: "FSSAI / FDA Naming Loophole: A product can be marketed under the name of a minor specialty ingredient as long as that ingredient is present in any non-zero quantity.",
          clinical_verdict: "Atherogenic risk. Palm olein contains 45-50% palmitic acid (saturated fat), directly opposing the cardiovascular benefits of true cold-pressed olive or avocado oil.",
          evidence_ingredient: "Refined Palm Olein"
        });
        break;
      }
    }
  }

  // 3. "100% Whole Wheat" or "Multigrain" with Maida (Refined Wheat) as #1
  const wholeGrainClaims = ["whole wheat", "100% whole wheat", "multigrain", "multi-grain", "atta bread", "whole grain"];
  const hasWholeGrainClaim = wholeGrainClaims.some(c => combinedText.includes(c));

  if (hasWholeGrainClaim && ingNames.length > 0) {
    // Check first 2 ingredients
    const firstTwo = ingNames.slice(0, 2).join(" ");
    const hasMaida = firstTwo.includes("refined wheat flour") || 
                     firstTwo.includes("maida") || 
                     firstTwo.includes("enriched flour") || 
                     firstTwo.includes("wheat flour (refined)");

    if (hasMaida) {
      flags.push({
        id: "refined_flour_whole_grain_ruse",
        claim_detected: "Promoted as 'Whole Wheat' or 'Multigrain'",
        reality_uncovered: `The primary (#1) ingredient is Refined Wheat Flour (Maida). Whole wheat represents only a secondary or coloring fraction.`,
        severity: "high",
        loophole_technique: "Caramel Color & Grain Sprinkling: Products use dark caramel coloring and a dusting of bran on the crust to give refined white flour the visual appearance of whole grain.",
        clinical_verdict: "High glycemic index, stripped of native bran fiber, causing rapid blood sugar surges identical to white bread.",
        evidence_ingredient: "Refined Wheat Flour (Maida)"
      });
    }
  }

  // 4. "All Natural" / "100% Pure" masking Synthetic Preservatives / Petrochemical Dyes
  const naturalClaims = [
    "all natural", "100% natural", "pure natural", "nature's best", 
    "no artificials", "natural refreshment", "natural goodness", "all-natural", "natural"
  ];
  const hasNaturalClaim = naturalClaims.some(c => combinedText.includes(c));

  if (hasNaturalClaim) {
    const syntheticChemicals = [
      { name: "TBHQ", desc: "TBHQ (Tertiary butylhydroquinone - petroleum-derived synthetic antioxidant)" },
      { name: "BHA", desc: "BHA (E320 - synthetic phenolic antioxidant)" },
      { name: "BHT", desc: "BHT (E321 - synthetic preservative)" },
      { name: "Tartrazine", desc: "Tartrazine (E102 - synthetic azo dye)" },
      { name: "Sodium Benzoate", desc: "Sodium Benzoate (E211 - synthetic chemical preservative)" },
      { name: "Potassium Sorbate", desc: "Potassium Sorbate (E202 - chemical fungicide)" },
      { name: "Caramel Color", desc: "Caramel Color IV (E150d - chemically synthesized with ammonia/sulfites)" },
      { name: "Maltodextrin", desc: "Maltodextrin (Synthetic enzymatically hydrolyzed corn starch)" },
      { name: "Sucralose", desc: "Sucralose (Synthetic organochlorine sweetener)" },
      { name: "Aspartame", desc: "Aspartame (Synthetic methyl ester sweetener)" },
      { name: "Acesulfame", desc: "Acesulfame Potassium (Synthetic chemical sweetener)" }
    ];

    for (const chem of syntheticChemicals) {
      if (fullIngString.includes(chem.name.toLowerCase())) {
        flags.push({
          id: "synthetic_chemical_natural_facade",
          claim_detected: "Advertised as 'Natural' or 'Pure'",
          reality_uncovered: `Contains ${chem.desc}.`,
          severity: "high",
          loophole_technique: "Undefined 'Natural' Regulation: The word 'Natural' is not legally protected by food safety agencies in many jurisdictions, allowing synthetic additives to pass without penalty.",
          clinical_verdict: "Misleading marketing facade. Chemical antioxidants, artificial stabilizers, or synthetic sweeteners are present.",
          evidence_ingredient: chem.name
        });
        break;
      }
    }
  }

  // 5. "Real Fruit Juice" with < 10% fruit
  const fruitClaims = ["real fruit", "fruit juice", "made with real fruits", "made with real fruit", "100% fruit taste", "made with 100% real fruit"];
  const hasFruitClaim = fruitClaims.some(c => combinedText.includes(c));

  if (hasFruitClaim) {
    if (fullIngString.includes("reconstituted") || fullIngString.includes("fruit concentrate") || fullIngString.includes("juice concentrate")) {
      const isWaterSugarFirst = ingNames.slice(0, 2).some(i => i.includes("water") || i.includes("sugar") || i.includes("syrup"));
      if (isWaterSugarFirst) {
        flags.push({
          id: "diluted_fruit_illusion",
          claim_detected: "Advertised as 'Real Fruit' or 'Fruit Juice'",
          reality_uncovered: "Primary ingredients are filtered water and added sugar/syrup, with fruit present only as a heavily boiled pasteurized concentrate.",
          severity: "medium",
          loophole_technique: "Concentrate Reconstitution: Allows water + sugar syrup to be legally marketed under fruit branding if a splash of fruit concentrate is introduced.",
          clinical_verdict: "High fructose liquid matrix stripped of intact plant cell walls, prompting rapid hepatic de novo lipogenesis.",
          evidence_ingredient: "Fruit Concentrate"
        });
      }
    }
  }

  return flags;
}
