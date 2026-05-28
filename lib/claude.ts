import axios from 'axios'

export interface IngredientAnalysis {
  product_name: string
  brand: string
  health_score: number // 0 to 100
  safety_level: 'safe' | 'moderate' | 'danger'
  description: string
  ingredients: Array<{
    name: string
    status: 'safe' | 'caution' | 'avoid'
    reason: string
  }>
  additives: Array<{
    name: string
    code?: string
    risk: 'low' | 'medium' | 'high'
    description: string
    source?: string // Scientific source/citation (e.g. EFSA, WHO, FDA)
  }>
  allergens: string[]
  nutrition_facts: {
    serving_size?: string
    calories?: number
    calories_100g?: number
    fat?: string
    fat_100g?: string
    saturated_fat?: string
    saturated_fat_100g?: string
    trans_fat?: string
    trans_fat_100g?: string
    cholesterol?: string
    cholesterol_100g?: string
    sodium?: string
    sodium_100g?: string
    carbs?: string
    carbs_100g?: string
    fiber?: string
    fiber_100g?: string
    sugar?: string
    sugar_100g?: string
    protein?: string
    protein_100g?: string
  }
  recommendations: string[]
  alternatives_detailed?: Array<{
    name: string
    brand: string
    reason: string
    estimated_price_inr?: number
    buy_url_blinkit?: string
    buy_url_bigbasket?: string
  }>
  upf_score?: number // 1 to 4 (NOVA Group)
  microplastics_risk?: 'low' | 'medium' | 'high'
  microplastics_reason?: string
  sustainability_grade?: 'A' | 'B' | 'C' | 'D' | 'E'
  sustainability_reason?: string
  glycemic_index_estimate?: 'low' | 'medium' | 'high'
  glycemic_reason?: string
  health_risk_breakdown?: {
    heart?: 'low' | 'medium' | 'high'
    diabetes?: 'low' | 'medium' | 'high'
    inflammation?: 'low' | 'medium' | 'high'
    gut_health?: 'low' | 'medium' | 'high'
  }
}

export const MOCK_PRODUCTS: IngredientAnalysis[] = [
  {
    product_name: "Lotte Choco Pie",
    brand: "Lotte",
    health_score: 22,
    safety_level: "danger",
    description: "Lotte Choco Pie is a highly processed sweet snack consisting of cake, marshmallow filling, and a chocolate coating. It contains high amounts of refined sugar, hydrogenated vegetable fats, and synthetic additives.",
    ingredients: [
      { name: "Sugar", status: "avoid", reason: "High added sugar content contributing to weight gain and blood sugar spikes." },
      { name: "Wheat Flour", status: "caution", reason: "Refined grain stripped of natural fiber and nutrients." },
      { name: "Corn Syrup", status: "avoid", reason: "Highly processed corn-based sweetener linked to obesity and metabolic risks." },
      { name: "Hydrogenated Vegetable Fat (Palm/Kernel Oil)", status: "avoid", reason: "Contains trans fats and saturated fats that raise bad cholesterol (LDL) and increase heart disease risk." },
      { name: "Cocoa Powder", status: "safe", reason: "Natural cocoa solids providing flavor." },
      { name: "Gelatin (Beef)", status: "caution", reason: "Animal-derived gelling agent. Not suitable for vegetarians/vegans." },
      { name: "Milk Solids", status: "safe", reason: "Standard dairy ingredient." }
    ],
    additives: [
      { name: "Soy Lecithin", code: "E322", risk: "low", description: "Standard emulsifier. Generally safe, but contains soy.", source: "EFSA (European Food Safety Authority)" },
      { name: "Sodium Bicarbonate", code: "E500", risk: "low", description: "Raising agent (baking soda). Safe for consumption.", source: "FDA GRAS" },
      { name: "Ammonium Bicarbonate", code: "E503", risk: "low", description: "Raising agent. Safe for baked goods.", source: "FDA GRAS" },
      { name: "Sorbitan Monostearate", code: "E491", risk: "medium", description: "Synthetic emulsifier. May cause mild digestive upset in very large amounts.", source: "EFSA Food Additives Review" }
    ],
    allergens: ["Gluten", "Wheat", "Milk", "Soy"],
    nutrition_facts: {
      serving_size: "30g",
      calories: 130,
      calories_100g: 433,
      fat: "5g",
      fat_100g: "16.7g",
      saturated_fat: "3.5g",
      saturated_fat_100g: "11.7g",
      trans_fat: "0.2g",
      trans_fat_100g: "0.7g",
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
      "Heavenly Organics Chocolate Honey Patties",
      "Simple Mills Cocoa Cashew Sweet Thins",
      "Dark Chocolate (70%+ cocoa) paired with almonds"
    ],
    alternatives_detailed: [
      {
        name: "Dark Chocolate (70%+ Cocoa)",
        brand: "Amul",
        reason: "Rich in antioxidants, lower added sugar, no hydrogenated fats.",
        estimated_price_inr: 120,
        buy_url_blinkit: "https://blinkit.com/s/?q=amul+dark+chocolate+70",
        buy_url_bigbasket: "https://www.bigbasket.com/ps/?q=amul+dark+chocolate+70"
      },
      {
        name: "Organic Sweet Thins",
        brand: "Simple Mills",
        reason: "Grain-free, lower sugar, clean oils, almond-based flour.",
        estimated_price_inr: 450,
        buy_url_blinkit: "https://blinkit.com/s/?q=cookies",
        buy_url_bigbasket: "https://www.bigbasket.com/ps/?q=cookies"
      }
    ],
    upf_score: 4,
    microplastics_risk: "high",
    microplastics_reason: "Product is wrapped individually in multilayer aluminum-plastic composite wrappers, which can release particles under heat.",
    sustainability_grade: "D",
    sustainability_reason: "High palm oil content associated with deforestation and individually wrapped plastic packs contribute to landfill waste.",
    glycemic_index_estimate: "high",
    glycemic_reason: "Contains high amounts of sugar and high-fructose corn syrup, causing sharp blood sugar spikes.",
    health_risk_breakdown: {
      heart: "high",
      diabetes: "high",
      inflammation: "high",
      gut_health: "medium"
    }
  },
  {
    product_name: "Oreo Original Sandwich Cookies",
    brand: "Nabisco",
    health_score: 28,
    safety_level: "danger",
    description: "Oreo cookies are a highly processed sweet snack high in refined sugars, saturated fats, and processed wheat flour. Frequent consumption is linked to metabolic issues.",
    ingredients: [
      { name: "Sugar", status: "avoid", reason: "High added sugar content contributing to weight gain and blood sugar spikes." },
      { name: "Unbleached Enriched Flour", status: "caution", reason: "Refined grain stripped of natural fiber and nutrients." },
      { name: "Palm Oil", status: "caution", reason: "High in saturated fat and associated with negative environmental impacts." },
      { name: "Soybean Oil", status: "caution", reason: "Highly refined vegetable oil high in omega-6 fatty acids." },
      { name: "High Fructose Corn Syrup", status: "avoid", reason: "Highly processed fructose-based sweetener linked to fatty liver disease and insulin resistance." },
      { name: "Soy Lecithin", status: "safe", reason: "Standard emulsifier used to maintain texture." }
    ],
    additives: [
      { name: "Soy Lecithin", code: "E322", risk: "low", description: "Natural emulsifier extracted from soybeans. Safe for most consumers.", source: "FDA GRAS" },
      { name: "Vanillin (Artificial Flavor)", risk: "medium", description: "Synthetic flavor agent mimicking vanilla. Generally safe, but some sensitive individuals may experience mild sensitivities.", source: "WHO Joint Expert Committee on Food Additives" }
    ],
    allergens: ["Gluten", "Wheat", "Soy"],
    nutrition_facts: {
      serving_size: "29.4g",
      calories: 140,
      calories_100g: 476,
      fat: "7g",
      fat_100g: "23.8g",
      saturated_fat: "2g",
      saturated_fat_100g: "6.8g",
      trans_fat: "0g",
      trans_fat_100g: "0g",
      cholesterol: "0mg",
      cholesterol_100g: "0mg",
      sodium: "90mg",
      sodium_100g: "306mg",
      carbs: "21g",
      carbs_100g: "71.4g",
      fiber: "1g",
      fiber_100g: "3.4g",
      sugar: "13g",
      sugar_100g: "44.2g",
      protein: "1g",
      protein_100g: "3.4g"
    },
    recommendations: [
      "Simple Mills Double Chocolate Crunchy Cookies",
      "Hu Chocolate Chip Cookies",
      "Dark Chocolate (70%+ cocoa) paired with raw almonds"
    ],
    alternatives_detailed: [
      {
        name: "Chocolate Chip Cookies",
        brand: "Hu Kitchen",
        reason: "No refined sugar, organic cocoa, paleo/vegan ingredients.",
        estimated_price_inr: 499,
        buy_url_blinkit: "https://blinkit.com/s/?q=hu+cookies",
        buy_url_bigbasket: "https://www.bigbasket.com/ps/?q=cookies"
      }
    ],
    upf_score: 4,
    microplastics_risk: "medium",
    microplastics_reason: "Packaged in standard polypropylene outer plastic sleeves.",
    sustainability_grade: "D",
    sustainability_reason: "High palm oil sourcing with moderate sustainability verification certificates.",
    glycemic_index_estimate: "high",
    glycemic_reason: "High white sugar and flour concentration promotes swift glycemic spikes.",
    health_risk_breakdown: {
      heart: "high",
      diabetes: "high",
      inflammation: "high",
      gut_health: "medium"
    }
  },
  {
    product_name: "Coca-Cola Classic",
    brand: "The Coca-Cola Company",
    health_score: 12,
    safety_level: "danger",
    description: "Classic Coca-Cola is a carbonated beverage containing exceptionally high levels of High Fructose Corn Syrup and Phosphoric Acid. It has zero nutritional value and promotes dental decay and insulin resistance.",
    ingredients: [
      { name: "Carbonated Water", status: "safe", reason: "Pure carbonated water used as the beverage base." },
      { name: "High Fructose Corn Syrup", status: "avoid", reason: "Extreme added sugar content (39g per can) leading to insulin spikes, weight gain, and increased disease risk." },
      { name: "Caramel Color", status: "caution", reason: "Synthetic colorant that may contain chemical byproducts like 4-MEI depending on manufacturing." },
      { name: "Phosphoric Acid", status: "avoid", reason: "Strong acidifier associated with dental enamel erosion and bone mineral loss." },
      { name: "Caffeine", status: "caution", reason: "Mild stimulant that can lead to dependency and sleep disruption if consumed in excess." }
    ],
    additives: [
      { name: "Caramel Color", code: "E150d", risk: "medium", description: "Class IV caramel color. Contains trace levels of 4-MEI, which is classified as a potential carcinogen by some health bodies.", source: "IARC (International Agency for Research on Cancer)" },
      { name: "Phosphoric Acid", code: "E338", risk: "high", description: "Acidifier used to give sodas their tangy bite. Linked to kidney issues and bone thinning in excess.", source: "National Institutes of Health (NIH)" },
      { name: "Caffeine", risk: "low", description: "Natural stimulant. Safe in moderation but can cause restlessness or anxiety.", source: "FDA Guidance" }
    ],
    allergens: [],
    nutrition_facts: {
      serving_size: "355ml",
      calories: 140,
      calories_100g: 39,
      fat: "0g",
      fat_100g: "0g",
      saturated_fat: "0g",
      saturated_fat_100g: "0g",
      trans_fat: "0g",
      trans_fat_100g: "0g",
      cholesterol: "0mg",
      cholesterol_100g: "0mg",
      sodium: "45mg",
      sodium_100g: "13mg",
      carbs: "39g",
      carbs_100g: "11g",
      fiber: "0g",
      fiber_100g: "0g",
      sugar: "39g",
      sugar_100g: "11g",
      protein: "0g",
      protein_100g: "0g"
    },
    recommendations: [
      "Olipop Vintage Cola",
      "Sparkling water infused with fresh lime or lemon slices",
      "Kombucha (low sugar, high probiotics)"
    ],
    alternatives_detailed: [
      {
        name: "Lemon Sparkling Water",
        brand: "Perrier",
        reason: "Zero sugar, natural carbonation, hydration without acids.",
        estimated_price_inr: 150,
        buy_url_blinkit: "https://blinkit.com/s/?q=perrier",
        buy_url_bigbasket: "https://www.bigbasket.com/ps/?q=perrier"
      }
    ],
    upf_score: 4,
    microplastics_risk: "low",
    microplastics_reason: "If in aluminum can or glass bottle, microplastics risk is low. Plastic PET bottles pose a higher risk.",
    sustainability_grade: "E",
    sustainability_reason: "High water consumption footprint and significant plastic bottle waste footprint globally.",
    glycemic_index_estimate: "high",
    glycemic_reason: "Pure liquid sugar (39g of HFCS) absorbed directly into the bloodstream instantly, spiking blood glucose.",
    health_risk_breakdown: {
      heart: "high",
      diabetes: "high",
      inflammation: "high",
      gut_health: "high"
    }
  },
  {
    product_name: "Lay's Classic Potato Chips",
    brand: "Frito-Lay",
    health_score: 45,
    safety_level: "moderate",
    description: "Lay's Classic Potato Chips are made from potatoes fried in vegetable oils and salted. They are calorie-dense, high in refined sodium, and contain acrylamides from high-heat frying.",
    ingredients: [
      { name: "Potatoes", status: "safe", reason: "Whole sliced potatoes." },
      { name: "Canola Oil / Corn Oil / Sunflower Oil", status: "caution", reason: "Refined vegetable oils high in omega-6 fatty acids which can promote inflammation when consumed in excess." },
      { name: "Salt", status: "caution", reason: "Refined table salt. Promotes high blood pressure in sodium-sensitive individuals." }
    ],
    additives: [],
    allergens: [],
    nutrition_facts: {
      serving_size: "28g",
      calories: 160,
      calories_100g: 571,
      fat: "10g",
      fat_100g: "35.7g",
      saturated_fat: "1.5g",
      saturated_fat_100g: "5.4g",
      trans_fat: "0g",
      trans_fat_100g: "0g",
      cholesterol: "0mg",
      cholesterol_100g: "0mg",
      sodium: "170mg",
      sodium_100g: "607mg",
      carbs: "15g",
      carbs_100g: "53.6g",
      fiber: "1g",
      fiber_100g: "3.6g",
      sugar: "0g",
      sugar_100g: "0g",
      protein: "2g",
      protein_100g: "7.1g"
    },
    recommendations: [
      "Kettle Brand Air-Popped Sea Salt Chips",
      "Jackson's Honest Sweet Potato Chips",
      "Roasted chickpeas or home-baked kale chips with sea salt"
    ],
    alternatives_detailed: [
      {
        name: "Avocado Oil Potato Chips",
        brand: "Kettle Brand",
        reason: "Fried in monounsaturated avocado oil, lowering inflammatory omega-6 intake.",
        estimated_price_inr: 299,
        buy_url_blinkit: "https://blinkit.com/s/?q=kettle+chips",
        buy_url_bigbasket: "https://www.bigbasket.com/ps/?q=kettle+chips"
      }
    ],
    upf_score: 3,
    microplastics_risk: "medium",
    microplastics_reason: "Packaged in air-filled plastic-lined foil bags.",
    sustainability_grade: "C",
    sustainability_reason: "Local potato farming reduces transport footprint, but high energy frying methods are used.",
    glycemic_index_estimate: "high",
    glycemic_reason: "High carbohydrate content from fried starches translates to elevated glycemic load.",
    health_risk_breakdown: {
      heart: "medium",
      diabetes: "medium",
      inflammation: "high",
      gut_health: "low"
    }
  },
  {
    product_name: "Heinz Tomato Ketchup",
    brand: "Kraft Heinz",
    health_score: 52,
    safety_level: "moderate",
    description: "Heinz Tomato Ketchup is a popular condiment primarily consisting of tomato concentrate, vinegars, and sweeteners. It contains significant sugars per serving.",
    ingredients: [
      { name: "Tomato Concentrate from Red Ripe Tomatoes", status: "safe", reason: "Rich source of lycopene, a powerful antioxidant." },
      { name: "Distilled Vinegar", status: "safe", reason: "Natural acidifier and preservative." },
      { name: "High Fructose Corn Syrup", status: "avoid", reason: "Highly refined sweetener contributing to excessive sugar intake in small servings." },
      { name: "Corn Syrup", status: "avoid", reason: "Additional refined sugar syrup." },
      { name: "Salt", status: "caution", reason: "Contributes to sodium intake." },
      { name: "Spice", status: "safe", reason: "Natural herbs and spice extracts." },
      { name: "Onion Powder", status: "safe", reason: "Dehydrated onion seasoning." },
      { name: "Natural Flavoring", status: "safe", reason: "Standard flavor extracts." }
    ],
    additives: [],
    allergens: [],
    nutrition_facts: {
      serving_size: "17g",
      calories: 20,
      calories_100g: 118,
      fat: "0g",
      fat_100g: "0g",
      saturated_fat: "0g",
      saturated_fat_100g: "0g",
      trans_fat: "0g",
      trans_fat_100g: "0g",
      cholesterol: "0mg",
      cholesterol_100g: "0mg",
      sodium: "180mg",
      sodium_100g: "1058mg",
      carbs: "5g",
      carbs_100g: "29.4g",
      fiber: "0g",
      fiber_100g: "0g",
      sugar: "4g",
      sugar_100g: "23.5g",
      protein: "0g",
      protein_100g: "0g"
    },
    recommendations: [
      "Primal Kitchen Tomato Ketchup (unsweetened, organic)",
      "Sir Kensington's Classic Ketchup (lower sugar)",
      "Fresh homemade tomato salsa or paste with spices"
    ],
    alternatives_detailed: [
      {
        name: "Unsweetened Organic Ketchup",
        brand: "Primal Kitchen",
        reason: "Sweetened only with organic balsamic vinegar, zero added cane sugar or HFCS.",
        estimated_price_inr: 450,
        buy_url_blinkit: "https://blinkit.com/s/?q=organic+ketchup",
        buy_url_bigbasket: "https://www.bigbasket.com/ps/?q=organic+ketchup"
      }
    ],
    upf_score: 4,
    microplastics_risk: "medium",
    microplastics_reason: "Standard packaging is a squeezable polyethylene plastic bottle.",
    sustainability_grade: "C",
    sustainability_reason: "Concentration and global distribution of tomatoes involve high transport emissions.",
    glycemic_index_estimate: "medium",
    glycemic_reason: "Contains added HFCS which raises blood sugar, though serving sizes are typically small.",
    health_risk_breakdown: {
      heart: "low",
      diabetes: "medium",
      inflammation: "medium",
      gut_health: "low"
    }
  },
  {
    product_name: "Quaker Old Fashioned Oats",
    brand: "Quaker Oats",
    health_score: 95,
    safety_level: "safe",
    description: "Quaker Old Fashioned Oats are 100% whole grain rolled oats with no added sugar, artificial preservatives, or additives. Excellent source of beta-glucan soluble fiber, promoting heart and digestive health.",
    ingredients: [
      { name: "100% Whole Grain Rolled Oats", status: "safe", reason: "Nutritious, fiber-rich, unrefined whole grains." }
    ],
    additives: [],
    allergens: ["Gluten"],
    nutrition_facts: {
      serving_size: "40g",
      calories: 150,
      calories_100g: 375,
      fat: "3g",
      fat_100g: "7.5g",
      saturated_fat: "0.5g",
      saturated_fat_100g: "1.3g",
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
    recommendations: [
      "Organic rolled oats with fresh berries, nuts, and raw honey",
      "Steel-cut oats (slightly higher fiber and lower glycemic index)",
      "Add flaxseeds or chia seeds for an extra boost of omega-3 fats"
    ],
    alternatives_detailed: [],
    upf_score: 1,
    microplastics_risk: "low",
    microplastics_reason: "Packaged in cardboard drums with paper lid inserts.",
    sustainability_grade: "B",
    sustainability_reason: "Minimal processing and cardboard packaging limit environmental impact.",
    glycemic_index_estimate: "low",
    glycemic_reason: "Rich in beta-glucan soluble fibers, which slow carb digestion and blunt glucose spikes.",
    health_risk_breakdown: {
      heart: "low",
      diabetes: "low",
      inflammation: "low",
      gut_health: "low"
    }
  },
  {
    product_name: "Chobani Plain Greek Yogurt",
    brand: "Chobani",
    health_score: 88,
    safety_level: "safe",
    description: "Chobani Plain Greek Yogurt is a strained, protein-rich dairy product made from milk and live cultures. It contains no added sugars or thickeners, providing calcium and gut-friendly probiotics.",
    ingredients: [
      { name: "Cultured Pasteurized Nonfat Milk", status: "safe", reason: "High source of complete protein and bone-supporting calcium." },
      { name: "Live and Active Cultures", status: "safe", reason: "Probiotic strains (S. Thermophilus, L. Bulgaricus, L. Acidophilus, Bifidus, L. Casei) that support gut health." }
    ],
    additives: [],
    allergens: ["Dairy", "Milk"],
    nutrition_facts: {
      serving_size: "150g",
      calories: 80,
      calories_100g: 53,
      fat: "0g",
      fat_100g: "0g",
      saturated_fat: "0g",
      saturated_fat_100g: "0g",
      trans_fat: "0g",
      trans_fat_100g: "0g",
      cholesterol: "5mg",
      cholesterol_100g: "3.3mg",
      sodium: "55mg",
      sodium_100g: "37mg",
      carbs: "6g",
      carbs_100g: "4g",
      fiber: "0g",
      fiber_100g: "0g",
      sugar: "4g",
      sugar_100g: "2.7g",
      protein: "15g",
      protein_100g: "10g"
    },
    recommendations: [
      "Top with fresh organic berries, walnuts, and a drizzle of raw honey",
      "Mix in ground chia seeds or hemp seeds for extra fiber and healthy fats",
      "Use as a high-protein substitute for sour cream in savory recipes"
    ],
    alternatives_detailed: [],
    upf_score: 2,
    microplastics_risk: "medium",
    microplastics_reason: "Packed in polystyrene plastic cups.",
    sustainability_grade: "C",
    sustainability_reason: "Dairy products carry a higher methane footprint, though local sourcing offsets some transport emissions.",
    glycemic_index_estimate: "low",
    glycemic_reason: "High protein and lack of added sugars result in a very low glycemic load.",
    health_risk_breakdown: {
      heart: "low",
      diabetes: "low",
      inflammation: "low",
      gut_health: "low"
    }
  }
]

function getDeterministicMockProduct(base64Image: string, searchName: string = ''): IngredientAnalysis {
  const nameLower = searchName.toLowerCase()
  if (nameLower.includes('choco') || nameLower.includes('pie') || nameLower.includes('lotte')) {
    const match = MOCK_PRODUCTS.find(p => p.product_name.toLowerCase().includes('choco') || p.product_name.toLowerCase().includes('lotte'))
    if (match) return match
  }
  if (nameLower.includes('oreo')) {
    const match = MOCK_PRODUCTS.find(p => p.product_name.toLowerCase().includes('oreo'))
    if (match) return match
  }
  if (nameLower.includes('cola') || nameLower.includes('coke')) {
    const match = MOCK_PRODUCTS.find(p => p.product_name.toLowerCase().includes('coca-cola') || p.product_name.toLowerCase().includes('coke'))
    if (match) return match
  }
  if (nameLower.includes('chip') || nameLower.includes('lays') || nameLower.includes('potato')) {
    const match = MOCK_PRODUCTS.find(p => p.product_name.toLowerCase().includes('lays') || p.product_name.toLowerCase().includes('potato'))
    if (match) return match
  }
  if (nameLower.includes('ketchup') || nameLower.includes('heinz')) {
    const match = MOCK_PRODUCTS.find(p => p.product_name.toLowerCase().includes('ketchup') || p.product_name.toLowerCase().includes('heinz'))
    if (match) return match
  }
  if (nameLower.includes('oat') || nameLower.includes('quaker')) {
    const match = MOCK_PRODUCTS.find(p => p.product_name.toLowerCase().includes('oat') || p.product_name.toLowerCase().includes('quaker'))
    if (match) return match
  }
  if (nameLower.includes('yogurt') || nameLower.includes('chobani')) {
    const match = MOCK_PRODUCTS.find(p => p.product_name.toLowerCase().includes('yogurt') || p.product_name.toLowerCase().includes('chobani'))
    if (match) return match
  }

  // Fallback hash selection
  let hash = 0
  for (let i = 0; i < Math.min(base64Image.length, 2000); i++) {
    hash = (hash << 5) - hash + base64Image.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % MOCK_PRODUCTS.length
  return MOCK_PRODUCTS[index]
}

export function applyPreferences(product: IngredientAnalysis, userPreferences: string[]): IngredientAnalysis {
  // Deep clone
  const cloned: IngredientAnalysis = JSON.parse(JSON.stringify(product))
  
  if (!userPreferences || userPreferences.length === 0) return cloned
  
  cloned.ingredients = cloned.ingredients.map(ing => {
    const nameLower = ing.name.toLowerCase()
    
    // 1. Gluten-Free
    if (userPreferences.includes('gluten-free')) {
      if (nameLower.includes('wheat') || nameLower.includes('gluten') || nameLower.includes('flour') || nameLower.includes('barley') || nameLower.includes('rye')) {
        return { ...ing, status: 'avoid', reason: `${ing.name} contains gluten, violating your Gluten-Free preference.` }
      }
    }
    
    // 2. Dairy-Free
    if (userPreferences.includes('dairy-free')) {
      if (nameLower.includes('milk') || nameLower.includes('dairy') || nameLower.includes('butter') || nameLower.includes('whey') || nameLower.includes('lactose') || nameLower.includes('cheese') || nameLower.includes('yogurt')) {
        return { ...ing, status: 'avoid', reason: `${ing.name} contains dairy, violating your Dairy-Free preference.` }
      }
    }
    
    // 3. Nut-Free
    if (userPreferences.includes('nut-free')) {
      if (nameLower.includes('peanut') || nameLower.includes('almond') || nameLower.includes('walnut') || nameLower.includes('cashew') || nameLower.includes('pecan') || nameLower.includes('nut')) {
        return { ...ing, status: 'avoid', reason: `${ing.name} contains nuts, violating your Nut-Free preference.` }
      }
    }
    
    // 4. Vegan
    if (userPreferences.includes('vegan')) {
      if (nameLower.includes('milk') || nameLower.includes('yogurt') || nameLower.includes('cheese') || nameLower.includes('honey') || nameLower.includes('gelatin') || nameLower.includes('egg') || nameLower.includes('beef') || nameLower.includes('chicken') || nameLower.includes('pork') || nameLower.includes('butter')) {
        return { ...ing, status: 'avoid', reason: `${ing.name} is an animal-derived product, violating your Vegan preference.` }
      }
    }
    
    // 5. Vegetarian
    if (userPreferences.includes('vegetarian')) {
      if (nameLower.includes('gelatin') || nameLower.includes('beef') || nameLower.includes('chicken') || nameLower.includes('pork') || nameLower.includes('meat') || nameLower.includes('fish')) {
        return { ...ing, status: 'avoid', reason: `${ing.name} contains meat or meat byproducts, violating your Vegetarian preference.` }
      }
    }
    
    // 6. Jain Diet
    if (userPreferences.includes('jain')) {
      if (
        nameLower.includes('onion') || nameLower.includes('garlic') || nameLower.includes('potato') || 
        nameLower.includes('carrot') || nameLower.includes('beetroot') || nameLower.includes('ginger') || 
        nameLower.includes('radish') || nameLower.includes('turnip') || nameLower.includes('egg') || 
        nameLower.includes('meat') || nameLower.includes('chicken') || nameLower.includes('gelatin')
      ) {
        return { ...ing, status: 'avoid', reason: `${ing.name} violates Jain diet rules (contains root vegetable or animal byproduct).` }
      }
    }

    // 7. Diabetic
    if (userPreferences.includes('diabetic')) {
      if (
        nameLower.includes('sugar') || nameLower.includes('corn syrup') || nameLower.includes('fructose') || 
        nameLower.includes('dextrose') || nameLower.includes('sucrose') || nameLower.includes('maltodextrin')
      ) {
        return { ...ing, status: 'avoid', reason: `${ing.name} is a high glycemic sweetener, violating your diabetic health profile.` }
      }
    }

    // 8. Hypertension (Salt-Conscious)
    if (userPreferences.includes('hypertension')) {
      if (nameLower.includes('salt') || nameLower.includes('sodium') || nameLower.includes('msg') || nameLower.includes('monosodium glutamate')) {
        return { ...ing, status: 'avoid', reason: `${ing.name} is high in sodium, violating your hypertension health profile.` }
      }
    }

    // 9. Pregnancy Safe
    if (userPreferences.includes('pregnancy')) {
      if (nameLower.includes('caffeine') || nameLower.includes('bha') || nameLower.includes('bht') || nameLower.includes('nitrite') || nameLower.includes('nitrate')) {
        return { ...ing, status: 'avoid', reason: `${ing.name} is advised against during pregnancy (caffeine/preservative warning).` }
      }
    }

    // 10. Cardiovascular (Heart-Conscious)
    if (userPreferences.includes('cardiovascular')) {
      if (nameLower.includes('hydrogenated') || nameLower.includes('trans fat') || nameLower.includes('palm kernel') || nameLower.includes('margarine')) {
        return { ...ing, status: 'avoid', reason: `${ing.name} contains trans fats or highly saturated hydrogenated fats, violating your cardiovascular profile.` }
      }
    }

    return ing
  })

  // Recalculate safety level and adjust health score
  const hasAvoid = cloned.ingredients.some(ing => ing.status === 'avoid')
  if (hasAvoid) {
    cloned.safety_level = 'danger'
    cloned.health_score = Math.max(0, cloned.health_score - 20)
  }
  
  return cloned
}

async function analyzeLabelWithGemini(
  base64Image: string,
  userPreferences: string[] = []
): Promise<IngredientAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables.')
  }

  let mediaType = 'image/jpeg'
  let base64Data = base64Image

  if (base64Image.startsWith('data:')) {
    const match = base64Image.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      mediaType = match[1]
      base64Data = match[2]
    }
  }

  const promptText = `
You are ScanSafe ULTRA, an advanced product intelligence scanner, food scientist, and toxicology expert.
Analyze the provided image of a food product. Reconstruct and estimate the ingredients list, nutrition facts, additives, allergens, and overall health index. 

You must return a single JSON object. Ensure it matches the JSON specification below:
{
  "product_name": "Name of product (estimate if not clear)",
  "brand": "Brand name (estimate if not clear)",
  "health_score": 0 to 100 integer (100 = whole foods, 0 = ultra-processed or dangerous),
  "safety_level": "safe" | "moderate" | "danger",
  "description": "2-3 sentences overview of the product's health and toxicological impact",
  "ingredients": [
    {
      "name": "ingredient name",
      "status": "safe" | "caution" | "avoid",
      "reason": "short explanation of this rating"
    }
  ],
  "additives": [
    {
      "name": "additive name (e.g. MSG, Aspartame)",
      "code": "E-number (e.g. E621, E951) if applicable",
      "risk": "low" | "medium" | "high",
      "description": "safety warning and risk explanation",
      "source": "scientific review body citing (e.g. EFSA, FDA, WHO)"
    }
  ],
  "allergens": ["Gluten", "Dairy", etc. lists],
  "nutrition_facts": {
    "serving_size": "serving size weight e.g. 30g or 355ml",
    "calories": number,
    "calories_100g": number,
    "fat": "weight per serving in grams",
    "fat_100g": "weight per 100g in grams",
    "saturated_fat": "weight per serving in grams",
    "saturated_fat_100g": "weight per 100g in grams",
    "trans_fat": "weight per serving in grams",
    "trans_fat_100g": "weight per 100g in grams",
    "cholesterol": "weight per serving in mg",
    "cholesterol_100g": "weight per 100g in mg",
    "sodium": "weight per serving in mg",
    "sodium_100g": "weight per 100g in mg",
    "carbs": "weight per serving in grams",
    "carbs_100g": "weight per 100g in grams",
    "fiber": "weight per serving in grams",
    "fiber_100g": "weight per 100g in grams",
    "sugar": "weight per serving in grams",
    "sugar_100g": "weight per 100g in grams",
    "protein": "weight per serving in grams",
    "protein_100g": "weight per 100g in grams"
  },
  "recommendations": ["healthy alternatives names"],
  "alternatives_detailed": [
    {
      "name": "Detailed clean alternative name",
      "brand": "Brand",
      "reason": "Why this alternative is better",
      "estimated_price_inr": number,
      "buy_url_blinkit": "search link e.g. https://blinkit.com/s/?q=product",
      "buy_url_bigbasket": "search link e.g. https://www.bigbasket.com/ps/?q=product"
    }
  ],
  "upf_score": 1 to 4 (NOVA food processing group index: 1-raw, 2-culinary, 3-processed, 4-ultraprocessed),
  "microplastics_risk": "low" | "medium" | "high",
  "microplastics_reason": "evaluation of packaging (PET bottles, individual wraps have higher risk)",
  "sustainability_grade": "A" | "B" | "C" | "D" | "E",
  "sustainability_reason": "estimated carbon footprint and carbon impact summary",
  "glycemic_index_estimate": "low" | "medium" | "high",
  "glycemic_reason": "glycemic impact and sugar absorption analysis",
  "health_risk_breakdown": {
    "heart": "low" | "medium" | "high",
    "diabetes": "low" | "medium" | "high",
    "inflammation": "low" | "medium" | "high",
    "gut_health": "low" | "medium" | "high"
  }
}

Do NOT wrap the response in markdown formatting (like \`\`\`json). Return only the raw JSON string.
`

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      contents: [
        {
          parts: [
            { inlineData: { mimeType: mediaType, data: base64Data } },
            { text: promptText }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    },
    { headers: { 'content-type': 'application/json' } }
  )

  const candidate = response.data?.candidates?.[0]
  const responseText = candidate?.content?.parts?.[0]?.text?.trim()
  if (!responseText) {
    throw new Error('Empty response from Gemini API')
  }

  let cleanedText = responseText
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/, '')
  }

  return JSON.parse(cleanedText.trim()) as IngredientAnalysis
}

export async function analyzeLabel(
  base64Image: string,
  userPreferences: string[] = [],
  filename: string = '',
  productName: string = ''
): Promise<IngredientAnalysis> {
  const searchName = productName || filename

  // 1. Try Gemini first
  const geminiApiKey = process.env.GEMINI_API_KEY
  if (geminiApiKey) {
    try {
      console.log('Attempting analysis using Google Gemini 2.5 Flash...')
      const analysis = await analyzeLabelWithGemini(base64Image, userPreferences)
      return applyPreferences(analysis, userPreferences)
    } catch (error: any) {
      console.error('Error analyzing image with Gemini API:', error.response?.data || error.message)
      // Fallback
    }
  }

  // 2. Fallback to Claude
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('No API keys. Using Mock fallback.')
    const mock = getDeterministicMockProduct(base64Image, searchName)
    return applyPreferences(mock, userPreferences)
  }

  let mediaType = 'image/jpeg'
  let base64Data = base64Image

  if (base64Image.startsWith('data:')) {
    const match = base64Image.match(/^data:([^;]+);base64,(.+)$/)
    if (match) {
      mediaType = match[1]
      base64Data = match[2]
    }
  }

  const promptText = `
You are ScanSafe ULTRA, an advanced food intelligence scanner, toxicologist, and ingredients specialist.
Analyze the provided food image. Return a single JSON object matching the specification below:
{
  "product_name": "Name",
  "brand": "Brand",
  "health_score": 0 to 100 integer,
  "safety_level": "safe" | "moderate" | "danger",
  "description": "overview",
  "ingredients": [
    { "name": "name", "status": "safe" | "caution" | "avoid", "reason": "reason" }
  ],
  "additives": [
    { "name": "name", "code": "E-number", "risk": "low" | "medium" | "high", "description": "desc", "source": "citation" }
  ],
  "allergens": ["Allergen"],
  "nutrition_facts": {
    "serving_size": "string",
    "calories": number,
    "calories_100g": number,
    "fat": "string",
    "fat_100g": "string",
    "saturated_fat": "string",
    "saturated_fat_100g": "string",
    "trans_fat": "string",
    "trans_fat_100g": "string",
    "cholesterol": "string",
    "cholesterol_100g": "string",
    "sodium": "string",
    "sodium_100g": "string",
    "carbs": "string",
    "carbs_100g": "string",
    "fiber": "string",
    "fiber_100g": "string",
    "sugar": "string",
    "sugar_100g": "string",
    "protein": "string",
    "protein_100g": "string"
  },
  "recommendations": ["alternatives"],
  "alternatives_detailed": [
    {
      "name": "Alternative Name",
      "brand": "Brand",
      "reason": "Why better",
      "estimated_price_inr": number,
      "buy_url_blinkit": "link",
      "buy_url_bigbasket": "link"
    }
  ],
  "upf_score": 1 to 4,
  "microplastics_risk": "low" | "medium" | "high",
  "microplastics_reason": "packaging safety review",
  "sustainability_grade": "A" | "B" | "C" | "D" | "E",
  "sustainability_reason": "sustainability summary",
  "glycemic_index_estimate": "low" | "medium" | "high",
  "glycemic_reason": "blood sugar reasoning",
  "health_risk_breakdown": {
    "heart": "low" | "medium" | "high",
    "diabetes": "low" | "medium" | "high",
    "inflammation": "low" | "medium" | "high",
    "gut_health": "low" | "medium" | "high"
  }
}

Do NOT wrap the response in markdown code blocks. Return ONLY raw JSON.
`

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: promptText,
              },
            ],
          },
        ],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      }
    )

    const responseText = response.data.content[0].text.trim()
    let cleanedText = responseText
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/, '')
    }
    
    return JSON.parse(cleanedText.trim()) as IngredientAnalysis
  } catch (error: any) {
    console.error('Error analyzing image with Claude:', error.response?.data || error.message)
    const mock = getDeterministicMockProduct(base64Image, searchName)
    return applyPreferences(mock, userPreferences)
  }
}

export async function enrichIngredientsText(
  ingredientsText: string,
  productName: string,
  brand: string,
  nutriments: any = {},
  userPreferences: string[] = []
): Promise<IngredientAnalysis> {
  const geminiApiKey = process.env.GEMINI_API_KEY
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables.')
  }

  const promptText = `
You are ScanSafe ULTRA, an advanced product intelligence scanner, food scientist, and toxicology expert.
Given the raw product details below, parse and analyze the ingredients, additives, nutrition facts, allergens, and overall health indexes.

Product Name: ${productName}
Brand: ${brand}
Raw Ingredients Text: ${ingredientsText}
Nutrition Facts (Raw): ${JSON.stringify(nutriments)}

You must return a single JSON object. Ensure it matches the JSON specification below:
{
  "product_name": "${productName}",
  "brand": "${brand}",
  "health_score": 0 to 100 integer (100 = whole foods, 0 = ultra-processed or dangerous),
  "safety_level": "safe" | "moderate" | "danger",
  "description": "2-3 sentences overview of the product's health and toxicological impact",
  "ingredients": [
    {
      "name": "ingredient name",
      "status": "safe" | "caution" | "avoid",
      "reason": "short explanation of this rating"
    }
  ],
  "additives": [
    {
      "name": "additive name (e.g. MSG, Aspartame)",
      "code": "E-number (e.g. E621, E951) if applicable",
      "risk": "low" | "medium" | "high",
      "description": "safety warning and risk explanation",
      "source": "scientific review body citing (e.g. EFSA, FDA, WHO)"
    }
  ],
  "allergens": ["Gluten", "Dairy", etc. lists],
  "nutrition_facts": {
    "serving_size": "serving size weight e.g. 30g or 355ml",
    "calories": number,
    "calories_100g": number,
    "fat": "weight per serving in grams",
    "fat_100g": "weight per 100g in grams",
    "saturated_fat": "weight per serving in grams",
    "saturated_fat_100g": "weight per 100g in grams",
    "trans_fat": "weight per serving in grams",
    "trans_fat_100g": "weight per 100g in grams",
    "cholesterol": "weight per serving in mg",
    "cholesterol_100g": "weight per 100g in mg",
    "sodium": "weight per serving in mg",
    "sodium_100g": "weight per 100g in mg",
    "carbs": "weight per serving in grams",
    "carbs_100g": "weight per 100g in grams",
    "fiber": "weight per serving in grams",
    "fiber_100g": "weight per 100g in grams",
    "sugar": "weight per serving in grams",
    "sugar_100g": "weight per 100g in grams",
    "protein": "weight per serving in grams",
    "protein_100g": "weight per 100g in grams"
  },
  "recommendations": ["healthy alternatives names"],
  "alternatives_detailed": [
    {
      "name": "Detailed clean alternative name",
      "brand": "Brand",
      "reason": "Why this alternative is better",
      "estimated_price_inr": number,
      "buy_url_blinkit": "search link e.g. https://blinkit.com/s/?q=product",
      "buy_url_bigbasket": "search link e.g. https://www.bigbasket.com/ps/?q=product"
    }
  ],
  "upf_score": 1 to 4 (NOVA food processing group index: 1-raw, 2-culinary, 3-processed, 4-ultraprocessed),
  "microplastics_risk": "low" | "medium" | "high",
  "microplastics_reason": "evaluation of packaging (PET bottles, individual wraps have higher risk)",
  "sustainability_grade": "A" | "B" | "C" | "D" | "E",
  "sustainability_reason": "estimated carbon footprint and carbon impact summary",
  "glycemic_index_estimate": "low" | "medium" | "high",
  "glycemic_reason": "glycemic impact and sugar absorption analysis",
  "health_risk_breakdown": {
    "heart": "low" | "medium" | "high",
    "diabetes": "low" | "medium" | "high",
    "inflammation": "low" | "medium" | "high",
    "gut_health": "low" | "medium" | "high"
  }
}

Do NOT wrap the response in markdown formatting (like \`\`\`json). Return only the raw JSON string.
`

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      contents: [
        {
          parts: [
            { text: promptText }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    },
    { headers: { 'content-type': 'application/json' } }
  )

  const candidate = response.data?.candidates?.[0]
  const responseText = candidate?.content?.parts?.[0]?.text?.trim()
  if (!responseText) {
    throw new Error('Empty response from Gemini API')
  }

  let cleanedText = responseText
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/, '')
  }

  const analysis = JSON.parse(cleanedText.trim()) as IngredientAnalysis
  return applyPreferences(analysis, userPreferences)
}
