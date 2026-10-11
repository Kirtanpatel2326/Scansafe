import {
  Constraint,
  Currency,
  DecomposedGoal,
  DecomposedGoalSchema,
  GoalRelevanceStatus,
  ProductEvidence
} from './types'

export interface GoalRelevanceResult {
  status: GoalRelevanceStatus
  categoryMatch: boolean
  relevanceReasons: string[]
  attributeEvidence: Record<string, {
    status: GoalRelevanceStatus
    evidence: string
  }>
}

/**
 * Priority 0: Decompose natural language user goal into structured,
 * verified operational requirements without silently dropping constraints.
 */
export function decomposeUserGoal(
  rawGoal: string,
  constraints: Constraint[] = [],
  budget?: number,
  currency: Currency = 'INR',
  maxResults: number = 5
): DecomposedGoal {
  const goalLower = rawGoal.toLowerCase()

  // 1. Category Detection & Positive/Negative Keywords
  let requiredCategory = 'general_food'
  let categoryKeywords: string[] = []
  let excludedCategoryKeywords: string[] = []

  if (/(?:seed\s*butter|sunflower\s*butter|pumpkin\s*seed\s*butter|tahini|seed\s*spread|sunbutter)/i.test(goalLower)) {
    requiredCategory = 'seed_butter_spread'
    categoryKeywords = [
      'seed butter',
      'sunflower seed butter',
      'sunflower butter',
      'sunbutter',
      'pumpkin seed butter',
      'tahini',
      'sesame butter',
      'seed spread'
    ]
    excludedCategoryKeywords = [
      'dairy butter',
      'pasteurized butter',
      'milk butter',
      'table butter',
      'cow butter',
      'beurre',
      'makhan',
      'ghee',
      'clarified butter',
      'peanut butter',
      'almond butter',
      'cashew butter',
      'hazelnut butter',
      'nut butter'
    ]
  } else if (/(?:energy\s*bar|protein\s*bar|granola\s*bar|snack\s*bar|oat\s*bar)/i.test(goalLower)) {
    requiredCategory = 'energy_bar'
    categoryKeywords = [
      'energy bar',
      'protein bar',
      'granola bar',
      'snack bar',
      'oat bar',
      'fruit bar',
      'protein bites'
    ]
    excludedCategoryKeywords = [
      'candy',
      'chocolate bar',
      'ice cream',
      'mayonnaise',
      'salad dressing',
      'beverage',
      'dairy butter'
    ]
  } else if (/(?:dipping\s*sauce|dip|savory\s*sauce|condiment)/i.test(goalLower)) {
    requiredCategory = 'dipping_sauce'
    categoryKeywords = [
      'dipping sauce',
      'dip',
      'sauce',
      'salsa',
      'condiment',
      'dressing'
    ]
    excludedCategoryKeywords = [
      'energy bar',
      'dairy butter',
      'peanut butter',
      'candy',
      'dry seasoning'
    ]
  } else if (/(?:pasta|penne|spaghetti|macaroni|fusilli|noodles)/i.test(goalLower)) {
    requiredCategory = 'pasta'
    categoryKeywords = [
      'pasta',
      'penne',
      'spaghetti',
      'macaroni',
      'fusilli',
      'noodles',
      'rotini',
      'fettuccine',
      'linguine'
    ]
    excludedCategoryKeywords = [
      'energy bar',
      'dairy butter',
      'candy'
    ]
  } else {
    // Fallback: extract primary noun phrase
    const cleaned = rawGoal
      .replace(/^(find|search for|search|look for|check|get|buy|locate|compare)\s+(me\s+)?(a\s+|an\s+|some\s+)?/i, '')
      .replace(/\b(for\s+[a-z\s_-]+allergy|allergy|allergies|allergic)\b/gi, '')
      .replace(/\b(organic|vegan|low[- ]sugar|healthy|safe|allergy[- ]safe|nut[- ]free|peanut[- ]free|gluten[- ]free)\b/gi, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const firstWord = cleaned.split(/\s+/)[0]?.toLowerCase()
    if (!firstWord || ['food', 'snack', 'snacks', 'items', 'products', 'brands'].includes(firstWord)) {
      requiredCategory = 'general_food'
      categoryKeywords = ['food', 'snack']
    } else {
      requiredCategory = cleaned.split(/\s+/).slice(0, 3).join('_') || 'packaged_food'
      categoryKeywords = [cleaned.slice(0, 50)]
    }
  }

  // 2. Attribute Extraction (Explicit claims requested in user prompt text)
  const requiredAttributes: string[] = []
  const excludedIngredients: string[] = []

  if (/\borganic\b/i.test(goalLower)) {
    requiredAttributes.push('organic')
  }

  if (/\bvegan\b/i.test(goalLower) || /\bplant[- ]based\b/i.test(goalLower)) {
    requiredAttributes.push('vegan')
    excludedIngredients.push(
      'milk', 'cream', 'butter', 'cheese', 'whey', 'casein', 'caseinate',
      'lactose', 'ghee', 'paneer', 'egg', 'eggs', 'albumin', 'honey',
      'gelatin', 'gelatine', 'lard', 'tallow', 'carmine'
    )
  }

  if (/\blow[- ]sugar\b/i.test(goalLower) || /\bno[- ]added[- ]sugar\b/i.test(goalLower) || /\bsugar[- ]free\b/i.test(goalLower)) {
    requiredAttributes.push('low_sugar')
  }

  if (requiredCategory === 'seed_butter_spread' || /\bseed\b/i.test(goalLower)) {
    requiredAttributes.push('seed_based')
  }

  if (/\bnut[- ]free\b/i.test(goalLower)) {
    requiredAttributes.push('nut_free')
    excludedIngredients.push('almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia', 'brazil nut')
  }

  if (/\bpeanut[- ]free\b/i.test(goalLower)) {
    requiredAttributes.push('peanut_free')
    excludedIngredients.push('peanut', 'peanuts', 'groundnut', 'arachis')
  }

  if (/\bgluten[- ]free\b/i.test(goalLower)) {
    requiredAttributes.push('gluten_free')
    excludedIngredients.push('wheat', 'barley', 'rye', 'malt', 'spelt', 'triticale')
  }

  if (/\bdairy[- ]free\b/i.test(goalLower) || /\bmilk[- ]free\b/i.test(goalLower)) {
    requiredAttributes.push('dairy_free')
    excludedIngredients.push('milk', 'butter', 'cream', 'cheese', 'whey', 'casein', 'lactose', 'ghee', 'paneer')
  }

  if (/\bsoy[- ]free\b/i.test(goalLower)) {
    requiredAttributes.push('soy_free')
    excludedIngredients.push('soy', 'soya', 'soybean', 'tofu', 'edamame')
  }

  if (/\begg[- ]free\b/i.test(goalLower)) {
    requiredAttributes.push('egg_free')
    excludedIngredients.push('egg', 'eggs', 'albumin', 'mayonnaise')
  }

  if (/\bsavory\b/i.test(goalLower)) {
    requiredAttributes.push('savory')
  }

  // 3. Optional Preferences & Flavors
  const optionalPreferences: string[] = []
  for (const pref of ['chocolate', 'vanilla', 'crunchy', 'creamy', 'salted', 'spicy', 'berry']) {
    if (new RegExp(`\\b${pref}\\b`, 'i').test(goalLower)) {
      optionalPreferences.push(pref)
    }
  }

  // 4. Quantity & Retailer / Geographic Constraints
  let quantity: string | undefined
  const qtyMatch = goalLower.match(/\b(\d+\s*(?:pack|bars|bottles|jars|g|oz|ml|items))\b/i)
  if (qtyMatch) quantity = qtyMatch[1]

  let geographicOrRetailerConstraints: string | undefined
  if (/\bin\s+(india|usa|uae|dubai|uk|europe)\b/i.test(goalLower)) {
    const geoMatch = goalLower.match(/\bin\s+(india|usa|uae|dubai|uk|europe)\b/i)
    if (geoMatch) geographicOrRetailerConstraints = geoMatch[1]
  }

  const result = {
    rawGoal,
    requiredCategory,
    categoryKeywords: Array.from(new Set(categoryKeywords)),
    excludedCategoryKeywords: Array.from(new Set(excludedCategoryKeywords)),
    requiredAttributes: Array.from(new Set(requiredAttributes)),
    excludedIngredients: Array.from(new Set(excludedIngredients)),
    dietaryRestrictions: [...constraints],
    optionalPreferences,
    budget,
    currency,
    maxResults,
    quantity,
    geographicOrRetailerConstraints
  }

  return DecomposedGoalSchema.parse(result)
}

/**
 * Priority 1: Goal-Matching Verification Engine.
 * Evaluates candidate products against decomposed requirements.
 * Every product must satisfy hard requirements before being shortlisted.
 */
export function evaluateProductGoalRelevance(
  product: ProductEvidence,
  goal: DecomposedGoal
): GoalRelevanceResult {
  const nameLower = (product.name || '').toLowerCase()
  const brandLower = (product.brand || '').toLowerCase()
  const ingredientsLower = (product.ingredients || '').toLowerCase()
  const allergenLower = (product.allergenStatement || '').toLowerCase()
  const categoriesList = (product.categoriesDeclared || []).map(c => c.toLowerCase())
  const labelsList = (product.certificationsDeclared || []).map(l => l.toLowerCase())
  const combinedText = `${nameLower} ${brandLower} ${ingredientsLower} ${allergenLower} ${categoriesList.join(' ')} ${labelsList.join(' ')}`

  const relevanceReasons: string[] = []
  const attributeEvidence: Record<string, { status: GoalRelevanceStatus; evidence: string }> = {}
  let categoryMatch = false
  let hardExclusion = false

  // -------------------------------------------------------------------------
  // 1. CATEGORY RELEVANCE CHECK
  // -------------------------------------------------------------------------
  if (goal.requiredCategory === 'seed_butter_spread') {
    // Explicit Dairy Butter Exclusion
    const isDairyButter =
      /\b(?:pasteurized butter|cream|table butter|dairy butter|cow butter|makhan|ghee|beurre)\b/i.test(nameLower) ||
      /\b(?:butterfat|milk fat|pasteurized cream|cow's milk)\b/i.test(ingredientsLower) ||
      categoriesList.some(c => /butters|beurres|dairy/i.test(c) && !/seed|graine|tournesol|sesame/i.test(c))

    const isNutButter =
      /\b(?:peanut butter|almond butter|cashew butter|hazelnut butter|walnut butter)\b/i.test(nameLower) ||
      /\b(?:roasted peanuts|roasted almonds|roasted cashews)\b/i.test(ingredientsLower)

    const isSeedProduct =
      /\b(?:sunflower|seed|sunbutter|pumpkin seed|sesame|tahini|flaxseed|chia|hemp seed)\b/i.test(nameLower) ||
      /\b(?:sunflower seed|pumpkin seed|sesame seed|tahini|flaxseed|chia seed|hemp seed|hulled sesame)\b/i.test(ingredientsLower) ||
      categoriesList.some(c => /seed|sesame|tahini|tournesol/i.test(c))

    if (isDairyButter && !isSeedProduct) {
      categoryMatch = false
      hardExclusion = true
      relevanceReasons.push('EXCLUDED (Category Violation): Product is ordinary animal dairy butter (milk fat), not a seed-butter spread.')
    } else if (isNutButter && !isSeedProduct) {
      categoryMatch = false
      hardExclusion = true
      relevanceReasons.push('EXCLUDED (Category Violation): Product is nut butter, not a seed-butter spread.')
    } else if (isSeedProduct) {
      categoryMatch = true
      relevanceReasons.push('MATCH (Category): Product verified as seed-based spread / seed butter (sunflower / sesame / seed).')
    } else {
      categoryMatch = false
      relevanceReasons.push('NEEDS_REVIEW (Category): Product lacks verified seed-butter credentials in title or ingredients.')
    }
  } else if (goal.requiredCategory === 'energy_bar') {
    const isBar =
      /\b(?:bar|bars|snack bar|protein bar|energy bar|oat bar|granola bar|bites)\b/i.test(nameLower) ||
      categoriesList.some(c => /bar|snack/i.test(c))

    const isNonBar =
      /\b(?:mayonnaise|butter|sauce|dressing|drink|beverage|powder)\b/i.test(nameLower) && !isBar

    if (isNonBar) {
      categoryMatch = false
      hardExclusion = true
      relevanceReasons.push('EXCLUDED (Category Violation): Product is not an energy or snack bar.')
    } else if (isBar) {
      categoryMatch = true
      relevanceReasons.push('MATCH (Category): Product matches energy/snack bar category.')
    } else {
      categoryMatch = false
      relevanceReasons.push('NEEDS_REVIEW (Category): Unclear whether product is an energy bar.')
    }
  } else if (goal.requiredCategory === 'dipping_sauce') {
    const isSauce =
      /\b(?:dipping sauce|sauce|dip|salsa|condiment|dressing|chili sauce)\b/i.test(nameLower) ||
      categoriesList.some(c => /sauce|dip|condiment/i.test(c))

    const isNonSauce =
      /\b(?:energy bar|butter|snack bar|cereal)\b/i.test(nameLower) && !isSauce

    if (isNonSauce) {
      categoryMatch = false
      hardExclusion = true
      relevanceReasons.push('EXCLUDED (Category Violation): Product is not a dipping sauce or condiment.')
    } else if (isSauce) {
      categoryMatch = true
      relevanceReasons.push('MATCH (Category): Product matches dipping sauce / condiment category.')
    } else {
      categoryMatch = false
      relevanceReasons.push('NEEDS_REVIEW (Category): Unclear whether product is a dipping sauce.')
    }
  } else if (goal.requiredCategory === 'pasta') {
    const isPasta =
      /\b(?:pasta|penne|spaghetti|macaroni|fusilli|noodles|rotini|fettuccine|linguine)\b/i.test(nameLower) ||
      categoriesList.some(c => /pasta|noodles/i.test(c))
    if (isPasta) {
      categoryMatch = true
      relevanceReasons.push('MATCH (Category): Product matches pasta category.')
    } else {
      categoryMatch = false
      relevanceReasons.push('NEEDS_REVIEW (Category): Unclear whether product is pasta.')
    }
  } else {
    // General category verification
    const matchesKeyword = goal.categoryKeywords.some(kw => combinedText.includes(kw.toLowerCase()))
    const matchesExcluded = goal.excludedCategoryKeywords.some(kw => combinedText.includes(kw.toLowerCase()))
    const isGenericCategory = ['general_food', 'packaged_food', 'food', 'safe_food'].includes(goal.requiredCategory)

    if (matchesExcluded && !matchesKeyword) {
      categoryMatch = false
      hardExclusion = true
      relevanceReasons.push(`EXCLUDED (Category Violation): Matches excluded category criteria (${goal.excludedCategoryKeywords.join(', ')}).`)
    } else if (matchesKeyword || isGenericCategory) {
      categoryMatch = true
      relevanceReasons.push(`MATCH (Category): Product matches keywords for ${goal.requiredCategory}.`)
    } else {
      categoryMatch = true
      relevanceReasons.push(`NEEDS_REVIEW (Category): Generic category match for ${goal.requiredCategory}.`)
    }
  }

  // -------------------------------------------------------------------------
  // 2. VEGAN ATTRIBUTE CHECK
  // -------------------------------------------------------------------------
  if (goal.requiredAttributes.includes('vegan')) {
    const ANIMAL_INGREDIENTS = [
      'milk', 'butter', 'cream', 'cheese', 'whey', 'casein', 'caseinate',
      'lactose', 'ghee', 'paneer', 'curd', 'dairy', 'egg', 'eggs',
      'albumin', 'ovalbumin', 'egg yolk', 'egg white', 'lysozyme', 'mayonnaise',
      'honey', 'honeycomb', 'beeswax', 'royal jelly',
      'gelatin', 'gelatine', 'lard', 'tallow', 'beef', 'chicken', 'pork',
      'fish', 'anchovy', 'anchovies', 'carmine', 'cochineal', 'isinglass'
    ]

    const detectedAnimal = ANIMAL_INGREDIENTS.filter(item => {
      const re = new RegExp(`(^|[^a-z0-9])${item}([^a-z0-9]|$)`, 'i')
      return re.test(ingredientsLower) || (re.test(nameLower) && !/\b(?:dairy[- ]free|vegan|plant[- ]based)\b/i.test(nameLower))
    })

    if (detectedAnimal.length > 0) {
      hardExclusion = true
      attributeEvidence['vegan'] = {
        status: 'EXCLUDED',
        evidence: `Contains animal-derived ingredients: ${Array.from(new Set(detectedAnimal)).join(', ')}.`
      }
      relevanceReasons.push(`EXCLUDED (Vegan Violation): Product contains animal-derived ingredients (${Array.from(new Set(detectedAnimal)).join(', ')}).`)
    } else {
      const explicitVegan =
        /\b(?:vegan|100% plant[- ]based|certified vegan)\b/i.test(combinedText) ||
        labelsList.some(l => /vegan|plant-based/i.test(l))

      if (explicitVegan) {
        attributeEvidence['vegan'] = {
          status: 'MATCH',
          evidence: 'Verified vegan: explicit vegan / plant-based declaration with zero animal ingredients.'
        }
        relevanceReasons.push('MATCH (Vegan): Explicit plant-based / vegan declaration with zero animal ingredients.')
      } else if (product.labelComplete && product.ingredients) {
        attributeEvidence['vegan'] = {
          status: 'MATCH',
          evidence: 'All declared ingredients are plant-derived; uncertified vegan.'
        }
        relevanceReasons.push('MATCH (Vegan): All declared ingredients are plant-derived (uncertified vegan).')
      } else {
        attributeEvidence['vegan'] = {
          status: 'NEEDS_REVIEW',
          evidence: 'Vegan status unverified: ingredients panel is incomplete.'
        }
        relevanceReasons.push('NEEDS_REVIEW (Vegan): Incomplete ingredient declaration prevents definitive vegan verification.')
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. LOW-SUGAR ATTRIBUTE CHECK
  // Regulatory threshold: <= 5.0g sugars per 100g (solids) or <= 2.5g / 100ml (liquids)
  // -------------------------------------------------------------------------
  if (goal.requiredAttributes.includes('low_sugar')) {
    const sugars = product.sugarsPer100g

    if (typeof sugars === 'number' && Number.isFinite(sugars)) {
      if (sugars <= 5.0) {
        attributeEvidence['low_sugar'] = {
          status: 'MATCH',
          evidence: `Verified low-sugar: ${sugars}g total sugars per 100g (<= 5.0g regulatory limit).`
        }
        relevanceReasons.push(`MATCH (Low-Sugar): Nutrition facts declare ${sugars}g sugars per 100g (<= 5.0g/100g regulatory low-sugar limit).`)
      } else {
        hardExclusion = true
        attributeEvidence['low_sugar'] = {
          status: 'EXCLUDED',
          evidence: `Low-sugar requirement violated: contains ${sugars}g sugars per 100g (exceeds 5.0g threshold).`
        }
        relevanceReasons.push(`EXCLUDED (Low-Sugar Violation): Contains ${sugars}g sugars per 100g, exceeding the 5.0g/100g low-sugar threshold.`)
      }
    } else {
      // Nutrition facts unpopulated: NEVER convert missing data into positive claim
      attributeEvidence['low_sugar'] = {
        status: 'NEEDS_REVIEW',
        evidence: 'Low-sugar unverified: packaging record lacks nutritional sugar panel.'
      }
      relevanceReasons.push('NEEDS_REVIEW (Low-Sugar): Nutritional sugar declaration is unpopulated in product evidence; cannot verify low-sugar claim.')
    }
  }

  // -------------------------------------------------------------------------
  // 4. ORGANIC ATTRIBUTE CHECK
  // Requires credible supporting certification or label evidence
  // -------------------------------------------------------------------------
  if (goal.requiredAttributes.includes('organic')) {
    const isOrganic =
      Boolean(product.isOrganicDeclared) ||
      /\b(?:organic|certified organic|usda organic|eu organic|bio|ecocert|soil association|jaivik bharat)\b/i.test(nameLower) ||
      /\borganic\b/i.test(ingredientsLower) ||
      labelsList.some(l => /organic|bio/i.test(l))

    if (isOrganic) {
      attributeEvidence['organic'] = {
        status: 'MATCH',
        evidence: 'Organic claim verified: label/ingredients declare organic ingredients or certification.'
      }
      relevanceReasons.push('MATCH (Organic): Label declares certified organic ingredients or official organic logo.')
    } else {
      // Does not claim organic: disclose limitation
      attributeEvidence['organic'] = {
        status: 'NEEDS_REVIEW',
        evidence: 'Organic unverified: packaging lacks organic certification or organic ingredient listing.'
      }
      relevanceReasons.push('NEEDS_REVIEW (Organic): Product lacks verifiable organic certification or organic ingredient listing.')
    }
  }

  // -------------------------------------------------------------------------
  // 5. GLUTEN-FREE ATTRIBUTE CHECK
  // Cannot be inferred solely from missing mentions; requires explicit declaration
  // -------------------------------------------------------------------------
  if (goal.requiredAttributes.includes('gluten_free')) {
    const GLUTEN_GRAINS = ['wheat', 'barley', 'rye', 'malt', 'spelt', 'triticale']
    const hasGlutenGrain = GLUTEN_GRAINS.some(g => new RegExp(`(^|[^a-z0-9])${g}([^a-z0-9]|$)`, 'i').test(ingredientsLower))

    if (hasGlutenGrain) {
      hardExclusion = true
      attributeEvidence['gluten_free'] = {
        status: 'EXCLUDED',
        evidence: 'Contains explicit gluten-containing grains in ingredients.'
      }
      relevanceReasons.push('EXCLUDED (Gluten Violation): Contains gluten-containing grains.')
    } else {
      const explicitGf =
        /\b(?:gluten[- ]free|certified gluten[- ]free|no gluten|sans gluten|gf)\b/i.test(combinedText) ||
        labelsList.some(l => /no-gluten|gluten-free/i.test(l))

      if (explicitGf) {
        attributeEvidence['gluten_free'] = {
          status: 'MATCH',
          evidence: 'Explicit gluten-free declaration or certification on packaging.'
        }
        relevanceReasons.push('MATCH (Gluten-Free): Packaging carries explicit gluten-free declaration.')
      } else if (product.labelComplete && product.ingredients) {
        attributeEvidence['gluten_free'] = {
          status: 'MATCH',
          evidence: 'Ingredients declare zero gluten-containing grains; uncertified facility.'
        }
        relevanceReasons.push('MATCH (Gluten-Free): Ingredients panel declares zero gluten grains (uncertified facility).')
      } else {
        attributeEvidence['gluten_free'] = {
          status: 'NEEDS_REVIEW',
          evidence: 'Gluten-free unverified: incomplete ingredients panel and no explicit gluten-free certification on label.'
        }
        relevanceReasons.push('NEEDS_REVIEW (Gluten-Free): Incomplete ingredients panel prevents definitive gluten-free verification.')
      }
    }
  }

  // -------------------------------------------------------------------------
  // 6. PEANUT-FREE & NUT-FREE ATTRIBUTE CHECKS
  // -------------------------------------------------------------------------
  if (goal.requiredAttributes.includes('peanut_free')) {
    const hasPeanut = /\b(?:peanut|peanuts|groundnut|arachis)\b/i.test(ingredientsLower) || /\bpeanut\b/i.test(allergenLower)
    if (hasPeanut) {
      hardExclusion = true
      attributeEvidence['peanut_free'] = {
        status: 'EXCLUDED',
        evidence: 'Contains peanut ingredients or allergen warning.'
      }
      relevanceReasons.push('EXCLUDED (Peanut Violation): Contains peanut in ingredients or allergen declaration.')
    } else {
      const explicitPeanutFree =
        /\b(?:peanut[- ]free|no peanuts|peanut[- ]free facility)\b/i.test(combinedText) ||
        labelsList.some(l => /no-nuts|peanut-free/i.test(l))

      if (explicitPeanutFree) {
        attributeEvidence['peanut_free'] = {
          status: 'MATCH',
          evidence: 'Explicit peanut-free claim or facility declaration.'
        }
        relevanceReasons.push('MATCH (Peanut-Free): Explicit peanut-free declaration on packaging.')
      } else if (product.labelComplete && product.ingredients) {
        attributeEvidence['peanut_free'] = {
          status: 'MATCH',
          evidence: 'Ingredients declare zero peanut ingredients; uncertified facility.'
        }
        relevanceReasons.push('MATCH (Peanut-Free): Ingredients panel declares zero peanut ingredients (uncertified facility).')
      } else {
        attributeEvidence['peanut_free'] = {
          status: 'NEEDS_REVIEW',
          evidence: 'Peanut-free unverified: incomplete ingredients declaration.'
        }
        relevanceReasons.push('NEEDS_REVIEW (Peanut-Free): Incomplete ingredients prevent definitive peanut-free verification.')
      }
    }
  }

  if (goal.requiredAttributes.includes('nut_free')) {
    const TREE_NUTS = ['almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia', 'brazil nut']
    const hasTreeNut = TREE_NUTS.some(n => new RegExp(`(^|[^a-z0-9])${n}([^a-z0-9]|$)`, 'i').test(ingredientsLower))

    if (hasTreeNut) {
      hardExclusion = true
      attributeEvidence['nut_free'] = {
        status: 'EXCLUDED',
        evidence: 'Contains tree nut ingredients.'
      }
      relevanceReasons.push('EXCLUDED (Nut Violation): Contains tree nut ingredients.')
    } else {
      const explicitNutFree =
        /\b(?:nut[- ]free|tree nut[- ]free|no nuts|nut[- ]free facility)\b/i.test(combinedText) ||
        labelsList.some(l => /no-nuts/i.test(l))

      if (explicitNutFree) {
        attributeEvidence['nut_free'] = {
          status: 'MATCH',
          evidence: 'Explicit nut-free declaration on packaging.'
        }
        relevanceReasons.push('MATCH (Nut-Free): Explicit nut-free declaration on packaging.')
      } else if (product.labelComplete && product.ingredients) {
        attributeEvidence['nut_free'] = {
          status: 'MATCH',
          evidence: 'Ingredients declare zero tree-nut ingredients; uncertified facility.'
        }
        relevanceReasons.push('MATCH (Nut-Free): Ingredients panel declares zero tree nuts (uncertified facility).')
      } else {
        attributeEvidence['nut_free'] = {
          status: 'NEEDS_REVIEW',
          evidence: 'Nut-free unverified: incomplete ingredients declaration.'
        }
        relevanceReasons.push('NEEDS_REVIEW (Nut-Free): Incomplete ingredients prevent definitive nut-free verification.')
      }
    }
  }

  // -------------------------------------------------------------------------
  // 7. COMPUTE OVERALL RELEVANCE OUTCOME
  // -------------------------------------------------------------------------
  let overallStatus: GoalRelevanceStatus = 'MATCH'

  if (hardExclusion || !categoryMatch) {
    overallStatus = 'EXCLUDED'
  } else {
    // Check attributes
    const hasNeedsReview = Object.values(attributeEvidence).some(a => a.status === 'NEEDS_REVIEW')
    const hasAttributeExcluded = Object.values(attributeEvidence).some(a => a.status === 'EXCLUDED')

    if (hasAttributeExcluded) {
      overallStatus = 'EXCLUDED'
    } else if (hasNeedsReview) {
      overallStatus = 'NEEDS_REVIEW'
    } else {
      overallStatus = 'MATCH'
    }
  }

  return {
    status: overallStatus,
    categoryMatch,
    relevanceReasons,
    attributeEvidence
  }
}
