import { Constraint, ProductEvidence, EvaluatedProduct } from './types'

export const COMPREHENSIVE_ALLERGEN_ALIASES: Record<Constraint, string[]> = {
  peanut: ['peanut', 'peanuts', 'groundnut', 'groundnuts', 'arachis', 'monkey nut', 'goober'],
  tree_nut: [
    'tree nut', 'tree nuts', 'tree-nut', 'tree-nuts',
    'almond', 'almonds', 'cashew', 'cashews', 'walnut', 'walnuts',
    'hazelnut', 'hazelnuts', 'pistachio', 'pistachios', 'pecan', 'pecans',
    'macadamia', 'macadamias', 'brazil nut', 'brazil nuts', 'pine nut', 'pine nuts',
    'chestnut', 'chestnuts', 'praline', 'marzipan'
  ],
  milk: [
    'milk', 'casein', 'caseinate', 'whey', 'butter', 'ghee', 'paneer',
    'cheese', 'yogurt', 'curd', 'cream', 'lactose', 'lactalbumin',
    'buttermilk', 'skim milk', 'milk solids', 'milk powder', 'dairy'
  ],
  egg: ['egg', 'eggs', 'albumin', 'ovalbumin', 'mayonnaise', 'meringue', 'lysozyme', 'egg white', 'egg yolk'],
  soy: ['soy', 'soya', 'soybean', 'soybeans', 'tofu', 'tempeh', 'edamame', 'soy lecithin', 'soya lecithin', 'textured vegetable protein', 'tvp'],
  wheat: ['wheat', 'maida', 'semolina', 'durum', 'atta', 'spelt', 'farina', 'couscous', 'bulgur', 'graham', 'emmer', 'einkorn'],
  gluten: ['gluten', 'wheat', 'barley', 'rye', 'malt', 'triticale', 'spelt', 'brewer\'s yeast'],
  sesame: ['sesame', 'sesames', 'sesame seed', 'sesame seeds', 'tahini', 'til seeds', 'gingelly', 'sesamum'],
  crustacean: ['crustacean', 'crustaceans', 'shellfish', 'shrimp', 'prawn', 'prawns', 'crab', 'lobster', 'crayfish', 'krill'],
  fish: ['fish', 'fishes', 'salmon', 'tuna', 'cod', 'anchovy', 'anchovies', 'tilapia', 'halibut', 'trout', 'surimi'],
  mustard: ['mustard', 'mustard seed', 'mustard powder', 'mustard oil', 'dijon'],
  celery: ['celery', 'celeriac', 'celery seed', 'celery salt'],
  lupin: ['lupin', 'lupine', 'lupin flour', 'lupin bean'],
  mollusc: ['mollusc', 'molluscs', 'mollusk', 'mollusks', 'clam', 'mussel', 'oyster', 'squid', 'octopus', 'scallop', 'snail', 'calamari'],
  sulphite: [
    'sulphite', 'sulphites', 'sulfite', 'sulfites', 'sulfur dioxide', 'sulphur dioxide',
    'sodium bisulphite', 'sodium bisulfite', 'potassium metabisulphite', 'potassium metabisulfite',
    'sodium metabisulphite', 'sodium metabisulfite',
    'e220', 'e221', 'e222', 'e223', 'e224', 'e225', 'e226', 'e227', 'e228'
  ]
}

function termIn(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text)
}

function matchesActiveIngredient(text: string, term: string): boolean {
  if (!termIn(text, term)) return false
  const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'ig')
  for (const match of text.matchAll(re)) {
    const preceding = text.slice(Math.max(0, (match.index ?? 0) - 30), match.index).toLowerCase()
    // Check if directly preceded by negative assertion
    const isNegated = /(?:free from|no|without|does not contain|contains no|0%|zero)\s*$/.test(preceding)
    // Check if hyphenated -free suffix
    const isFreeSuffix = /-free\b/i.test(text.slice(match.index ?? 0, (match.index ?? 0) + match[0].length + 10))
    if (!isNegated && !isFreeSuffix) return true
  }
  return false
}

export function evaluateDeterministicSafety(
  product: ProductEvidence,
  constraints: Constraint[],
  budget?: number
): EvaluatedProduct {
  const ingredients = product.ingredients || ''
  const allergenStatement = product.allergenStatement || ''
  const combined = `${ingredients} ${allergenStatement}`.toLowerCase()

  // 1. Direct active allergen hits
  const allergenHits: string[] = []
  for (const constraint of constraints) {
    const aliases = COMPREHENSIVE_ALLERGEN_ALIASES[constraint] || [constraint]
    for (const alias of aliases) {
      if (matchesActiveIngredient(ingredients, alias) || matchesActiveIngredient(allergenStatement, alias)) {
        allergenHits.push(`${constraint}: ${alias}`)
      }
    }
  }

  // 2. Precautionary cross-contact screening
  const precautionarySegments = allergenStatement.split(/[.;\n]/).filter(segment =>
    /(?:may contain|traces of|shared (?:equipment|facility|line)|(?:manufactured|processed|made|produced|packaged|handled) (?:on|in)|cross.contact)/i.test(segment)
  )
  let precautionaryNotice = false
  for (const seg of precautionarySegments) {
    // Check if relevant allergen is mentioned in the cross-contact warning
    const mentionedTypes = (Object.keys(COMPREHENSIVE_ALLERGEN_ALIASES) as Constraint[]).filter(c =>
      COMPREHENSIVE_ALLERGEN_ALIASES[c].some(alias => termIn(seg, alias))
    )
    if (!mentionedTypes.length) {
      // Unspecified cross-contact ("made in facility with allergens") -> fail-closed review
      precautionaryNotice = true
      break
    }
    if (mentionedTypes.some(t => constraints.includes(t))) {
      precautionaryNotice = true
      break
    }
  }

  // 3. Contradictory / Negative claim analysis
  let conflictingClaims = false
  for (const constraint of constraints) {
    const aliases = COMPREHENSIVE_ALLERGEN_ALIASES[constraint] || [constraint]
    const hasFreeFromClaim = aliases.some(alias => {
      const safeTerm = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`(?:free from|does not contain|contains no|without|no)\\s+${safeTerm}(?:s)?\\b|\\b${safeTerm}[- ]free\\b`, 'i').test(combined)
    })
    const hasDirectIngredient = aliases.some(alias => matchesActiveIngredient(ingredients, alias))
    if (hasFreeFromClaim && hasDirectIngredient) {
      // High risk contradiction: packaging claims "free from X" yet lists X in ingredients
      conflictingClaims = true
    } else if (hasFreeFromClaim && !hasDirectIngredient) {
      // Free-from claim needs independent verification
      conflictingClaims = true
    }
  }

  const reasons: string[] = []
  if (allergenHits.length > 0) {
    reasons.push(`Excluded: Detected explicit restricted allergens: ${[...new Set(allergenHits)].join(', ')}.`)
  }
  if (precautionaryNotice) {
    reasons.push('Needs Review: Precautionary cross-contact warning detected for restricted dietary criteria.')
  }
  if (conflictingClaims) {
    reasons.push('Needs Review: Unverified or contradictory "free-from" marketing claim detected. Negative claims do not prove safety.')
  }
  if (!product.labelComplete || !ingredients.trim() || !allergenStatement.trim()) {
    reasons.push('Needs Review: Packaging label or allergen declaration is incomplete or partially unreadable.')
  }
  if (budget !== undefined && product.price === undefined) {
    reasons.push('Needs Review: Product price is unavailable; budget constraint cannot be verified.')
  }
  if (budget !== undefined && product.price !== undefined && product.price > budget) {
    reasons.push(`Excluded: Price (${product.price} ${product.currency}) exceeds user budget constraint (${budget} ${product.currency}).`)
  }

  // Compute status
  let status: 'candidate' | 'excluded' | 'needs_review'
  let uncertaintyScore = 0

  if (allergenHits.length > 0) {
    status = 'excluded'
    uncertaintyScore = 0.05
  } else if (budget !== undefined && product.price !== undefined && product.price > budget) {
    status = 'excluded'
    uncertaintyScore = 0.05
  } else if (
    precautionaryNotice ||
    conflictingClaims ||
    !product.labelComplete ||
    !ingredients.trim() ||
    !allergenStatement.trim() ||
    (budget !== undefined && product.price === undefined)
  ) {
    status = 'needs_review'
    uncertaintyScore = !product.labelComplete ? 0.8 : precautionaryNotice ? 0.6 : 0.4
  } else {
    status = 'candidate'
    uncertaintyScore = 0.15
    reasons.push('Unverified Comparison Candidate: No restricted allergen tokens detected in supplied label text. Does not constitute medical allergy certification.')
  }

  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    price: product.price ?? null,
    currency: product.currency,
    evidenceSource: product.evidenceSource,
    sourceType: product.sourceType,
    status,
    reasons,
    allergenHits: [...new Set(allergenHits)],
    precautionaryNotice,
    conflictingClaims,
    uncertaintyScore
  }
}
