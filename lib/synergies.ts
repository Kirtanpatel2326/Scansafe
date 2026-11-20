/**
 * ScanSafe Combinatorial Chemical Interaction Engine
 * Detects dangerous additive cocktails, synergistic health hazards,
 * and chemical reaction formations when specific food additives co-exist in a single product.
 */

export interface ChemicalSynergy {
  id: string;
  title: string;
  severity: "high" | "medium" | "critical";
  category: "carcinogen_precursor" | "neuro_behavioral" | "gut_barrier" | "metabolic_toxicity" | "cardiovascular";
  ingredients_involved: string[];
  mechanism: string;
  scientific_reference: string;
  clinical_verdict: string;
}

export interface SynergyRule {
  id: string;
  title: string;
  severity: "high" | "medium" | "critical";
  category: ChemicalSynergy["category"];
  triggerGroupA: string[];
  triggerGroupB: string[];
  triggerGroupC?: string[];
  mechanism: string;
  scientific_reference: string;
  clinical_verdict: string;
}

export const SYNERGY_RULES: SynergyRule[] = [
  {
    id: "benzene_formation",
    title: "Benzene Carcinogen Formation Risk",
    severity: "critical",
    category: "carcinogen_precursor",
    triggerGroupA: [
      "sodium benzoate", "potassium benzoate", "benzoic acid", "e211", "e212", "e210", "benzoate"
    ],
    triggerGroupB: [
      "ascorbic acid", "vitamin c", "citric acid", "e300", "e330", "sodium ascorbate", "calcium ascorbate"
    ],
    mechanism: "When benzoate preservatives (E211/E212) combine with ascorbic acid (Vitamin C) or citric acid in the presence of trace transition metals (iron/copper), heat, or UV light, decarboxylation can form trace benzene—a Group 1 human carcinogen.",
    scientific_reference: "US FDA Beverage Safety Study & Gardner et al., J. Agric. Food Chem.",
    clinical_verdict: "High-priority concern. Avoid storing this product in warm conditions or sunlight."
  },
  {
    id: "southampton_adhd_cocktail",
    title: "Southampton ADHD & Hyperactivity Dye Cocktail",
    severity: "high",
    category: "neuro_behavioral",
    triggerGroupA: [
      "sodium benzoate", "potassium benzoate", "e211", "e212"
    ],
    triggerGroupB: [
      "tartrazine", "e102", "sunset yellow", "e110", "allura red", "e129", 
      "quinoline yellow", "e104", "carmoisine", "e122", "ponceau 4r", "e124", 
      "brilliant blue", "e133", "yellow 5", "yellow 6", "red 40"
    ],
    mechanism: "The combination of sodium benzoate preservative with azo/synthetic food dyes creates a documented neuro-behavioral synergy linked to increased hyperactivity, impulsivity, and attention deficits in children.",
    scientific_reference: "The Lancet (McCann et al., 2007 Southampton Study); EU Regulation (EC) No 1333/2008 warning label mandate.",
    clinical_verdict: "European health authorities mandate the warning label: 'May have an adverse effect on activity and attention in children'."
  },
  {
    id: "gut_mucosal_barrier_breakdown",
    title: "Synergistic Gut Mucosal Barrier Disruption",
    severity: "high",
    category: "gut_barrier",
    triggerGroupA: [
      "polysorbate 80", "polysorbate", "e433", "polyoxyethylene sorbitan monooleate"
    ],
    triggerGroupB: [
      "carboxymethylcellulose", "carboxymethyl cellulose", "cmc", "e466", "sodium carboxymethylcellulose", "cellulose gum"
    ],
    mechanism: "Simultaneous consumption of synthetic detergent-like emulsifiers (Polysorbate 80) and cellulose gum (CMC) synergistically degrades the protective intestinal mucus layer, allowing bacteria to encroach against intestinal epithelial cells and triggering low-grade systemic inflammation.",
    scientific_reference: "Nature (Chassaing et al., 2015; Gastroenterology 2021 Clinical Human Trial).",
    clinical_verdict: "Particularly hazardous for individuals with IBS, Crohn's disease, Ulcerative Colitis, or chronic gut dysbiosis."
  },
  {
    id: "nitrosamine_formation",
    title: "Apparent Nitrosamine Carcinogen Precursor",
    severity: "critical",
    category: "carcinogen_precursor",
    triggerGroupA: [
      "sodium nitrite", "potassium nitrite", "e250", "e249", "sodium nitrate", "e251"
    ],
    triggerGroupB: [
      "meat", "pork", "bacon", "ham", "sausage", "collagen", "chicken", "turkey", "beef", 
      "poultry", "pepperoni", "salami", "hot dog", "frankfurter", "cured meat",
      "hydrolyzed protein", "hydrolyzed soy protein", "hydrolyzed vegetable protein", 
      "hvp", "yeast extract", "secondary amine", "protein isolate"
    ],
    mechanism: "Inorganic nitrite salts reacting with protein-derived amines under gastric acid or high-temperature cooking form N-nitroso compounds (nitrosamines), strongly linked to colorectal and stomach neoplasms.",
    scientific_reference: "IARC / WHO Monograph on Cured Meats & Colorectal Cancer; European Food Safety Authority (EFSA 2023).",
    clinical_verdict: "Classified as Group 1 carcinogenic hazard by the World Health Organization."
  },
  {
    id: "phosphate_calcium_depletion",
    title: "Inorganic Phosphate Overload & Mineral Leaching",
    severity: "medium",
    category: "cardiovascular",
    triggerGroupA: [
      "phosphoric acid", "e338"
    ],
    triggerGroupB: [
      "disodium phosphate", "trisodium phosphate", "sodium tripolyphosphate", "e339", "e450", "e451", "e452", "pyrophosphate"
    ],
    mechanism: "High inorganic free phosphate additives have a near 100% absorption rate (unlike organic plant phosphates at 30-50%). Co-presence creates acute serum phosphate spikes that disrupt calcium-phosphorus homeostasis, leaching calcium from bone and accelerating arterial calcification.",
    scientific_reference: "Deutsches Ärzteblatt Int. (Ritz et al., 2012) & American Society of Nephrology.",
    clinical_verdict: "Accelerates vascular stiffness and renal stress. Highly contraindicated in kidney conditions."
  },
  {
    id: "artificial_sweetener_insulin_synergy",
    title: "Multi-Sweetener Metabolic & Gut Microbiome Shift",
    severity: "medium",
    category: "metabolic_toxicity",
    triggerGroupA: [
      "sucralose", "e955"
    ],
    triggerGroupB: [
      "acesulfame potassium", "acesulfame k", "ace-k", "e950", "aspartame", "e951"
    ],
    mechanism: "Blending high-intensity artificial sweeteners stimulates sweet taste receptors in the gut (T1R2/T1R3), synergistically priming cephalic phase insulin release while altering the bacteroidetes-to-firmicutes ratio in gut flora.",
    scientific_reference: "Cell Metabolism (Suez et al., 2022) & WHO Guidelines on Non-Sugar Sweeteners (2023).",
    clinical_verdict: "Regular intake may worsen insulin resistance and disrupt satiety signaling."
  }
];

/**
 * Normalizes an ingredient or additive name for fuzzy token matching.
 */
function normalizeToken(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Detects all active chemical synergies present in a set of product ingredients and additives.
 */
export function detectChemicalSynergies(
  ingredients: Array<{ name: string; status?: string }>,
  additives: Array<{ name: string; code?: string | null; risk?: string }> = []
): ChemicalSynergy[] {
  if ((!ingredients || ingredients.length === 0) && (!additives || additives.length === 0)) {
    return [];
  }

  // Combine and normalize all ingredient & additive strings
  const combinedTokens: Array<{ raw: string; normalized: string }> = [];

  for (const ing of ingredients || []) {
    if (ing?.name) {
      combinedTokens.push({ raw: ing.name, normalized: normalizeToken(ing.name) });
    }
  }

  for (const add of additives || []) {
    if (add?.name) {
      combinedTokens.push({ raw: add.name, normalized: normalizeToken(add.name) });
    }
    if (add?.code) {
      combinedTokens.push({ raw: add.code, normalized: normalizeToken(add.code) });
    }
  }

  const detected: ChemicalSynergy[] = [];

  for (const rule of SYNERGY_RULES) {
    const matchA = findMatchingTokens(combinedTokens, rule.triggerGroupA);
    const matchB = findMatchingTokens(combinedTokens, rule.triggerGroupB);

    if (matchA.length > 0 && matchB.length > 0) {
      // If rule has an optional Group C, check it as well
      if (rule.triggerGroupC && rule.triggerGroupC.length > 0) {
        const matchC = findMatchingTokens(combinedTokens, rule.triggerGroupC);
        if (matchC.length === 0) continue;
      }

      const uniqueInvolved = Array.from(new Set([...matchA, ...matchB]));

      detected.push({
        id: rule.id,
        title: rule.title,
        severity: rule.severity,
        category: rule.category,
        ingredients_involved: uniqueInvolved,
        mechanism: rule.mechanism,
        scientific_reference: rule.scientific_reference,
        clinical_verdict: rule.clinical_verdict
      });
    }
  }

  return detected;
}

function findMatchingTokens(
  tokens: Array<{ raw: string; normalized: string }>,
  triggers: string[]
): string[] {
  const matches: string[] = [];

  for (const trigger of triggers) {
    const normTrigger = normalizeToken(trigger);
    for (const token of tokens) {
      // Exact word boundary or substring match
      if (
        token.normalized === normTrigger ||
        token.normalized.includes(` ${normTrigger} `) ||
        token.normalized.startsWith(`${normTrigger} `) ||
        token.normalized.endsWith(` ${normTrigger}`) ||
        token.normalized.includes(normTrigger)
      ) {
        if (!matches.includes(token.raw)) {
          matches.push(token.raw);
        }
      }
    }
  }

  return matches;
}
