/**
 * ScanSafe Smart Swap Engine ("Buy This Instead")
 * Recommends clean, verified, healthier product alternatives when a scanned food item
 * contains hazardous additives, ultra-processed fillers, deceptive sugars, or poor nutritional metrics.
 */

export interface SmartSwapItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  why_better: string;
  health_score: number;
  clean_badges: string[];
  estimated_price_inr: number;
  quick_links: {
    blinkit?: string;
    zepto?: string;
    bigbasket?: string;
    amazon?: string;
  };
}

export interface SmartSwapCatalog {
  category: string;
  triggers: string[];
  alternatives: SmartSwapItem[];
}

export const VERIFIED_SMART_SWAP_CATALOG: SmartSwapCatalog[] = [
  {
    category: "Biscuits, Cookies & Crackers",
    triggers: ["cookie", "biscuit", "cookies", "biscuits", "cracker", "wafer", "rusk", "parle", "good day", "marie", "bourbon", "oreo"],
    alternatives: [
      {
        id: "swap_biscuit_01",
        name: "100% Whole Wheat Sourdough Crackers",
        brand: "The Whole Truth",
        category: "Biscuits & Crackers",
        why_better: "Zero palm oil, zero chemical leavening agents, sweetened only with real cold-pressed butter and stoneground wheat.",
        health_score: 92,
        clean_badges: ["Zero Palm Oil", "No Invert Sugar", "No Preservatives", "Stoneground"],
        estimated_price_inr: 120,
        quick_links: {
          blinkit: "https://blinkit.com/s/?q=The+Whole+Truth+Crackers",
          bigbasket: "https://www.bigbasket.com/ps/?q=The+Whole+Truth+Crackers"
        }
      },
      {
        id: "swap_biscuit_02",
        name: "Organic Ragi & Almond Baby/Family Cookies",
        brand: "Early Foods",
        category: "Biscuits & Crackers",
        why_better: "Zero maida, zero baking soda, sweetened only with organic jaggery and dates. 100% whole millets.",
        health_score: 95,
        clean_badges: ["Zero Maida", "Zero White Sugar", "Traditional Millets"],
        estimated_price_inr: 175,
        quick_links: {
          blinkit: "https://blinkit.com/s/?q=Early+Foods+Ragi+Cookies",
          amazon: "https://www.amazon.in/s?k=Early+Foods+Ragi+Cookies"
        }
      }
    ]
  },
  {
    category: "Protein Bars & Energy Snacks",
    triggers: ["protein bar", "energy bar", "granola bar", "nutrition bar", "snack bar", "cereal bar"],
    alternatives: [
      {
        id: "swap_protein_01",
        name: "100% Clean Whey Protein Bar (Cocoa Cranberry)",
        brand: "The Whole Truth",
        category: "Protein Bars",
        why_better: "Zero maltitol, zero artificial sweeteners, zero soy isolate. Only 5 clean ingredients: dates, cashews, whey protein, cocoa, cranberries.",
        health_score: 94,
        clean_badges: ["Zero Maltitol", "No Palm Oil", "Clean Protein", "No Artificial Sweeteners"],
        estimated_price_inr: 130,
        quick_links: {
          blinkit: "https://blinkit.com/s/?q=The+Whole+Truth+Protein+Bar",
          zepto: "https://www.zeptonow.com/search?q=The+Whole+Truth+Protein+Bar"
        }
      },
      {
        id: "swap_protein_02",
        name: "Whole Nut & Seed Energy Bar",
        brand: "Yogabar",
        category: "Protein Bars",
        why_better: "Over 80% whole nuts and seeds, zero high fructose corn syrup, sweetened with real honey and dates.",
        health_score: 89,
        clean_badges: ["High Fiber", "Whole Nuts", "No Hydrogenated Fat"],
        estimated_price_inr: 60,
        quick_links: {
          blinkit: "https://blinkit.com/s/?q=Yogabar+Nut+Bar",
          bigbasket: "https://www.bigbasket.com/ps/?q=Yogabar+Nut+Bar"
        }
      }
    ]
  },
  {
    category: "Instant Noodles & Pasta",
    triggers: ["noodle", "noodles", "instant noodle", "ramen", "maggi", "pasta", "macaroni", "spaghetti", "chowmein"],
    alternatives: [
      {
        id: "swap_noodle_01",
        name: "Sun-Dried Foxtail & Little Millet Noodles",
        brand: "Slurrp Farm",
        category: "Noodles & Pasta",
        why_better: "Never deep-fried in palm oil (sun-dried), zero maida, zero MSG, zero petroleum-derived TBHQ antioxidant.",
        health_score: 91,
        clean_badges: ["Never Fried", "Zero Palm Oil", "Zero TBHQ", "100% Millets"],
        estimated_price_inr: 89,
        quick_links: {
          blinkit: "https://blinkit.com/s/?q=Slurrp+Farm+Millet+Noodles",
          bigbasket: "https://www.bigbasket.com/ps/?q=Slurrp+Farm+Millet+Noodles"
        }
      },
      {
        id: "swap_noodle_02",
        name: "100% Chickpea & Oats Pasta",
        brand: "WickedGud",
        category: "Noodles & Pasta",
        why_better: "High protein and 3x more prebiotic fiber than refined maida pasta. Low glycemic index.",
        health_score: 93,
        clean_badges: ["High Protein", "Prebiotic Fiber", "Gluten-Free Friendly"],
        estimated_price_inr: 149,
        quick_links: {
          blinkit: "https://blinkit.com/s/?q=WickedGud+Pasta",
          amazon: "https://www.amazon.in/s?k=WickedGud+Pasta"
        }
      }
    ]
  },
  {
    category: "Chips, Crisps & Namkeen",
    triggers: ["chips", "crisps", "potato chips", "namkeen", "bhujia", "kurkure", "lays", "bingo", "nachos", "tortilla"],
    alternatives: [
      {
        id: "swap_chips_01",
        name: "Air-Popped Potato Chips (Zero Deep Fry)",
        brand: "TagZ",
        category: "Chips & Crisps",
        why_better: "Popped with heat and pressure rather than boiled in oxidized palm olein. 50% less fat, zero trans fat.",
        health_score: 87,
        clean_badges: ["Popped Not Fried", "Zero Palm Oil", "Zero Trans Fat"],
        estimated_price_inr: 60,
        quick_links: {
          blinkit: "https://blinkit.com/s/?q=TagZ+Popped+Chips",
          zepto: "https://www.zeptonow.com/search?q=TagZ+Popped+Chips"
        }
      },
      {
        id: "swap_chips_02",
        name: "Baked Sourdough Pita Crisps with Olive Oil",
        brand: "The Whole Truth",
        category: "Chips & Crisps",
        why_better: "Naturally fermented sourdough baked with 100% extra virgin olive oil. Zero artificial colors or MSG.",
        health_score: 92,
        clean_badges: ["Extra Virgin Olive Oil", "Real Sourdough", "Zero Synthetic Dyes"],
        estimated_price_inr: 99,
        quick_links: {
          blinkit: "https://blinkit.com/s/?q=The+Whole+Truth+Pita+Chips"
        }
      }
    ]
  },
  {
    category: "Peanut Butter & Nut Spreads",
    triggers: ["peanut butter", "hazelnut spread", "nutella", "spread", "almond butter", "chocolate spread"],
    alternatives: [
      {
        id: "swap_pb_01",
        name: "100% All-Natural Peanut Butter (Crunchy)",
        brand: "Pintola",
        category: "Spreads",
        why_better: "Only 1 single ingredient: 100% roasted bold peanuts. Zero added sugar, zero hydrogenated vegetable oil, zero emulsifiers.",
        health_score: 96,
        clean_badges: ["Single Ingredient", "Zero Hydrogenated Oil", "Zero Added Sugar"],
        estimated_price_inr: 165,
        quick_links: {
          blinkit: "https://blinkit.com/s/?q=Pintola+All+Natural+Peanut+Butter",
          amazon: "https://www.amazon.in/s?k=Pintola+All+Natural+Peanut+Butter"
        }
      }
    ]
  },
  {
    category: "Breakfast Cereals & Muesli",
    triggers: ["cereal", "muesli", "granola", "corn flakes", "chocos", "froot loops", "oats", "breakfast"],
    alternatives: [
      {
        id: "swap_cereal_01",
        name: "100% Rolled Jumbo Oats with Whole Chia Seeds",
        brand: "True Elements",
        category: "Breakfast Cereals",
        why_better: "Zero added sugar, zero high-fructose corn syrup, rich in beta-glucan heart-healthy soluble fiber.",
        health_score: 95,
        clean_badges: ["Zero Added Sugar", "Beta-Glucan Rich", "Clean Carb Matrix"],
        estimated_price_inr: 199,
        quick_links: {
          blinkit: "https://blinkit.com/s/?q=True+Elements+Rolled+Oats",
          bigbasket: "https://www.bigbasket.com/ps/?q=True+Elements+Rolled+Oats"
        }
      }
    ]
  },
  {
    category: "Chocolates & Confectionery",
    triggers: ["chocolate", "candy", "sweet", "cadbury", "dairy milk", "kitkat", "snickers", "toffee"],
    alternatives: [
      {
        id: "swap_choco_01",
        name: "70% Single Origin Dark Chocolate",
        brand: "Paul and Mike",
        category: "Chocolates",
        why_better: "Crafted with pure cocoa butter. Zero palm oil, zero synthetic vanillin, rich in polyphenols and flavanols.",
        health_score: 90,
        clean_badges: ["Pure Cocoa Butter", "No Palm Fat", "Rich Polyphenols"],
        estimated_price_inr: 250,
        quick_links: {
          blinkit: "https://blinkit.com/s/?q=Paul+and+Mike+Dark+Chocolate",
          amazon: "https://www.amazon.in/s?k=Paul+and+Mike+Dark+Chocolate"
        }
      }
    ]
  }
];

/**
 * Finds high-quality clean smart swaps for a given scanned product.
 * Returns targeted swaps if product has safety or nutritional issues,
 * or general clean-eating alternatives.
 */
export function getSmartSwaps(
  productName: string,
  categoryOrDescription: string,
  healthScore: number | null,
  hasHazardousAdditives: boolean = false
): SmartSwapItem[] {
  // If product is already pristine (health score >= 88 and zero hazards), smart swaps are optional
  const needsSwap = (healthScore === null || healthScore < 75 || hasHazardousAdditives);
  if (!needsSwap) {
    return [];
  }

  const query = `${productName || ""} ${categoryOrDescription || ""}`.toLowerCase();
  
  for (const cat of VERIFIED_SMART_SWAP_CATALOG) {
    const isMatch = cat.triggers.some(t => query.includes(t));
    if (isMatch) {
      return cat.alternatives;
    }
  }

  // Fallback: If no direct trigger match, return top universal clean staples
  return [
    VERIFIED_SMART_SWAP_CATALOG[0].alternatives[0], // Sourdough crackers
    VERIFIED_SMART_SWAP_CATALOG[1].alternatives[0]  // Clean protein bar
  ];
}
