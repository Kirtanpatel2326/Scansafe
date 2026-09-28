import { z } from "zod";

export interface PreferenceDefinition {
  id: string;
  label: string;
  category: "allergen" | "diet" | "health_condition" | "lifestyle";
  description: string;
  aliases: string[];
  searchTerms: string[];
  exclusions: string[];
  declaredAllergenTriggers: string[];
  precautionaryTriggers: string[];
  disclaimer?: string;
}

export const CANONICAL_PREFERENCES: PreferenceDefinition[] = [
  {
    id: "gluten-free",
    label: "Gluten-Free",
    category: "allergen",
    description: "Strict exclusion of wheat, barley, rye, spelt, and other gluten-containing cereals.",
    aliases: ["gluten-free", "gluten free", "celiac", "coeliac", "allergy-wheat", "wheat-free", "wheat free", "no-gluten"],
    searchTerms: [
      "wheat", "barley", "rye", "spelt", "kamut", "triticale", "semolina", 
      "durum", "maida", "atta", "farina", "graham", "malt extract", "malt syrup", 
      "vital wheat gluten", "wheat flour", "wheat bran", "wheat germ", "wheat starch",
      "barley malt", "brewer's yeast", "malt vinegar"
    ],
    exclusions: [
      "rice flour", "brown rice flour", "white rice flour", "almond flour", 
      "coconut flour", "tapioca flour", "tapioca starch", "corn flour", 
      "corn starch", "cornstarch", "besan", "gram flour", "potato starch", 
      "potato flour", "buckwheat", "chickpea flour", "oat flour (certified gluten-free)", 
      "gluten-free oat", "gluten-free oats", "sorghum", "millet", "quinoa", "tapioca"
    ],
    declaredAllergenTriggers: ["gluten", "wheat", "barley", "rye", "spelt"],
    precautionaryTriggers: ["wheat", "gluten", "barley", "rye"],
    disclaimer: "Individuals with Celiac disease should verify dedicated certified gluten-free facility labeling."
  },
  {
    id: "dairy-free",
    label: "Dairy-Free / Milk Allergy",
    category: "allergen",
    description: "Complete exclusion of mammalian dairy proteins (casein, whey) and milk fats.",
    aliases: ["dairy-free", "dairy free", "allergy-milk", "milk-free", "milk free", "no-dairy", "casein-free", "whey-free"],
    searchTerms: [
      "butter", "dairy butter", "salted butter", "unsalted butter", "butter fat", "butterfat", "butter oil",
      "milk", "cow milk", "buffalo milk", "milk solids", "skimmed milk powder", "whole milk powder",
      "milk powder", "ghee", "clarified butter", "cream", "cheese", "paneer", "curd", "yogurt",
      "whey", "whey protein", "casein", "sodium caseinate", "calcium caseinate", "lactose", 
      "condensed milk", "milk fat", "buttermilk", "heavy cream", "sour cream", "anhydrous milk fat"
    ],
    exclusions: [
      "cocoa butter", "cacao butter", "peanut butter", "almond butter", 
      "sunflower butter", "shea butter", "apple butter", "fruit butter", 
      "mango butter", "kokum butter", "coconut butter", "cashew butter",
      "soy butter", "seed butter", "coconut milk", "almond milk", "soy milk", "oat milk"
    ],
    declaredAllergenTriggers: ["milk", "dairy", "butter", "cheese", "whey", "casein", "lactose"],
    precautionaryTriggers: ["milk", "dairy"]
  },
  {
    id: "lactose-free",
    label: "Lactose-Intolerant",
    category: "health_condition",
    description: "Exclusion of high-lactose dairy ingredients while permitting lactase-treated/lactose-free declared dairy.",
    aliases: ["lactose-free", "lactose free", "lactose-intolerance", "lactose intolerance", "low-lactose"],
    searchTerms: [
      "milk", "cow milk", "buffalo milk", "milk solids", "milk powder", "cream", "curd", "yogurt",
      "whey", "whey powder", "lactose", "condensed milk", "buttermilk", "fresh cheese", "ricotta"
    ],
    exclusions: [
      "lactose-free milk", "lactose free milk", "lactase enzyme", "ghee", "clarified butter",
      "hard cheese", "parmesan", "aged cheddar", "cocoa butter", "coconut milk", "almond milk", "soy milk"
    ],
    declaredAllergenTriggers: ["lactose"],
    precautionaryTriggers: ["milk", "lactose"],
    disclaimer: "Lactose tolerance thresholds vary. Hard aged cheeses and ghee contain only trace lactose."
  },
  {
    id: "nut-free",
    label: "Nut-Free (Peanuts & Tree Nuts)",
    category: "allergen",
    description: "Strict exclusion of peanuts and all botanical tree nuts.",
    aliases: ["nut-free", "nut free", "allergy-peanut", "allergy-tree-nut", "peanut-free", "tree-nut-free", "allergy-nut"],
    searchTerms: [
      "peanut", "peanuts", "groundnut", "groundnuts", "peanut oil", "peanut butter", "peanut flour",
      "almond", "almonds", "walnut", "walnuts", "cashew", "cashews", "hazelnut", "hazelnuts", 
      "pecan", "pecans", "pistachio", "pistachios", "macadamia", "brazil nut", "pine nut", "pine nuts",
      "chestnut", "chestnuts", "praline", "marzipan", "nougat", "cashew nut", "almond paste"
    ],
    exclusions: [
      "sunflower seed", "chia seed", "flax seed", "flaxseed", "pumpkin seed", 
      "sesame seed", "sesame", "tahini", "poppy seed", "hemp seed", "watermelon seed",
      "nutmeg", "coconut", "coconut oil", "coconut milk", "coconut water", "butternut squash"
    ],
    declaredAllergenTriggers: ["peanut", "peanuts", "tree nut", "tree nuts", "almond", "cashew", "walnut", "hazelnut", "pistachio", "pecan"],
    precautionaryTriggers: ["peanut", "tree nut", "almond", "cashew", "walnut", "hazelnut", "nut"]
  },
  {
    id: "soy-free",
    label: "Soy-Free",
    category: "allergen",
    description: "Exclusion of soybeans and all soy-derived proteins, flours, and isolates.",
    aliases: ["soy-free", "soy free", "allergy-soy", "soya-free", "soya free", "no-soy"],
    searchTerms: [
      "soy", "soya", "soybean", "soybeans", "soy protein", "soy protein isolate", "soy protein concentrate",
      "soy flour", "soy milk", "tofu", "tempeh", "edamame", "soy sauce", "tamari", "miso", "natto",
      "soy lecithin", "soya lecithin", "hydrolyzed soy protein", "textured vegetable protein"
    ],
    exclusions: [
      "soybean oil (highly refined)", "soybean oil"
    ],
    declaredAllergenTriggers: ["soy", "soya", "soybean"],
    precautionaryTriggers: ["soy", "soya"]
  },
  {
    id: "egg-free",
    label: "Egg-Free",
    category: "allergen",
    description: "Exclusion of poultry eggs and egg-derived proteins.",
    aliases: ["egg-free", "egg free", "allergy-egg", "no-egg"],
    searchTerms: [
      "egg", "eggs", "egg white", "egg yolk", "whole egg", "egg powder", "dried egg",
      "albumen", "ovalbumin", "ovomucoid", "lysozyme", "mayonnaise", "meringue", "globulin"
    ],
    exclusions: [
      "eggplant", "egg plant"
    ],
    declaredAllergenTriggers: ["egg", "eggs", "albumen"],
    precautionaryTriggers: ["egg", "eggs"]
  },
  {
    id: "fish-free",
    label: "Fish & Shellfish-Free",
    category: "allergen",
    description: "Exclusion of finfish, crustaceans, and mollusks.",
    aliases: ["fish-free", "fish free", "allergy-fish", "allergy-shellfish", "shellfish-free", "seafood-free"],
    searchTerms: [
      "fish", "salmon", "tuna", "cod", "anchovy", "anchovies", "sardine", "sardines", "mackerel", "trout",
      "fish sauce", "fish oil", "isinglass", "gelatin (fish)", "shrimp", "shrimps", "prawn", "prawns", 
      "crab", "crabs", "lobster", "lobsters", "crayfish", "clam", "clams", "mussel", "mussels", 
      "oyster", "oysters", "scallop", "scallops", "squid", "calamari", "octopus"
    ],
    exclusions: [],
    declaredAllergenTriggers: ["fish", "crustacean", "crustaceans", "shellfish", "mollusc", "molluscs"],
    precautionaryTriggers: ["fish", "crustacean", "shellfish"]
  },
  {
    id: "sesame-free",
    label: "Sesame-Free",
    category: "allergen",
    description: "Exclusion of sesame seeds, sesame oil, and sesame pastes.",
    aliases: ["sesame-free", "sesame free", "allergy-sesame", "no-sesame"],
    searchTerms: [
      "sesame", "sesame seed", "sesame seeds", "sesame oil", "tahini", "tahina", "gingelly", "til", "til oil", "benne"
    ],
    exclusions: [],
    declaredAllergenTriggers: ["sesame"],
    precautionaryTriggers: ["sesame"]
  },
  {
    id: "vegan",
    label: "Vegan",
    category: "diet",
    description: "Strict plant-based diet excluding all animal flesh, dairy, eggs, honey, and insect/animal byproducts.",
    aliases: ["vegan", "100% plant-based", "plant-based"],
    searchTerms: [
      "meat", "beef", "chicken", "pork", "lamb", "mutton", "fish", "gelatin", "lard", "tallow", 
      "carmine", "cochineal", "rennet", "animal rennet", "shellac", "confectioner's glaze", "beeswax", 
      "honey", "egg", "egg yolk", "egg white", "butter", "milk", "ghee", "cream", "cheese", "paneer", 
      "curd", "yogurt", "whey", "casein", "sodium caseinate", "vitamin d3 (cholecalciferol from lanolin)"
    ],
    exclusions: [
      "cocoa butter", "peanut butter", "coconut milk", "almond milk", "soy milk", "pectin", "agar", "carrageenan"
    ],
    declaredAllergenTriggers: ["milk", "dairy", "egg", "fish", "crustacean", "gelatin"],
    precautionaryTriggers: ["milk", "egg", "fish", "crustacean"]
  },
  {
    id: "vegetarian",
    label: "Vegetarian",
    category: "diet",
    description: "Lacto-vegetarian diet excluding meat, poultry, seafood, gelatin, and slaughterhouse byproducts.",
    aliases: ["vegetarian", "veg"],
    searchTerms: [
      "meat", "beef", "chicken", "pork", "lamb", "mutton", "fish", "salmon", "tuna", "prawn", "crab",
      "gelatin", "lard", "tallow", "carmine", "cochineal", "animal rennet"
    ],
    exclusions: [
      "milk", "butter", "cheese", "curd", "paneer", "ghee", "cream", "whey", "honey"
    ],
    declaredAllergenTriggers: ["fish", "crustacean"],
    precautionaryTriggers: ["fish", "crustacean"]
  },
  {
    id: "jain",
    label: "Jain Diet",
    category: "diet",
    description: "Strict vegetarian diet excluding meat, fish, eggs, gelatin, and root/underground vegetables.",
    aliases: ["jain", "jain diet"],
    searchTerms: [
      "meat", "beef", "chicken", "pork", "fish", "gelatin", "lard", "carmine", "egg", "egg white", "egg yolk",
      "onion", "garlic", "potato", "potatoes", "carrot", "carrots", "radish", "ginger", "beetroot", 
      "turnip", "sweet potato", "tapioca root", "yam", "shallot", "shallots", "onion powder", "garlic powder",
      "hing (compounded with root starch)"
    ],
    exclusions: [
      "ginger grass", "potato starch (distinguished)", "milk", "ghee", "butter"
    ],
    declaredAllergenTriggers: ["fish", "egg"],
    precautionaryTriggers: ["fish", "egg"]
  },
  {
    id: "diabetic",
    label: "Diabetic / Low-Sugar",
    category: "health_condition",
    description: "Screens for high added sugars, refined liquid syrups, and high-glycemic sweeteners.",
    aliases: ["diabetic", "diabetes", "low-sugar", "low sugar", "sugar-free", "sugar conscious"],
    searchTerms: [
      "sugar", "cane sugar", "high fructose corn syrup", "corn syrup", "glucose syrup", 
      "maltodextrin", "dextrose", "sucrose", "invert sugar syrup", "fructose syrup", "liquid glucose",
      "golden syrup", "corn syrup solids"
    ],
    exclusions: [
      "sugar alcohol", "erythritol", "stevia", "monk fruit", "sucralose"
    ],
    declaredAllergenTriggers: [],
    precautionaryTriggers: [],
    disclaimer: "Consult your endocrinologist for personalized glycemic load and carbohydrate counting targets."
  },
  {
    id: "hypertension",
    label: "Hypertension / Low-Sodium",
    category: "health_condition",
    description: "Screens for high sodium density, added table salt, monosodium glutamate (MSG), and sodium preservatives.",
    aliases: ["hypertension", "low-sodium", "low sodium", "salt-conscious", "high-blood-pressure"],
    searchTerms: [
      "salt", "sodium chloride", "monosodium glutamate", "msg", "sodium benzoate", "sodium nitrate", 
      "sodium nitrite", "baking soda", "disodium phosphate", "sodium bicarbonate"
    ],
    exclusions: [
      "potassium chloride", "salt substitute"
    ],
    declaredAllergenTriggers: [],
    precautionaryTriggers: [],
    disclaimer: "Low-sodium screening flags items exceeding sodium density thresholds."
  },
  {
    id: "cardiovascular",
    label: "Heart-Conscious / Cardiovascular",
    category: "health_condition",
    description: "Screens for industrial trans fatty acids, partially hydrogenated vegetable oils, interesterified fats, and excessive saturated fat.",
    aliases: ["cardiovascular", "heart-conscious", "heart health", "cardio", "heart-healthy"],
    searchTerms: [
      "partially hydrogenated", "hydrogenated vegetable oil", "hydrogenated palm oil", 
      "hydrogenated fat", "vanaspati", "margarine", "shortening", "interesterified fat"
    ],
    exclusions: [
      "olive oil", "extra virgin olive oil", "mustard oil", "sunflower oil", "avocado oil"
    ],
    declaredAllergenTriggers: [],
    precautionaryTriggers: [],
    disclaimer: "Heart-conscious screening highlights industrial trans fats and atherogenic hydrogenated matrices."
  },
  {
    id: "pregnancy",
    label: "Pregnancy-Safe Screening",
    category: "lifestyle",
    description: "Screens for high-risk ingredients during pregnancy: unpasteurized dairy/juices, raw cured meats, high-mercury predatory fish, saccharin, excessive synthetic stimulants.",
    aliases: ["pregnancy", "pregnancy-safe", "pregnant", "prenatal"],
    searchTerms: [
      "unpasteurized", "raw milk", "raw cheese", "swordfish", "shark", "king mackerel", "tilefish",
      "saccharin", "taurine", "caffeine anhydrous", "alcohol", "ethyl alcohol", "raw sprout"
    ],
    exclusions: [
      "pasteurized milk", "pasteurized cheese"
    ],
    declaredAllergenTriggers: [],
    precautionaryTriggers: [],
    disclaimer: "Pregnancy-safe screening flags specific high-risk food hazards. It is an educational tool and does not replace clinical prenatal care."
  }
];

export const DietaryCompatibilitySchema = z.object({
  is_compatible: z.boolean(),
  status: z.enum(["compatible", "incompatible", "precautionary_warning", "insufficient_data", "unsupported_preference"]).default("compatible"),
  matched_preferences: z.array(z.string()),
  violations: z.array(
    z.object({
      preference: z.string(),
      ingredient: z.string(),
      reason: z.string(),
    })
  ),
  allergen_warnings: z.array(z.string()),
  unsupported_preferences: z.array(z.string()).optional(),
  disclaimers: z.array(z.string()).optional()
});

export type DietaryCompatibility = z.infer<typeof DietaryCompatibilitySchema>;

/**
 * Splits a compound ingredient string into discrete clauses/tokens.
 * Correctly handles commas, semicolons, conjunctions ("and", "&", "with", "plus"),
 * and parenthetical nested sub-ingredient clauses.
 */
export function splitCompoundIngredients(rawName: string): string[] {
  if (!rawName || typeof rawName !== "string") return [];

  const tokens: string[] = [];
  const cleaned = rawName.trim();
  
  // Split on primary delimiters: commas, semicolons, brackets, parentheses
  const firstPass = cleaned
    .split(/[,;()\[\]]/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  // Split on conjunctions like ' and ', ' & ', ' with ', ' plus '
  for (const chunk of firstPass) {
    const subChunks = chunk
      .split(/\s+(?:and|&|with|plus|\+)\s+/i)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const sub of subChunks) {
      if (!tokens.includes(sub)) {
        tokens.push(sub);
      }
    }
  }

  return tokens.length > 0 ? tokens : [cleaned];
}

/**
 * Resolves a user preference string to its canonical definition.
 */
export function resolvePreference(prefInput: string): PreferenceDefinition | null {
  if (!prefInput) return null;
  const normalized = prefInput.toLowerCase().trim();

  for (const def of CANONICAL_PREFERENCES) {
    if (def.id === normalized || def.aliases.some(a => a.toLowerCase() === normalized || normalized.includes(a.toLowerCase()))) {
      return def;
    }
  }
  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Evaluates dietary compatibility with high-precision tokenized compound analysis.
 * Pure, deterministic, and non-mutating.
 */
export function evaluateDietaryCompatibility(
  ingredients: Array<{ name: string; status?: string; reason?: string }>,
  declaredAllergens: string[],
  userPreferences: string[],
  nutritionFacts?: any
): DietaryCompatibility {
  if (!userPreferences || userPreferences.length === 0) {
    return {
      is_compatible: true,
      status: "compatible",
      matched_preferences: [],
      violations: [],
      allergen_warnings: [],
      disclaimers: []
    };
  }

  const violations: Array<{ preference: string; ingredient: string; reason: string }> = [];
  const allergenWarnings: string[] = [];
  const unsupportedPreferences: string[] = [];
  const disclaimers: string[] = [];
  const activeDefs: PreferenceDefinition[] = [];

  // Step 1: Resolve all requested preferences against registry
  for (const p of userPreferences) {
    const def = resolvePreference(p);
    if (def) {
      if (!activeDefs.some(d => d.id === def.id)) {
        activeDefs.push(def);
        if (def.disclaimer) disclaimers.push(def.disclaimer);
      }
    } else {
      unsupportedPreferences.push(p);
    }
  }

  // If user provided unsupported preferences, flag warning
  if (unsupportedPreferences.length > 0) {
    const unsuppWarn = `Dietary preference '${unsupportedPreferences.join(", ")}' is not in the verified allergen registry and cannot be safely verified.`;
    if (!allergenWarnings.includes(unsuppWarn)) {
      allergenWarnings.push(unsuppWarn);
    }
    if (!disclaimers.includes("Please verify packaging directly for custom or unverified dietary restrictions.")) {
      disclaimers.push("Please verify packaging directly for custom or unverified dietary restrictions.");
    }
  }

  // Step 2: Check for completely empty packaging evidence
  const hasIngredients = ingredients && ingredients.length > 0;
  const hasDeclaredAllergens = declaredAllergens && declaredAllergens.length > 0;

  if (!hasIngredients && !hasDeclaredAllergens) {
    return {
      is_compatible: false,
      status: unsupportedPreferences.length > 0 && activeDefs.length === 0 ? "unsupported_preference" : "insufficient_data",
      matched_preferences: userPreferences,
      violations: [],
      allergen_warnings: ["Insufficient ingredient or allergen data on packaging to verify dietary compatibility."],
      unsupported_preferences: unsupportedPreferences.length > 0 ? unsupportedPreferences : undefined,
      disclaimers: disclaimers.length > 0 ? disclaimers : undefined
    };
  }

  // Step 3: Evaluate Discrete Ingredient Tokens
  if (hasIngredients) {
    for (const ing of ingredients) {
      const rawName = ing.name;
      const tokens = splitCompoundIngredients(rawName);

      for (const def of activeDefs) {
        for (const token of tokens) {
          const tokenLower = token.toLowerCase().trim();

          // Check if this token matches search terms
          for (const term of def.searchTerms) {
            const termLower = term.toLowerCase().trim();
            const regex = new RegExp(`\\b${escapeRegex(termLower)}\\b`, "i");
            
            if (regex.test(tokenLower) || tokenLower.includes(termLower)) {
              // Check if this specific token is explicitly and legitimately excluded
              // Guard: exclusions (e.g. "pasteurized milk") CANNOT suppress negation/hazard prefixes (e.g. "unpasteurized", "non-pasteurized", "raw")
              const isExcluded = def.exclusions.some(ex => {
                const exLower = ex.toLowerCase().trim();
                
                // If token contains unpasteurized/raw hazard, exclusion for pasteurized does not apply
                if (/\b(?:un|non[- ]|raw[- ])/i.test(tokenLower)) {
                  return false;
                }
                
                const exRegex = new RegExp(`\\b${escapeRegex(exLower)}\\b`, "i");
                return exRegex.test(tokenLower) || tokenLower === exLower;
              });

              if (!isExcluded) {
                violations.push({
                  preference: def.label,
                  ingredient: rawName,
                  reason: `${token} contains ${term} (${def.label}).`
                });
                break; // avoid duplicate violations for same token & def
              }
            }
          }
        }
      }
    }
  }

  // Step 4: Evaluate Declared & Precautionary Allergen Statements
  let hasPrecautionary = false;
  if (hasDeclaredAllergens) {
    for (const decl of declaredAllergens) {
      const declLower = decl.toLowerCase();
      const isPrecautionary = declLower.includes("may contain") || declLower.includes("facility") || declLower.includes("trace");

      for (const def of activeDefs) {
        const matchesDeclared = def.declaredAllergenTriggers.some(t => {
          const reg = new RegExp(`\\b${escapeRegex(t.toLowerCase())}\\b`, "i");
          return reg.test(declLower);
        });

        if (matchesDeclared) {
          const warnText = isPrecautionary ? `Precautionary: ${decl}` : `Declared Allergen: ${decl}`;
          if (!allergenWarnings.includes(warnText)) {
            allergenWarnings.push(warnText);
          }
          if (isPrecautionary) hasPrecautionary = true;
        }
      }
    }
  }

  // Step 5: If ingredients list is EMPTY, declared allergens only certify what is specifically listed!
  // An unrelated declared allergen (e.g. "Gluten-Free") CANNOT prove soy-free, nut-free, or dairy-free status!
  if (!hasIngredients) {
    for (const def of activeDefs) {
      const isAddressed = declaredAllergens.some(d => {
        const dl = d.toLowerCase().trim();
        
        // 1. Explicit mention of allergen trigger for this specific preference
        const mentionsTrigger = def.declaredAllergenTriggers.some(t => {
          const reg = new RegExp(`\\b${escapeRegex(t.toLowerCase())}\\b`, "i");
          return reg.test(dl);
        });

        // 2. Explicit verified negative/free claim for THIS specific preference
        const mentionsDirectClaim = def.aliases.some(a => {
          const reg = new RegExp(`\\b${escapeRegex(a.toLowerCase())}\\b`, "i");
          return reg.test(dl);
        }) || dl === def.id || dl === def.label.toLowerCase();

        return mentionsTrigger || mentionsDirectClaim;
      });

      if (!isAddressed && (def.category === "allergen" || def.category === "diet" || def.category === "health_condition")) {
        return {
          is_compatible: false,
          status: "insufficient_data",
          matched_preferences: userPreferences,
          violations,
          allergen_warnings: [
            ...allergenWarnings,
            `Packaging lacks full ingredient list to verify absence of ${def.label}.`
          ],
          unsupported_preferences: unsupportedPreferences.length > 0 ? unsupportedPreferences : undefined,
          disclaimers: disclaimers.length > 0 ? disclaimers : undefined
        };
      }
    }
  }

  // Step 6: Compute final compatibility status
  // Fail-closed: unsupported preferences, violations, or active declared allergens disqualify compatibility
  let status: "compatible" | "incompatible" | "precautionary_warning" | "insufficient_data" | "unsupported_preference" = "compatible";
  let isCompatible = true;

  if (violations.length > 0 || allergenWarnings.some(w => w.startsWith("Declared Allergen:"))) {
    status = "incompatible";
    isCompatible = false;
  } else if (unsupportedPreferences.length > 0) {
    status = "unsupported_preference";
    isCompatible = false;
  } else if (hasPrecautionary || allergenWarnings.some(w => w.startsWith("Precautionary:"))) {
    status = "precautionary_warning";
    isCompatible = false;
  }

  return {
    is_compatible: isCompatible,
    status,
    matched_preferences: userPreferences,
    violations,
    allergen_warnings: allergenWarnings,
    unsupported_preferences: unsupportedPreferences.length > 0 ? unsupportedPreferences : undefined,
    disclaimers: disclaimers.length > 0 ? disclaimers : undefined
  };
}
