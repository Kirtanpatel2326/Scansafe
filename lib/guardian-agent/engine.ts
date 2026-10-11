import { z } from 'zod'
import { runGuardian } from '../guardian'
import { runGuardianAutonomousAgent } from './orchestrator/engine'
import {
  ProductEvidenceSchema,
  ConstraintEnum
} from './orchestrator/types'

export const AgentRequestSchema = z.object({
  goal: z.string().trim().min(5).max(1000),
  constraints: z.array(ConstraintEnum).min(1).max(15),
  budget: z.number().positive().finite().max(100000).optional(),
  currency: z.enum(['INR', 'AED', 'USD']).default('INR'),
  maxResults: z.number().int().min(1).max(20).default(5),
  products: z.array(ProductEvidenceSchema.extend({
    id: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
    ingredients: z.string().trim().max(10000),
    allergenStatement: z.string().trim().max(3000),
    labelComplete: z.boolean(),
    evidenceSource: z.string().trim().min(4).max(500),
    price: z.number().finite().nonnegative().max(100000).optional()
  })).optional(),
  allowCatalogSearch: z.boolean().default(false),
  allowInternalCatalog: z.boolean().default(true),
  allowPublicOffCatalog: z.boolean().default(false),
  allowPartnerCatalog: z.boolean().default(false),
  approvedActions: z.array(z.enum(['save_shortlist', 'notify_user'])).default([])
})
export type AgentRequest = z.infer<typeof AgentRequestSchema>
export type ProductEvidence = NonNullable<AgentRequest['products']>[number]
export type Step = {
  id: number
  tool: string
  status: 'completed' | 'failed' | 'skipped' | 'pending' | 'running'
  description: string
  at: string
  durationMs: number
}
export type ToolContext = {
  catalogSearch?: (query: string, currency: string) => Promise<ProductEvidence[]>
  saveShortlist?: (ids: string[], runId: string) => Promise<void>
}

/**
 * Execute Guardian Agent with backward compatibility for existing tests while
 * upgrading to the state machine orchestrator for Phase 2.
 */
export async function executeGuardianAgent(request: AgentRequest, tools: ToolContext = {}) {
  if (!request || typeof request !== 'object') {
    throw new Error('Invalid agent request: payload must be an object.')
  }
  let validRequest: AgentRequest = request
  if (typeof AgentRequestSchema?.safeParse === 'function') {
    const parsed = AgentRequestSchema.safeParse(request)
    if (parsed && typeof parsed.success === 'boolean') {
      if (!parsed.success) {
        const issue = parsed.error?.issues?.[0]
        const msg = issue ? `${issue.path.join('.')}: ${issue.message}` : 'schema validation failed'
        throw new Error(`Invalid agent request: ${msg}`)
      }
      if (parsed.data && typeof parsed.data.goal === 'string') {
        validRequest = parsed.data
      }
    }
  }

  // If request specifies partner catalog or allowCatalogSearch, map to orchestrator
  const isAutonomousRequest = validRequest.allowInternalCatalog !== undefined ||
    validRequest.allowPublicOffCatalog !== undefined ||
    validRequest.allowPartnerCatalog !== undefined ||
    validRequest.allowCatalogSearch

  if (isAutonomousRequest) {
    const orchestratorReq = {
      goal: validRequest.goal,
      constraints: validRequest.constraints,
      budget: validRequest.budget,
      currency: validRequest.currency,
      maxResults: validRequest.maxResults,
      allowInternalCatalog: validRequest.allowInternalCatalog ?? (validRequest.allowCatalogSearch ? false : true),
      allowPublicOffCatalog: validRequest.allowPublicOffCatalog ?? false,
      allowPartnerCatalog: validRequest.allowPartnerCatalog ?? validRequest.allowCatalogSearch ?? false,
      products: validRequest.products,
      approvedActions: validRequest.approvedActions
    }

    const res = await runGuardianAutonomousAgent(orchestratorReq, {
      externalCatalogSearch: tools.catalogSearch,
      saveShortlist: tools.saveShortlist ? async (ids, runId) => tools.saveShortlist!(ids, runId) : undefined
    })

    return {
      runId: res.runId,
      createdAt: res.createdAt,
      elapsedMs: res.elapsedMs,
      mode: 'BOUNDED_AUTONOMOUS_WORKFLOW',
      sourceMode: res.sourceMode,
      plan: res.plan,
      products: res.products,
      shortlist: res.shortlist,
      steps: res.steps.map(s => ({
        id: s.id,
        tool: s.tool,
        status: s.status as Step['status'],
        description: s.description,
        at: s.at,
        durationMs: s.durationMs
      })),
      saved: res.saved,
      retrievalError: res.retrievalErrors[0] || null,
      retrievalErrors: res.retrievalErrors,
      uncertainties: res.uncertainties,
      safety: res.safetyNotice,
      limitations: res.limitations
    }
  }

  // Fallback direct execution for legacy minimal prototype tests
  const started = Date.now()
  const runId = crypto.randomUUID()
  const steps: Step[] = []
  let currentStep = 0
  const trace = (tool: string, status: Step['status'], description: string, start: number) =>
    steps.push({
      id: ++currentStep,
      tool,
      status,
      description,
      at: new Date().toISOString(),
      durationMs: Date.now() - start
    })
  let t = Date.now()
  const plan = [
    'Establish the user goal and explicit dietary/budget constraints',
    'Retrieve eligible candidate product evidence from authorized sources',
    'Apply deterministic ingredient, allergen and budget checks',
    'Rank qualifying comparison candidates and report uncertainty',
    'Persist the shortlist only when the user has explicitly approved that action'
  ]
  trace('plan', 'completed', `Created a bounded ${plan.length}-stage workflow.`, t)
  let evidence: ProductEvidence[] = [...(request.products ?? [])]
  let sourceMode = 'USER_SUPPLIED_EVIDENCE'
  let retrievalError: string | null = null

  if (request.allowCatalogSearch) {
    if (!tools.catalogSearch) {
      t = Date.now()
      trace('catalog_search', 'skipped', 'No authenticated catalogue connector is configured; never inventing products.', t)
    } else {
      let success = false
      for (let attempt = 1; attempt <= 2 && !success; attempt++) {
        t = Date.now()
        try {
          const fetched = await tools.catalogSearch(request.goal, request.currency)
          evidence.push(...fetched.slice(0, 20))
          sourceMode = evidence.length && request.products?.length ? 'MIXED_EVIDENCE' : 'CATALOG_EVIDENCE'
          success = true
          trace('catalog_search', 'completed', `Catalogue returned ${Math.min(fetched.length, 20)} product record(s); attempt ${attempt}.`, t)
        } catch (e: any) {
          retrievalError = e instanceof Error ? e.message : 'Catalogue connection failed'
          trace('catalog_search', 'failed', `Attempt ${attempt} failed; ${attempt === 1 ? 'retrying once' : 'no results fabricated'}.`, t)
        }
      }
    }
  }

  const unique = new Map<string, ProductEvidence>()
  let duplicates = 0
  for (const item of evidence) {
    if (unique.has(item.id)) {
      duplicates++
      continue
    }
    unique.set(item.id, item)
  }
  evidence = [...unique.values()].slice(0, 20)
  t = Date.now()
  trace('normalize_evidence', 'completed', `Prepared ${evidence.length} records; ignored ${duplicates} duplicated identifier(s).`, t)

  let evaluation: ReturnType<typeof runGuardian> | null = null
  if (evidence.length) {
    t = Date.now()
    evaluation = runGuardian({
      goal: request.goal,
      constraints: request.constraints as any,
      budget: request.budget,
      currency: request.currency,
      products: evidence as any
    })
    trace('rule_based_verification', 'completed', `Evaluated ${evaluation.products.length} records; missing evidence stays unresolved.`, t)
  } else {
    t = Date.now()
    trace('rule_based_verification', 'skipped', 'No product evidence is available. Recommendations are impossible without evidence.', t)
  }

  const shortlist = (evaluation?.shortlist ?? []).slice(0, request.maxResults)
  t = Date.now()
  trace('rank_shortlist', 'completed', `Ranked ${shortlist.length} unverified comparison candidate(s).`, t)

  let saved = false
  if (request.approvedActions.includes('save_shortlist')) {
    t = Date.now()
    if (!tools.saveShortlist) {
      trace('save_shortlist', 'skipped', 'Persistent storage unavailable or user not authenticated.', t)
    } else {
      try {
        await tools.saveShortlist(shortlist, runId)
        saved = true
        trace('save_shortlist', 'completed', 'Saved shortlist with explicit user approval.', t)
      } catch {
        trace('save_shortlist', 'failed', 'Database write failed; shortlist was not saved.', t)
      }
    }
  }

  return {
    runId,
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    mode: 'BOUNDED_AUTONOMOUS_WORKFLOW',
    sourceMode,
    plan,
    products: evaluation?.products ?? [],
    shortlist,
    steps,
    saved,
    retrievalError,
    safety: 'A candidate is NOT an allergen-free or medically safe certification; confirm current label and manufacturer information before consuming.',
    limitations: [
      'This version executes a bounded deterministic agent plan with tool selection and retry, not open-ended LLM planning.',
      'External catalog search works only when an approved connector is configured. Data returned by third parties is not automatically verified as manufacturer-authentic.',
      'The agent does not buy food, certify allergen safety or perform unauthorized external actions.'
    ]
  }
}
