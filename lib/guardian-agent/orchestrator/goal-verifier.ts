import {
  ClaimedCertification,
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
  } else if (/(?:almond\s*butter|cashew\s*butter|hazelnut\s*butter|nut\s*butter|walnut\s*butter|pistachio\s*butter)/i.test(goalLower)) {
    requiredCategory = 'nut_butter_spread'
    categoryKeywords = [
      'nut butter',
      'almond butter',
      'cashew butter',
      'hazelnut butter',
      'walnut butter',
      'pistachio butter'
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
      'clarified butter'
    ]
  } else if (/(?:vegan\s*snack|plant[- ]based\s*snack)/i.test(goalLower)) {
    requiredCategory = 'vegan_snack'
    categoryKeywords = [
      'vegan snack',
      'plant-based snack',
      'snack',
      'crisps',
      'chips',
      'crackers',
      'bar'
    ]
    excludedCategoryKeywords = [
      'dairy snack',
      'milk chocolate',
      'cheese puffs',
      'cheese snack',
      'dairy yogurt',
      'pasteurized butter'
    ]
  } else if (/(?:gluten[- ]free\s*bread|bread|sourdough|bagel|toast|loaf)/i.test(goalLower)) {
    requiredCategory = 'bread'
    categoryKeywords = [
      'bread',
      'loaf',
      'sourdough',
      'bagel',
      'toast',
      'sliced bread'
    ]
    excludedCategoryKeywords = [
      'candy',
      'chocolate',
      'dairy butter',
      'energy bar',
      'sauce'
    ]
  } else if (/(?:breakfast\s*cereal|cereal|granola|muesli|cornflakes|oatmeal|rolled oats)/i.test(goalLower)) {
    requiredCategory = 'breakfast_cereal'
    categoryKeywords = [
      'cereal',
      'granola',
      'muesli',
      'cornflakes',
      'oatmeal',
      'rolled oats',
      'breakfast flakes'
    ]
    excludedCategoryKeywords = [
      'shampoo',
      'soap',
      'detergent',
      'cleaner',
      'dairy butter',
      'meat'
    ]
  } else {
    // Fallback: extract primary noun phrase
    const cleaned = rawGoal
      .replace(/^(?:find|search for|search|look for|check|get|buy|locate|compare|rank|sort|order|filter|list|show|recommend|suggest|give me|find me)\s+(?:me\s+)?(?:a\s+|an\s+|some\s+|the\s+)?(?:top\s+\d+\s+)?(?:best\s+)?(?:cheapest\s+)?(?:budget\s+)?/i, '')
      .replace(/\b(for\s+[a-z\s_-]+allergy|allergy|allergies|allergic)\b/gi, '')
      .replace(/\b(organic|vegan|low[- ]sugar|healthy|safe|allergy[- ]safe|nut[- ]free|peanut[- ]free|gluten[- ]free|budget)\b/gi, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const firstWord = cleaned.split(/\s+/)[0]?.toLowerCase()
    if (!firstWord || ['food', 'snack', 'snacks', 'item', 'items', 'products', 'product', 'brands', 'options', 'choices'].includes(firstWord)) {
      requiredCategory = 'general_food'
      categoryKeywords = ['food', 'snack', 'item', 'product']
    } else {
      requiredCategory = cleaned.split(/\s+/).slice(0, 3).join('_') || 'packaged_food'
      categoryKeywords = Array.from(new Set([cleaned.slice(0, 50), ...cleaned.split(/\s+/).filter(w => w.length > 2)]))
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

import {
  APPROVED_REGISTRY_DOMAINS,
  APPROVED_VERIFICATION_METHODS,
  AUTHORITATIVE_REVOCATION_REGISTRY,
  isCertificateRevoked,
  generateServerAttestation,
  verifyServerAttestation,
  isValidAttestationSecret,
  DEPRECATED_FALLBACK_SECRET,
  verifyClaimedCertification,
  verifyClaimedCertificationAsync
} from './certification-verifier'

export {
  APPROVED_REGISTRY_DOMAINS,
  APPROVED_VERIFICATION_METHODS,
  AUTHORITATIVE_REVOCATION_REGISTRY,
  isCertificateRevoked,
  generateServerAttestation,
  verifyServerAttestation,
  isValidAttestationSecret,
  DEPRECATED_FALLBACK_SECRET,
  verifyClaimedCertification,
  verifyClaimedCertificationAsync
}
import { serverEvidenceStore, AuditableVerificationOperation } from './evidence-store'


/**
 * P0: Verify whether a product has independently authenticated certification
 * satisfying strict provenance requirements.
 *
 * Rules:
 * - A string in certificationsDeclared must NEVER automatically establish verified certification.
 * - Must match product identity (associatedProductId === product.id) and brand where declared.
 * - Must be active (status === 'ACTIVE') and not revoked (isRevoked !== true, not in revocation registry).
 * - Must possess a non-empty, valid evidenceUrl belonging to an approved authoritative registry domain.
 * - scansafe.co.in is strictly removed from approved registry domains.
 * - An approved URL hostname or registryConfirmed flag alone does NOT prove certificate existence or validity.
 * - Must possess a valid server attestation token or match an authoritative registry database entry.
 * - Must possess a valid, non-future-dated verification timestamp (verifiedAt).
 * - Must possess an explicitly approved verification method (REGISTRY_LOOKUP_AUTHENTICATED or EXTERNAL_STANDARDS_VERIFIER).
 * - Provenance level must strictly be INDEPENDENTLY_AUTHENTICATED_CERTIFICATION.
 * - Fails closed on any inconsistency or missing proof.
 */
export function findAuthenticatedCertification(
  product: ProductEvidence,
  standardKeywords: RegExp,
  explicitOpsMap?: Map<string, AuditableVerificationOperation | null>
): {
  authenticated: boolean
  record?: ClaimedCertification
  invalidationReason?: string
} {
  const records = product.certifiedRecords || []

  // Find candidate records matching the standard keyword
  const matchingRecords = records.filter(r => {
    const s = (r.standard || '').replace(/_/g, ' ')
    const b = (r.certificationBody || '').replace(/_/g, ' ')
    const n = (r.notes || '').replace(/_/g, ' ')
    return (
      standardKeywords.test(r.standard || '') ||
      standardKeywords.test(s) ||
      standardKeywords.test(r.certificationBody || '') ||
      standardKeywords.test(b) ||
      standardKeywords.test(r.notes || '') ||
      standardKeywords.test(n)
    )
  })

  if (matchingRecords.length === 0) {
    const rawMatches = (product.certificationsDeclared || []).filter(c => standardKeywords.test(c))
    if (rawMatches.length > 0) {
      return {
        authenticated: false,
        invalidationReason: `Unverified claim: Product declares "${rawMatches.join(', ')}" in packaging metadata, but lacks documented third-party certification record or registry authentication. Raw declaration strings cannot establish verified certification.`
      }
    }
    return { authenticated: false }
  }

  for (const record of matchingRecords) {
    const normId = (record.certificationId || '').trim().toUpperCase()
    const explicitOp = explicitOpsMap
      ? (explicitOpsMap.get(normId) ?? null)
      : (process.env.NODE_ENV === 'production' ? null : undefined)
    const verifyRes = verifyClaimedCertification(record, product, explicitOp)
    if (verifyRes.authenticated) {
      return {
        authenticated: true,
        record
      }
    } else {
      return {
        authenticated: false,
        record,
        invalidationReason: verifyRes.invalidationReason
      }
    }
  }

  return { authenticated: false }
}

/**
 * Asynchronously verifies whether a product has independently authenticated certification
 * against the persistent Supabase evidence store.
 */
export async function findAuthenticatedCertificationAsync(
  product: ProductEvidence,
  standardKeywords: RegExp
): Promise<{
  authenticated: boolean
  record?: ClaimedCertification
  invalidationReason?: string
}> {
  const records = product.certifiedRecords || []

  const matchingRecords = records.filter(r => {
    const s = (r.standard || '').replace(/_/g, ' ')
    const b = (r.certificationBody || '').replace(/_/g, ' ')
    const n = (r.notes || '').replace(/_/g, ' ')
    return (
      standardKeywords.test(r.standard || '') ||
      standardKeywords.test(s) ||
      standardKeywords.test(r.certificationBody || '') ||
      standardKeywords.test(b) ||
      standardKeywords.test(r.notes || '') ||
      standardKeywords.test(n)
    )
  })

  if (matchingRecords.length === 0) {
    const rawMatches = (product.certificationsDeclared || []).filter(c => standardKeywords.test(c))
    if (rawMatches.length > 0) {
      return {
        authenticated: false,
        invalidationReason: `Unverified claim: Product declares "${rawMatches.join(', ')}" in packaging metadata, but lacks documented third-party certification record or registry authentication. Raw declaration strings cannot establish verified certification.`
      }
    }
    return { authenticated: false }
  }

  for (const record of matchingRecords) {
    const verifyRes = await verifyClaimedCertificationAsync(record, product)
    if (verifyRes.authenticated) {
      return {
        authenticated: true,
        record
      }
    } else {
      return {
        authenticated: false,
        record,
        invalidationReason: verifyRes.invalidationReason
      }
    }
  }

  return { authenticated: false }
}



/**
 * Priority 1: Goal-Matching Verification Engine.
 * Evaluates candidate products against decomposed requirements.
 * Every product must satisfy hard requirements before being shortlisted.
 */
export function evaluateProductGoalRelevance(
  product: ProductEvidence,
  goal: DecomposedGoal,
  explicitOpsMap?: Map<string, AuditableVerificationOperation | null>
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
  } else if (goal.requiredCategory === 'nut_butter_spread') {
    const isDairyButter =
      /\b(?:pasteurized butter|cream|table butter|dairy butter|cow butter|makhan|ghee|beurre)\b/i.test(nameLower) ||
      /\b(?:butterfat|milk fat|pasteurized cream|cow's milk)\b/i.test(ingredientsLower) ||
      categoriesList.some(c => /butters|beurres|dairy/i.test(c) && !/nut|almond|cashew|hazelnut|noisette|amande/i.test(c))

    const isNutButter =
      /\b(?:nut butter|almond butter|cashew butter|hazelnut butter|walnut butter|pistachio butter)\b/i.test(nameLower) ||
      /\b(?:roasted almonds|roasted cashews|roasted hazelnuts|roasted walnuts)\b/i.test(ingredientsLower) ||
      categoriesList.some(c => /nut butter|almond butter|cashew butter/i.test(c))

    if (isDairyButter && !isNutButter) {
      categoryMatch = false
      hardExclusion = true
      relevanceReasons.push('EXCLUDED (Category Violation): Product is ordinary animal dairy butter (milk fat), not a nut butter spread.')
    } else if (isNutButter) {
      categoryMatch = true
      relevanceReasons.push('MATCH (Category): Product verified as nut butter spread.')
    } else {
      categoryMatch = false
      relevanceReasons.push('NEEDS_REVIEW (Category): Product lacks verified nut-butter credentials in title or ingredients.')
    }
  } else if (goal.requiredCategory === 'vegan_snack') {
    const isDairySnack =
      /\b(?:cheese snack|cheese puffs|milk chocolate|dairy yogurt|dairy bar|whey snack)\b/i.test(nameLower) ||
      /\b(?:cheese powder|milk chocolate|whey protein isolate|casein|milk fat)\b/i.test(ingredientsLower)

    const isSnack =
      /\b(?:snack|bar|crisps|chips|crackers|bites|nuts|popcorn|trail mix)\b/i.test(nameLower) ||
      categoriesList.some(c => /snack|biscuit|chips|crackers/i.test(c))

    if (isDairySnack) {
      categoryMatch = false
      hardExclusion = true
      relevanceReasons.push('EXCLUDED (Category Violation): Product is a dairy-based snack, not a vegan snack.')
    } else if (isSnack) {
      categoryMatch = true
      relevanceReasons.push('MATCH (Category): Product matches snack category.')
    } else {
      categoryMatch = false
      relevanceReasons.push('NEEDS_REVIEW (Category): Unclear whether product is a snack.')
    }
  } else if (goal.requiredCategory === 'bread') {
    const isBread =
      /\b(?:bread|loaf|sourdough|bagel|toast|buns|rolls)\b/i.test(nameLower) ||
      categoriesList.some(c => /bread|pain|boulangerie/i.test(c))

    const isNonBread =
      /\b(?:candy|chocolate|butter|sauce|dressing|bar)\b/i.test(nameLower) && !isBread

    if (isNonBread) {
      categoryMatch = false
      hardExclusion = true
      relevanceReasons.push('EXCLUDED (Category Violation): Product is not bread.')
    } else if (isBread) {
      categoryMatch = true
      relevanceReasons.push('MATCH (Category): Product matches bread category.')
    } else {
      categoryMatch = false
      relevanceReasons.push('NEEDS_REVIEW (Category): Unclear whether product is bread.')
    }
  } else if (goal.requiredCategory === 'breakfast_cereal') {
    const isCereal =
      /\b(?:cereal|granola|muesli|cornflakes|oatmeal|rolled oats|flakes|crisp rice)\b/i.test(nameLower) ||
      categoriesList.some(c => /cereal|granola|muesli|cereales/i.test(c))

    const isNonCereal =
      /\b(?:shampoo|soap|detergent|cleaner|butter|sauce|meat)\b/i.test(nameLower) && !isCereal

    if (isNonCereal) {
      categoryMatch = false
      hardExclusion = true
      relevanceReasons.push('EXCLUDED (Category Violation): Product is not breakfast cereal.')
    } else if (isCereal) {
      categoryMatch = true
      relevanceReasons.push('MATCH (Category): Product matches breakfast cereal category.')
    } else {
      categoryMatch = false
      relevanceReasons.push('NEEDS_REVIEW (Category): Unclear whether product is breakfast cereal.')
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
      categoryMatch = false
      relevanceReasons.push(`NEEDS_REVIEW (Category): Product lacks evidence confirming mandatory category "${goal.requiredCategory}".`)
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

      const certResult = findAuthenticatedCertification(product, /vegan|plant[- ]based/i, explicitOpsMap)

      if (certResult.authenticated && certResult.record) {
        if (detectedAmbiguous.length > 0) {
          attributeEvidence['vegan'] = {
            status: 'MATCH',
            evidence: `Independently authenticated vegan certification (${certResult.record.certificationBody}); additives (${detectedAmbiguous.join(', ')}) certified acceptable under standard.`
          }
          relevanceReasons.push(`MATCH (Vegan): Authenticated certification from ${certResult.record.certificationBody}; additives (${detectedAmbiguous.join(', ')}) verified compliant.`)
        } else {
          attributeEvidence['vegan'] = {
            status: 'MATCH',
            evidence: `Verified vegan: Authenticated record from ${certResult.record.certificationBody} (ID: ${certResult.record.certificationId || 'N/A'}, Proof: ${certResult.record.evidenceUrl}). Zero animal or ambiguous ingredients.`
          }
          relevanceReasons.push(`MATCH (Vegan): Verified by authenticated certificate from ${certResult.record.certificationBody}.`)
        }
      } else if (certResult.invalidationReason) {
        attributeEvidence['vegan'] = {
          status: 'NEEDS_REVIEW',
          evidence: certResult.invalidationReason
        }
        relevanceReasons.push(`NEEDS_REVIEW (Vegan): ${certResult.invalidationReason}`)
      } else if (detectedAmbiguous.length > 0) {
        attributeEvidence['vegan'] = {
          status: 'NEEDS_REVIEW',
          evidence: `Ambiguous additives detected: Contains ${detectedAmbiguous.join(', ')} which may be animal- or plant-derived. Unverified source origin.`
        }
        relevanceReasons.push(`NEEDS_REVIEW (Vegan): Ambiguous additives (${detectedAmbiguous.join(', ')}) require manufacturer source confirmation.`)
      } else {
        const explicitClaim =
          /\b(?:certified vegan|100% vegan|suitable for vegans|vegan suitable)\b/i.test(combinedText) ||
          (product.certificationsDeclared || []).some(c => /vegan/i.test(c)) ||
          labelsList.some(l => /vegan/i.test(l))

        if (explicitClaim) {
          attributeEvidence['vegan'] = {
            status: 'NEEDS_REVIEW',
            evidence: 'Unverified manufacturer packaging claim: Package declares vegan, but lacks independently authenticated certification registry proof. Processing aids and sub-ingredients cannot be confirmed without authenticated proof.'
          }
          relevanceReasons.push('NEEDS_REVIEW (Vegan): Package carries manufacturer claim, but lacks independently authenticated certification.')
        } else if (product.labelComplete && product.ingredients) {
          attributeEvidence['vegan'] = {
            status: 'NEEDS_REVIEW',
            evidence: 'Ingredient-based assessment only: Declared ingredients appear plant-derived, but product lacks independently authenticated certification. Absence of detected animal tokens alone cannot certify a product as definitively vegan without explicit packaging claim.'
          }
          relevanceReasons.push('NEEDS_REVIEW (Vegan): Absence of detected animal tokens alone cannot certify a product as definitively vegan without independently authenticated certification.')
        } else {
          attributeEvidence['vegan'] = {
            status: 'NEEDS_REVIEW',
            evidence: 'Vegan status unverified: ingredients panel is incomplete.'
          }
          relevanceReasons.push('NEEDS_REVIEW (Vegan): Incomplete ingredient declaration prevents definitive vegan verification.')
        }
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
    const certResult = findAuthenticatedCertification(
      product,
      /organic|usda organic|eu organic|ecocert|bio-siegel|soil association|demeter|ccof|qai|jaivik bharat/i,
      explicitOpsMap
    )

    if (certResult.authenticated && certResult.record) {
      attributeEvidence['organic'] = {
        status: 'MATCH',
        evidence: `Verified organic certification: Authenticated record from ${certResult.record.certificationBody} (ID: ${certResult.record.certificationId || 'N/A'}, Registry Proof: ${certResult.record.evidenceUrl}).`
      }
      relevanceReasons.push(`MATCH (Organic): Independent third-party organic certification verified (${certResult.record.certificationBody}).`)
    } else if (certResult.invalidationReason) {
      attributeEvidence['organic'] = {
        status: 'NEEDS_REVIEW',
        evidence: certResult.invalidationReason
      }
      relevanceReasons.push(`NEEDS_REVIEW (Organic): ${certResult.invalidationReason}`)
    } else {
      const mentionsOrganicKeyword = /\borganic\b/i.test(nameLower) || /\borganic\b/i.test(ingredientsLower) || Boolean(product.isOrganicDeclared)
      const declaredStringCerts = (product.certificationsDeclared || []).filter(c => /organic/i.test(c))

      if (declaredStringCerts.length > 0 || mentionsOrganicKeyword) {
        attributeEvidence['organic'] = {
          status: 'NEEDS_REVIEW',
          evidence: 'Unverified manufacturer / packaging claim: Product states organic in metadata or product title, but lacks independently authenticated certification record (provenance level INDEPENDENTLY_AUTHENTICATED_CERTIFICATION or DOCUMENTED_THIRD_PARTY_CLAIM with registry proof). String declarations alone cannot establish verified certification.'
        }
        relevanceReasons.push('NEEDS_REVIEW (Organic): Packaging claim lacks independently authenticated certification provenance; status is unverified.')
      } else {
        attributeEvidence['organic'] = {
          status: 'NEEDS_REVIEW',
          evidence: 'Organic unverified: Product lacks verified organic certification or organic ingredient declaration. Conventional products cannot satisfy organic requirements.'
        }
        relevanceReasons.push('NEEDS_REVIEW (Organic): Product lacks verified organic certification or organic ingredient declaration.')
      }
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
    const hasDirectAllergenGluten = /\b(?:gluten|wheat|barley|rye)\b/i.test(allergenLower) && !/\b(?:no|without|zero|free from)\s+(?:gluten|wheat|barley|rye)\b/i.test(allergenLower)

    const declaredCert = (product.certifiedRecords || []).find(r => /gluten[-_ ]free|gfco|celiac/i.test(r.standard || '') || /gluten[-_ ]free|gfco|celiac/i.test(r.certificationBody || ''))
    if (hasGlutenGrain || hasDirectAllergenGluten) {
      hardExclusion = true
      const certNote = declaredCert ? ` Conflicting certification claimed (${declaredCert.certificationBody}); allergen safety screening strictly overrides certification status.` : ''
      attributeEvidence['gluten_free'] = {
        status: 'EXCLUDED',
        evidence: `Contains explicit gluten-containing grains or declared gluten allergen in ingredients or allergen statement.${certNote}`
      }
      relevanceReasons.push(`EXCLUDED (Gluten Violation): Contains gluten-containing grains or declared gluten allergen.${certNote}`)
    } else if (hasPrecautionaryGluten) {
      hardExclusion = true
      const certNote = declaredCert ? ` Conflicting certification claimed (${declaredCert.certificationBody}); precautionary allergen cross-contact strictly overrides certification.` : ''
      attributeEvidence['gluten_free'] = {
        status: 'EXCLUDED',
        evidence: `Precautionary cross-contact warning detected on packaging ("may contain wheat/gluten" or shared facility).${certNote}`
      }
      relevanceReasons.push(`EXCLUDED (Gluten Cross-Contact): Packaging declares precautionary cross-contact warning for gluten/wheat.${certNote}`)
    } else {
      const certResult = findAuthenticatedCertification(product, /gluten[- ]free|gfco|celiac/i, explicitOpsMap)

      if (certResult.authenticated && certResult.record) {
        attributeEvidence['gluten_free'] = {
          status: 'MATCH',
          evidence: `Verified gluten-free certification: Authenticated record from ${certResult.record.certificationBody} (ID: ${certResult.record.certificationId || 'N/A'}, Proof: ${certResult.record.evidenceUrl}). Physical packaging inspection required before consumption; zero false reassurance.`
        }
        relevanceReasons.push(`MATCH (Gluten-Free): Authenticated independent gluten-free certification verified (${certResult.record.certificationBody}).`)
      } else if (certResult.invalidationReason) {
        attributeEvidence['gluten_free'] = {
          status: 'NEEDS_REVIEW',
          evidence: certResult.invalidationReason
        }
        relevanceReasons.push(`NEEDS_REVIEW (Gluten-Free): ${certResult.invalidationReason}`)
      } else {
        const explicitClaim = /\b(?:gluten[- ]free|certified gluten[- ]free|no gluten|sans gluten|\bgf\b)\b/i.test(combinedText) ||
          (product.certificationsDeclared || []).some(c => /gluten/i.test(c))

        if (explicitClaim) {
          attributeEvidence['gluten_free'] = {
            status: 'NEEDS_REVIEW',
            evidence: 'Unverified manufacturer packaging claim: Package explicitly declares gluten-free, but lacks independently authenticated certification registry proof. Physical packaging inspection required before consumption; zero false reassurance.'
          }
          relevanceReasons.push('NEEDS_REVIEW (Gluten-Free): Package carries manufacturer claim, but lacks independently authenticated certification.')
        } else {
          // Priority 0: Never treat an ingredient list without detected allergens as proof of allergen-free status
          attributeEvidence['gluten_free'] = {
            status: 'NEEDS_REVIEW',
            evidence: 'Insufficient evidence: Ingredient list lacks detected gluten grains, but packaging lacks independently authenticated gluten-free certification. An ingredient list without detected allergens cannot be treated as proof of allergen-free status or lack of facility cross-contact.'
          }
          relevanceReasons.push('NEEDS_REVIEW (Gluten-Free): Absence of gluten grains in ingredient list alone does not prove allergen-free status without independently authenticated certification.')
        }
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

    const declaredCert = (product.certifiedRecords || []).find(r => /peanut[-_ ]free/i.test(r.standard || '') || /peanut[-_ ]free/i.test(r.certificationBody || ''))
    if (hasPeanut) {
      hardExclusion = true
      const certNote = declaredCert ? ` Conflicting certification claimed (${declaredCert.certificationBody}); allergen safety screening strictly overrides certification status.` : ''
      attributeEvidence['peanut_free'] = {
        status: 'EXCLUDED',
        evidence: `Contains peanut in ingredients or allergen declaration.${certNote}`
      }
      relevanceReasons.push(`EXCLUDED (Peanut Violation): Contains peanut in ingredients or allergen declaration.${certNote}`)
    } else if (hasPrecautionaryPeanut) {
      hardExclusion = true
      const certNote = declaredCert ? ` Conflicting certification claimed (${declaredCert.certificationBody}); precautionary allergen cross-contact strictly overrides certification.` : ''
      attributeEvidence['peanut_free'] = {
        status: 'EXCLUDED',
        evidence: `Precautionary cross-contact warning detected on packaging ("may contain peanuts" or shared facility).${certNote}`
      }
      relevanceReasons.push(`EXCLUDED (Peanut Cross-Contact): Packaging declares precautionary cross-contact warning for peanuts.${certNote}`)
    } else {
      const certResult = findAuthenticatedCertification(product, /peanut[- ]free/i, explicitOpsMap)

      if (certResult.authenticated && certResult.record) {
        attributeEvidence['peanut_free'] = {
          status: 'MATCH',
          evidence: `Verified peanut-free certification: Authenticated record from ${certResult.record.certificationBody} (ID: ${certResult.record.certificationId || 'N/A'}, Proof: ${certResult.record.evidenceUrl}). Physical packaging inspection required before consumption; zero false reassurance.`
        }
        relevanceReasons.push(`MATCH (Peanut-Free): Authenticated independent peanut-free certification verified (${certResult.record.certificationBody}).`)
      } else if (certResult.invalidationReason) {
        attributeEvidence['peanut_free'] = {
          status: 'NEEDS_REVIEW',
          evidence: certResult.invalidationReason
        }
        relevanceReasons.push(`NEEDS_REVIEW (Peanut-Free): ${certResult.invalidationReason}`)
      } else {
        const explicitClaim =
          /\b(?:peanut[- ]free|no peanuts|peanut[- ]free facility|dedicated peanut[- ]free)\b/i.test(combinedText) ||
          (product.certificationsDeclared || []).some(c => /peanut/i.test(c)) ||
          labelsList.some(l => /peanut-free/i.test(l))

        if (explicitClaim) {
          attributeEvidence['peanut_free'] = {
            status: 'NEEDS_REVIEW',
            evidence: 'Unverified manufacturer packaging claim: Package explicitly declares peanut-free, but lacks independently authenticated certification registry proof. Physical packaging inspection required before consumption; zero false reassurance.'
          }
          relevanceReasons.push('NEEDS_REVIEW (Peanut-Free): Package carries manufacturer claim, but lacks independently authenticated certification.')
        } else {
          // Priority 0: Never treat an ingredient list without detected allergens as proof of allergen-free status
          attributeEvidence['peanut_free'] = {
            status: 'NEEDS_REVIEW',
            evidence: 'Insufficient evidence: Ingredient list lacks detected peanuts, but packaging lacks independently authenticated peanut-free certification. An ingredient list without detected allergens cannot be treated as proof of allergen-free status or lack of facility cross-contact.'
          }
          relevanceReasons.push('NEEDS_REVIEW (Peanut-Free): Absence of peanuts in ingredient list alone does not prove allergen-free status without independently authenticated certification.')
        }
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
    const hasDirectAllergenNut = /\b(?:tree nut|almond|cashew|walnut|pecan|hazelnut|pistachio)\b/i.test(allergenLower) && !/\b(?:no|without|zero|free from)\s+(?:tree nut|nut|almond|cashew|walnut|pecan|hazelnut|pistachio)s?\b/i.test(allergenLower)

    const declaredCert = (product.certifiedRecords || []).find(r => /nut[-_ ]free|tree[-_ ]nut[-_ ]free/i.test(r.standard || '') || /nut[-_ ]free|tree[-_ ]nut[-_ ]free/i.test(r.certificationBody || ''))
    if (hasTreeNut || hasDirectAllergenNut) {
      hardExclusion = true
      const certNote = declaredCert ? ` Conflicting certification claimed (${declaredCert.certificationBody}); allergen safety screening strictly overrides certification status.` : ''
      attributeEvidence['nut_free'] = {
        status: 'EXCLUDED',
        evidence: `Contains tree nut ingredients or declared nut allergen.${certNote}`
      }
      relevanceReasons.push(`EXCLUDED (Nut Violation): Contains tree nut ingredients or declared nut allergen.${certNote}`)
    } else if (hasPrecautionaryNut) {
      hardExclusion = true
      const certNote = declaredCert ? ` Conflicting certification claimed (${declaredCert.certificationBody}); precautionary allergen cross-contact strictly overrides certification.` : ''
      attributeEvidence['nut_free'] = {
        status: 'EXCLUDED',
        evidence: `Precautionary cross-contact warning detected on packaging ("may contain tree nuts" or shared facility).${certNote}`
      }
      relevanceReasons.push(`EXCLUDED (Nut Cross-Contact): Packaging declares precautionary cross-contact warning for tree nuts.${certNote}`)
    } else {
      const certResult = findAuthenticatedCertification(product, /nut[- ]free|tree[- ]nut[- ]free/i, explicitOpsMap)

      if (certResult.authenticated && certResult.record) {
        attributeEvidence['nut_free'] = {
          status: 'MATCH',
          evidence: `Verified nut-free certification: Authenticated record from ${certResult.record.certificationBody} (ID: ${certResult.record.certificationId || 'N/A'}, Proof: ${certResult.record.evidenceUrl}). Physical packaging inspection required before consumption; zero false reassurance.`
        }
        relevanceReasons.push(`MATCH (Nut-Free): Authenticated independent nut-free certification verified (${certResult.record.certificationBody}).`)
      } else if (certResult.invalidationReason) {
        attributeEvidence['nut_free'] = {
          status: 'NEEDS_REVIEW',
          evidence: certResult.invalidationReason
        }
        relevanceReasons.push(`NEEDS_REVIEW (Nut-Free): ${certResult.invalidationReason}`)
      } else {
        const explicitClaim =
          /\b(?:nut[- ]free|tree nut[- ]free|no nuts|nut[- ]free facility|dedicated nut[- ]free)\b/i.test(combinedText) ||
          (product.certificationsDeclared || []).some(c => /nut/i.test(c)) ||
          labelsList.some(l => /no-nuts/i.test(l))

        if (explicitClaim) {
          attributeEvidence['nut_free'] = {
            status: 'NEEDS_REVIEW',
            evidence: 'Unverified manufacturer packaging claim: Package explicitly declares tree nut-free, but lacks independently authenticated certification registry proof. Physical packaging inspection required before consumption; zero false reassurance.'
          }
          relevanceReasons.push('NEEDS_REVIEW (Nut-Free): Package carries manufacturer claim, but lacks independently authenticated certification.')
        } else {
          // Priority 0: Never treat an ingredient list without detected allergens as proof of allergen-free status
          attributeEvidence['nut_free'] = {
            status: 'NEEDS_REVIEW',
            evidence: 'Insufficient evidence: Ingredient list lacks detected tree nuts, but packaging lacks independently authenticated certification. An ingredient list without detected allergens cannot be treated as proof of allergen-free status or lack of facility cross-contact.'
          }
          relevanceReasons.push('NEEDS_REVIEW (Nut-Free): Absence of tree nuts in ingredient list alone does not prove allergen-free status without independently authenticated certification.')
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 8. COMPUTE OVERALL RELEVANCE OUTCOME
  // -------------------------------------------------------------------------
  let overallStatus: GoalRelevanceStatus = 'MATCH'

  const hasAttributeExcluded = Object.values(attributeEvidence).some(a => a.status === 'EXCLUDED')
  const hasNeedsReview = Object.values(attributeEvidence).some(a => a.status === 'NEEDS_REVIEW')

  if (hardExclusion || hasAttributeExcluded) {
    overallStatus = 'EXCLUDED'
  } else if (!categoryMatch) {
    overallStatus = 'NEEDS_REVIEW'
  } else if (hasNeedsReview) {
    overallStatus = 'NEEDS_REVIEW'
  } else {
    overallStatus = 'MATCH'
  }

  return {
    status: overallStatus,
    categoryMatch,
    relevanceReasons,
    attributeEvidence
  }
}

/**
 * Asynchronously evaluates product goal relevance against the authoritative persistent database.
 * Executes fresh authoritative Supabase lookups with cache bypass for all claimed certifications,
 * and passes the freshly retrieved trusted records directly to the verification logic.
 * If the authoritative lookup fails, returns no record, or cannot authenticate,
 * the certification strictly fails closed and NEVER relies on stale cached records.
 */
export async function evaluateProductGoalRelevanceAsync(
  product: ProductEvidence,
  goal: DecomposedGoal
): Promise<GoalRelevanceResult> {
  const explicitOpsMap = new Map<string, AuditableVerificationOperation | null>()

  if (product.certifiedRecords && product.certifiedRecords.length > 0) {
    await Promise.all(
      product.certifiedRecords
        .filter((r): r is typeof r & { certificationId: string } => typeof r.certificationId === 'string' && r.certificationId.trim().length > 0)
        .map(async r => {
          const normId = r.certificationId.trim().toUpperCase()
          const op = await serverEvidenceStore.fetchRecordFromDatabase(normId, { bypassCache: true })
          explicitOpsMap.set(normId, op)
        })
    )
  }

  return evaluateProductGoalRelevance(product, goal, explicitOpsMap)
}

