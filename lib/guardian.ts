import { z } from 'zod'

export const GUARDIAN_ENGINE_VERSION = '1.1.0'
const constraintValues = ['peanut', 'tree_nut', 'milk', 'egg', 'soy', 'wheat', 'sesame'] as const
export const GuardianRequestSchema = z.object({
  goal: z.string().trim().min(8).max(500),
  constraints: z.array(z.enum(constraintValues)).min(1).max(7),
  budget: z.number().finite().positive().max(100000).optional(),
  currency: z.enum(['INR', 'AED', 'USD']).default('INR'),
  products: z.array(z.object({
    id: z.string().trim().min(1).max(50), name: z.string().trim().min(1).max(120),
    ingredients: z.string().trim().max(5000),
    allergenStatement: z.string().trim().max(1500),
    labelComplete: z.boolean(),
    evidenceSource: z.string().trim().min(4).max(500),
    price: z.number().finite().nonnegative().max(100000).optional(),
  })).min(1).max(20),
})
export type GuardianRequest = z.infer<typeof GuardianRequestSchema>

// Conservative ingredient phrase matching. This is a prototype rule set, not an allergen certification.
const aliases: Record<(typeof constraintValues)[number], string[]> = {
  peanut: ['peanut', 'peanuts', 'groundnut', 'groundnuts', 'arachis'],
  tree_nut: ['almond', 'almonds', 'cashew', 'cashews', 'walnut', 'walnuts', 'hazelnut', 'hazelnuts', 'pistachio', 'pistachios', 'pecan', 'pecans', 'macadamia', 'brazil nut', 'pine nut', 'chestnut'],
  milk: ['milk', 'casein', 'caseinate', 'whey', 'butter', 'ghee', 'paneer', 'cheese', 'yogurt', 'curd', 'cream', 'lactose'],
  egg: ['egg', 'eggs', 'albumin', 'ovalbumin', 'mayonnaise'],
  soy: ['soy', 'soya', 'soybean', 'soybeans', 'tofu', 'tempeh', 'edamame'],
  wheat: ['wheat', 'maida', 'semolina', 'durum', 'atta', 'spelt', 'farina'],
  sesame: ['sesame', 'tahini', 'til seeds'],
}
function termIn(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(text)
}
// Avoid treating text like "contains no peanut" as positive evidence of an ingredient.
// A negative claim NEVER establishes the absence of allergens; we conservatively classify ambiguous entries unknown.
function matches(text: string, term: string): boolean {
  if (!termIn(text, term)) return false
  const re = new RegExp(`(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'ig')
  for (const match of text.matchAll(re)) {
    const preceding = text.slice(Math.max(0, (match.index ?? 0) - 25), match.index).toLowerCase()
    if (!/(?:free from|no|without|does not contain|contains no)\s*$/.test(preceding) && !/-free\b/.test(text.slice(match.index ?? 0, (match.index ?? 0) + match[0].length + 8).toLowerCase())) return true
  }
  return false
}
export function runGuardian(input: GuardianRequest) {
  const steps: Array<{ tool: string; status: 'completed'; detail: string }> = [
    { tool: 'plan_goal', status: 'completed', detail: `Evaluate ${input.products.length} user-provided products against ${input.constraints.length} dietary restriction(s).` },
    { tool: 'inspect_evidence', status: 'completed', detail: 'Require traceable source references and complete ingredient plus allergen declarations for positive shortlist consideration.' },
  ]
  const products = input.products.map(product => {
    const hits = input.constraints.flatMap(constraint => aliases[constraint].filter(t => matches(product.ingredients, t) || matches(product.allergenStatement, t)).map(t => `${constraint}: ${t}`))
    // Check precautionary wording against the user's restrictions, not unrelated allergens.
    // Unspecified cross-contact language remains unresolved until verified.
    const statement = product.allergenStatement
    const precautionarySegments = statement.split(/[.;\n]/).filter(segment =>
      /may contain|traces of|shared (equipment|facility)|processed in (a|the) facility|made on (shared|equipment)|cross.contact/i.test(segment))
    const precautionary = precautionarySegments.some(segment => {
      const allergenMentioned = Object.entries(aliases).filter(([, words]) => words.some(w => termIn(segment, w))).map(([type]) => type)
      if (!allergenMentioned.length) return true // Unknown source of cross-contact; never infer safety.
      return allergenMentioned.some(type => input.constraints.includes(type as (typeof constraintValues)[number]))
    })
    const combinedText = product.ingredients + ' ' + product.allergenStatement
    const negativeClaims = input.constraints.some(constraint => aliases[constraint].some(term => {
      const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`(?:free from|does not contain|contains no|without|no)\\s+${safeTerm}(?:s)?\\b|\\b${safeTerm}[- ]free\\b`, 'i').test(combinedText)
    }))
    const reason: string[] = []
    if (hits.length) reason.push(`Detected relevant terms: ${[...new Set(hits)].join(', ')}`)
    if (precautionary) reason.push('Relevant or unspecified precautionary cross-contact statement present; manual review required.')
    if (negativeClaims) reason.push('Negative/free-from wording requires independent label verification; not treated as proof of safety.')
    if (!product.labelComplete || !product.ingredients || !product.allergenStatement) reason.push('Missing or incomplete label/allergen information.')
    if (input.budget !== undefined && product.price === undefined) reason.push('Price missing, so budget cannot be verified.')
    if (input.budget !== undefined && product.price !== undefined && product.price > input.budget) reason.push('Over stated budget.')
    const status: 'excluded' | 'needs_review' | 'candidate' = hits.length ? 'excluded' : precautionary || !product.labelComplete || !product.ingredients || !product.allergenStatement || negativeClaims || (input.budget !== undefined && product.price === undefined) ? 'needs_review' : input.budget !== undefined && product.price !== undefined && product.price > input.budget ? 'excluded' : 'candidate'
    if (status === 'candidate') reason.push('No matching terms in supplied text. This is an unverified comparison candidate, NOT a safety or allergen-free conclusion.')
    steps.push({ tool: 'evaluate_product', status: 'completed', detail: `${product.name}: ${status} using only supplied source ${product.evidenceSource}.` })
    return { id: product.id, name: product.name, price: product.price ?? null, evidenceSource: product.evidenceSource, status, reasons: reason }
  })
  const ranked = products.filter(x => x.status === 'candidate').sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
  steps.push({ tool: 'rank_candidates', status: 'completed', detail: `Ranked ${ranked.length} candidates by provided price; ${products.filter(p => p.status === 'needs_review').length} need manual review.` })
  return {
    runId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    mode: 'USER_SUPPLIED_EVIDENCE_ONLY',
    engineVersion: GUARDIAN_ENGINE_VERSION,
    goal: input.goal,
    products,
    shortlist: ranked.map(x => x.id),
    steps,
    limitations: [
      'Prototype: no external product search, retailer connection, manufacturer verification, purchase or persistent task execution.',
      'All results derive only from information supplied by the user; source references are not independently verified.',
      'No product is certified allergen-free or medically safe. Packaging and manufacturer information must be verified before purchase.',
    ],
  }
}
