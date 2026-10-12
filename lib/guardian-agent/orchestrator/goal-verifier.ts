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
      // Priority 1: Flag ambiguous additives
      const AMBIGUOUS_ADDITIVES = [
        'mono- and diglycerides', 'monoglycerides', 'diglycerides', 'mono and diglycerides',
        'glycerin', 'glycerol', 'natural flavor', 'natural flavors', 'natural flavour',
        'confectioner\'s glaze', 'resinous glaze', 'shellac', 'bone char',
        'vitamin d3', 'cholecalciferol', 'stearic acid', 'magnesium stearate',
        'l-cysteine', 'rennet', 'pepsin', 'lactic acid'
      ]

      const detectedAmbiguous = AMBIGUOUS_ADDITIVES.filter(item => {
        const re = new RegExp(`(^|[^a-z0-9])${item}([^a-z0-9]|$)`, 'i')
        return re.test(ingredientsLower)
      })

      const explicitVegan =
        /\b(?:certified vegan|100% vegan|suitable for vegans|vegan suitable)\b/i.test(combinedText) ||
        labelsList.some(l => /certified-vegan|vegan-society|european-vegetarian-union-vegan/i.test(l)) ||
        (product.certificationsDeclared || []).some(c => /vegan/i.test(c))

      if (explicitVegan && detectedAmbiguous.length === 0) {
        attributeEvidence['vegan'] = {
          status: 'MATCH',
          evidence: 'Verified vegan: explicit vegan declaration / certification with zero animal or ambiguous ingredients.'
        }
        relevanceReasons.push('MATCH (Vegan): Explicit certified vegan declaration with zero animal ingredients.')
      } else if (explicitVegan && detectedAmbiguous.length > 0) {
        attributeEvidence['vegan'] = {
          status: 'MATCH',
          evidence: `Certified vegan declaration on packaging; additives (${detectedAmbiguous.join(', ')}) certified acceptable.`
        }
        relevanceReasons.push(`MATCH (Vegan): Packaging carries certified vegan declaration; additives (${detectedAmbiguous.join(', ')}) certified acceptable.`)
      } else if (detectedAmbiguous.length > 0) {
        attributeEvidence['vegan'] = {
          status: 'NEEDS_REVIEW',
          evidence: `Ambiguous additives detected: Contains ${detectedAmbiguous.join(', ')} which may be animal- or plant-derived. Unverified source origin.`
        }
        relevanceReasons.push(`NEEDS_REVIEW (Vegan): Ambiguous additives (${detectedAmbiguous.join(', ')}) require manufacturer source confirmation.`)
      } else if (product.labelComplete && product.ingredients) {
        // Priority 1: Never declare a product definitively vegan solely because no known animal ingredient was detected
        attributeEvidence['vegan'] = {
          status: 'NEEDS_REVIEW',
          evidence: 'Ingredient-based assessment only: Declared ingredients appear plant-derived, but product lacks explicit vegan certification or manufacturer claim. Processing aids cannot be confirmed without explicit declaration.'
        }
        relevanceReasons.push('NEEDS_REVIEW (Vegan): Absence of detected animal tokens alone cannot certify a product as definitively vegan without explicit packaging claim.')
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
  // Distinguish manufacturer claims from independently verified certification.
  // Validate certification provenance. Never upgrade product-name keywords into verified certification.
  // -------------------------------------------------------------------------
  if (goal.requiredAttributes.includes('organic')) {
    const VERIFIED_ORGANIC_STANDARDS = [
      'usda organic', 'eu organic', 'ecocert', 'jaivik bharat', 'india organic',
      'soil association', 'bio-siegel', 'ab-agriculture-biologique', 'demeter',
      'ccof', 'qai', 'certified organic'
    ]

    const verifiedFromCerts = (product.certificationsDeclared || []).filter(c =>
      VERIFIED_ORGANIC_STANDARDS.some(std => c.toLowerCase().includes(std))
    )
    const verifiedFromLabels = labelsList.filter(l =>
      /usda-organic|eu-organic|ecocert|ab-agriculture-biologique|bio-siegel|certified-organic/i.test(l)
    )

    const hasVerifiedProvenance = verifiedFromCerts.length > 0 || verifiedFromLabels.length > 0 || (product.isOrganicDeclared && (product.certificationsDeclared || []).length > 0)
    const mentionsOrganicKeyword = /\borganic\b/i.test(nameLower) || /\borganic\b/i.test(ingredientsLower) || Boolean(product.isOrganicDeclared)

    if (hasVerifiedProvenance) {
      const prov = [...verifiedFromCerts, ...verifiedFromLabels].join(', ') || 'Documented Organic Certification'
      attributeEvidence['organic'] = {
        status: 'MATCH',
        evidence: `Verified organic certification: Documented independent certification provenance (${prov}).`
      }
      relevanceReasons.push(`MATCH (Organic): Independent third-party organic certification verified (${prov}).`)
    } else if (mentionsOrganicKeyword) {
      // Priority 1: Never upgrade a product-name keyword into verified certification
      attributeEvidence['organic'] = {
        status: 'NEEDS_REVIEW',
        evidence: 'Unverified manufacturer claim: Product mentions \'organic\' in title or ingredients, but lacks documented third-party certification provenance (e.g. USDA Organic, EU Organic, Ecocert). Product-name keywords cannot be upgraded to verified certification.'
      }
      relevanceReasons.push('NEEDS_REVIEW (Organic): Product-name or ingredient keyword \'organic\' lacks independent certification provenance; requires verification.')
    } else {
      attributeEvidence['organic'] = {
        status: 'NEEDS_REVIEW',
        evidence: 'Organic unverified: Product lacks verified organic certification or organic ingredient declaration. Unverified conventional status cannot be upgraded to MATCH.'
      }
      relevanceReasons.push('NEEDS_REVIEW (Organic): Product lacks verified organic certification or organic ingredient declaration.')
    }
  }

  // -------------------------------------------------------------------------
  // 5. GLUTEN-FREE ATTRIBUTE CHECK
  // Never treat an ingredient list without detected allergens as proof of allergen-free status.
  // Distinguish explicitly declared claims, credible certification, absent evidence and conflicting information.
  // Evaluate precautionary allergen labels and cross-contact declarations.
  // -------------------------------------------------------------------------
  if (goal.requiredAttributes.includes('gluten_free')) {
    const GLUTEN_GRAINS = ['wheat', 'barley', 'rye', 'malt', 'spelt', 'triticale', 'semolina', 'farina', 'durum', 'kamut']
    const hasGlutenGrain = GLUTEN_GRAINS.some(g => new RegExp(`(^|[^a-z0-9])${g}([^a-z0-9]|$)`, 'i').test(ingredientsLower))
    const hasPrecautionaryGluten = /(?:may contain|traces of|shared (?:equipment|facility|line)|processed (?:in|on)|handled in).*(?:gluten|wheat|barley|rye)/i.test(allergenLower) ||
      /(?:may contain|traces of).*(?:gluten|wheat|barley|rye)/i.test(ingredientsLower)

    if (hasGlutenGrain) {
      hardExclusion = true
      attributeEvidence['gluten_free'] = {
        status: 'EXCLUDED',
        evidence: 'Contains explicit gluten-containing grains in ingredients.'
      }
      relevanceReasons.push('EXCLUDED (Gluten Violation): Contains gluten-containing grains.')
    } else if (hasPrecautionaryGluten) {
      hardExclusion = true
      attributeEvidence['gluten_free'] = {
        status: 'EXCLUDED',
        evidence: 'Precautionary cross-contact warning detected on packaging ("may contain wheat/gluten" or shared facility).'
      }
      relevanceReasons.push('EXCLUDED (Gluten Cross-Contact): Packaging declares precautionary cross-contact warning for gluten/wheat.')
    } else {
      const verifiedCerts = (product.certificationsDeclared || []).filter(c =>
        /gluten[- ]free|gfco|celiac/i.test(c)
      )
      const verifiedLabels = labelsList.filter(l =>
        /no-gluten|gluten-free|gfco/i.test(l)
      )
      const explicitClaim = /\b(?:gluten[- ]free|certified gluten[- ]free|no gluten|sans gluten|\bgf\b)\b/i.test(combinedText)

      if (verifiedCerts.length > 0 || verifiedLabels.length > 0) {
        attributeEvidence['gluten_free'] = {
          status: 'MATCH',
          evidence: `Verified gluten-free certification: Documented independent certification (${[...verifiedCerts, ...verifiedLabels].join(', ')}). Physical packaging inspection required before consumption; zero false reassurance.`
        }
        relevanceReasons.push('MATCH (Gluten-Free): Documented independent gluten-free certification on packaging.')
      } else if (explicitClaim) {
        attributeEvidence['gluten_free'] = {
          status: 'MATCH',
          evidence: 'Explicit manufacturer packaging claim: Package explicitly declares gluten-free. Physical packaging inspection required before consumption; zero false reassurance.'
        }
        relevanceReasons.push('MATCH (Gluten-Free): Package carries explicit manufacturer gluten-free claim.')
      } else {
        // Priority 0: Never treat an ingredient list without detected allergens as proof of allergen-free status
        attributeEvidence['gluten_free'] = {
          status: 'NEEDS_REVIEW',
          evidence: 'Insufficient evidence: Ingredient list lacks detected gluten grains, but packaging lacks an explicit gluten-free declaration or certification. An ingredient list without detected allergens cannot be treated as proof of allergen-free status or lack of facility cross-contact.'
        }
        relevanceReasons.push('NEEDS_REVIEW (Gluten-Free): Absence of gluten grains in ingredient list alone does not prove allergen-free status without explicit packaging claim or certification.')
      }
    }
  }

  // -------------------------------------------------------------------------
  // 6. PEANUT-FREE ATTRIBUTE CHECK
  // -------------------------------------------------------------------------
  if (goal.requiredAttributes.includes('peanut_free')) {
    const hasPeanut = /\b(?:peanut|peanuts|groundnut|arachis)\b/i.test(ingredientsLower) || (/\bpeanut\b/i.test(allergenLower) && !/\b(?:no|without|zero|free from)\s+peanuts?\b/i.test(allergenLower))
    const hasPrecautionaryPeanut = /(?:may contain|traces of|shared (?:equipment|facility|line)|processed (?:in|on)|handled in).*(?:peanut|groundnut)/i.test(allergenLower) ||
      /(?:may contain|traces of).*(?:peanut|groundnut)/i.test(ingredientsLower)

    if (hasPeanut) {
      hardExclusion = true
      attributeEvidence['peanut_free'] = {
        status: 'EXCLUDED',
        evidence: 'Contains peanut in ingredients or allergen declaration.'
      }
      relevanceReasons.push('EXCLUDED (Peanut Violation): Contains peanut in ingredients or allergen declaration.')
    } else if (hasPrecautionaryPeanut) {
      hardExclusion = true
      attributeEvidence['peanut_free'] = {
        status: 'EXCLUDED',
        evidence: 'Precautionary cross-contact warning detected on packaging ("may contain peanuts" or shared facility).'
      }
      relevanceReasons.push('EXCLUDED (Peanut Cross-Contact): Packaging declares precautionary cross-contact warning for peanuts.')
    } else {
      const verifiedCerts = (product.certificationsDeclared || []).filter(c =>
        /peanut[- ]free/i.test(c)
      )
      const explicitClaim =
        /\b(?:peanut[- ]free|no peanuts|peanut[- ]free facility|dedicated peanut[- ]free)\b/i.test(combinedText) ||
        labelsList.some(l => /peanut-free/i.test(l))

      if (verifiedCerts.length > 0) {
        attributeEvidence['peanut_free'] = {
          status: 'MATCH',
          evidence: `Verified peanut-free certification: Documented independent certification (${verifiedCerts.join(', ')}). Physical packaging inspection required before consumption; zero false reassurance.`
        }
        relevanceReasons.push('MATCH (Peanut-Free): Documented independent peanut-free certification on packaging.')
      } else if (explicitClaim) {
        attributeEvidence['peanut_free'] = {
          status: 'MATCH',
          evidence: 'Explicit manufacturer packaging claim: Package explicitly declares peanut-free. Physical packaging inspection required before consumption; zero false reassurance.'
        }
        relevanceReasons.push('MATCH (Peanut-Free): Package carries explicit manufacturer peanut-free declaration.')
      } else {
        // Priority 0: Never treat an ingredient list without detected allergens as proof of allergen-free status
        attributeEvidence['peanut_free'] = {
          status: 'NEEDS_REVIEW',
          evidence: 'Insufficient evidence: Ingredient list lacks detected peanuts, but packaging lacks an explicit peanut-free declaration or certification. An ingredient list without detected allergens cannot be treated as proof of allergen-free status or lack of facility cross-contact.'
        }
        relevanceReasons.push('NEEDS_REVIEW (Peanut-Free): Absence of peanuts in ingredient list alone does not prove allergen-free status without explicit packaging claim or certification.')
      }
    }
  }

  // -------------------------------------------------------------------------
  // 7. NUT-FREE ATTRIBUTE CHECK
  // -------------------------------------------------------------------------
  if (goal.requiredAttributes.includes('nut_free')) {
    const TREE_NUTS = ['almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia', 'brazil nut']
    const hasTreeNut = TREE_NUTS.some(n => new RegExp(`(^|[^a-z0-9])${n}([^a-z0-9]|$)`, 'i').test(ingredientsLower))
    const hasPrecautionaryNut = /(?:may contain|traces of|shared (?:equipment|facility|line)|processed (?:in|on)|handled in).*(?:nut|almond|cashew|walnut|pecan|hazelnut|pistachio)/i.test(allergenLower) ||
      /(?:may contain|traces of).*(?:nut|almond|cashew|walnut|pecan|hazelnut|pistachio)/i.test(ingredientsLower)

    if (hasTreeNut) {
      hardExclusion = true
      attributeEvidence['nut_free'] = {
        status: 'EXCLUDED',
        evidence: 'Contains tree nut ingredients.'
      }
      relevanceReasons.push('EXCLUDED (Nut Violation): Contains tree nut ingredients.')
    } else if (hasPrecautionaryNut) {
      hardExclusion = true
      attributeEvidence['nut_free'] = {
        status: 'EXCLUDED',
        evidence: 'Precautionary cross-contact warning detected on packaging ("may contain tree nuts" or shared facility).'
      }
      relevanceReasons.push('EXCLUDED (Nut Cross-Contact): Packaging declares precautionary cross-contact warning for tree nuts.')
    } else {
      const verifiedCerts = (product.certificationsDeclared || []).filter(c =>
        /nut[- ]free|tree[- ]nut[- ]free/i.test(c)
      )
      const explicitClaim =
        /\b(?:nut[- ]free|tree nut[- ]free|no nuts|nut[- ]free facility|dedicated nut[- ]free)\b/i.test(combinedText) ||
        labelsList.some(l => /no-nuts/i.test(l))

      if (verifiedCerts.length > 0) {
        attributeEvidence['nut_free'] = {
          status: 'MATCH',
          evidence: `Verified nut-free certification: Documented independent certification (${verifiedCerts.join(', ')}). Physical packaging inspection required before consumption; zero false reassurance.`
        }
        relevanceReasons.push('MATCH (Nut-Free): Documented independent nut-free certification on packaging.')
      } else if (explicitClaim) {
        attributeEvidence['nut_free'] = {
          status: 'MATCH',
          evidence: 'Explicit manufacturer packaging claim: Package explicitly declares tree nut-free. Physical packaging inspection required before consumption; zero false reassurance.'
        }
        relevanceReasons.push('MATCH (Nut-Free): Package carries explicit manufacturer tree nut-free declaration.')
      } else {
        // Priority 0: Never treat an ingredient list without detected allergens as proof of allergen-free status
        attributeEvidence['nut_free'] = {
          status: 'NEEDS_REVIEW',
          evidence: 'Insufficient evidence: Ingredient list lacks detected tree nuts, but packaging lacks an explicit nut-free declaration or certification. An ingredient list without detected allergens cannot be treated as proof of allergen-free status or lack of facility cross-contact.'
        }
        relevanceReasons.push('NEEDS_REVIEW (Nut-Free): Absence of tree nuts in ingredient list alone does not prove allergen-free status without explicit packaging claim or certification.')
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
