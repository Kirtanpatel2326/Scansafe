import {
  AutonomousAgentInput,
  AutonomousAgentRequestSchema,
  AutonomousAgentResponse,
  AgentStep,
  ProductEvidence,
  EvaluatedProduct
} from './types'
import { evaluateDeterministicSafety } from './verifier'
import { searchInternalReviewedCatalog, searchPublicOpenFoodFacts } from './tools'
import { searchApprovedCatalog } from '../catalog'

export interface AgentContext {
  userId?: string
  db?: any
  externalCatalogSearch?: (query: string, currency: string) => Promise<ProductEvidence[]>
  saveShortlist?: (ids: string[], runId: string, goal: string) => Promise<void>
}

/**
 * Controlled State Machine Orchestrator for Guardian Agent Phase 2.
 * Enforces structured planning, real multi-source tools, retry recovery,
 * deterministic safety verifications, and affirmative user consent.
 */
export async function runGuardianAutonomousAgent(
  rawRequest: AutonomousAgentInput,
  context: AgentContext = {}
): Promise<AutonomousAgentResponse> {
  let request: any = rawRequest
  try {
    const parsed = AutonomousAgentRequestSchema.safeParse(rawRequest)
    if (parsed && parsed.success && parsed.data && typeof parsed.data.goal === 'string') {
      request = parsed.data
    }
  } catch {
    // offline stub runner fallback
  }
  const normalizedConstraints = Array.isArray(request.constraints) ? request.constraints : []
  const started = Date.now()
  const runId = crypto.randomUUID()
  const steps: AgentStep[] = []
  let stepCounter = 0
  const retrievalErrors: string[] = []
  const uncertainties: string[] = []

  const logStep = (
    stage: AgentStep['stage'],
    tool: string,
    status: AgentStep['status'],
    description: string,
    startMs: number,
    error?: string | null
  ) => {
    steps.push({
      id: ++stepCounter,
      stage,
      tool,
      status,
      description,
      at: new Date().toISOString(),
      durationMs: Date.now() - startMs,
      error: error || null
    })
  }

  // Stage 1: Parse Objective and Formulate Controlled Plan
  let t = Date.now()
  const plan = [
    'Analyze objective constraints: restrict products for ' + normalizedConstraints.join(', '),
    'Assemble multi-source evidence: inspect user-uploaded labels, internal verified database, and permitted catalogs',
    'Execute deterministic toxicology & allergen verification (fail-closed, zero false reassurance)',
    'Synthesize candidate rankings, assess uncertainty metrics, and flag missing facts',
    'Verify affirmative action approval before persisting shortlist to user vault'
  ]
  logStep(
    'parse_objective',
    'plan_orchestrator',
    'completed',
    `Formulated 5-stage bounded autonomous execution plan for goal: "${request.goal}".`,
    t
  )

  // Stage 2 & 3: Evidence Gathering via Real Research Tools
  t = Date.now()
  const gatheredEvidence: ProductEvidence[] = [...(request.products || [])]

  if (request.products && request.products.length > 0) {
    logStep(
      'check_evidence_sources',
      'user_evidence_loader',
      'completed',
      `Loaded ${request.products.length} user-supplied package label record(s).`,
      t
    )
  }

  // Tool 1: Internal Reviewed Catalog
  if (request.allowInternalCatalog) {
    t = Date.now()
    try {
      const internalMatches = await searchInternalReviewedCatalog(request.goal, request.currency)
      if (internalMatches.length > 0) {
        gatheredEvidence.push(...internalMatches)
        logStep(
          'retrieve_candidate_evidence',
          'internal_reviewed_catalog',
          'completed',
          `Retrieved ${internalMatches.length} verified record(s) from ScanSafe database.`,
          t
        )
      } else {
        logStep(
          'retrieve_candidate_evidence',
          'internal_reviewed_catalog',
          'completed',
          'Internal database searched; no matching products found for query.',
          t
        )
      }
    } catch (err: any) {
      retrievalErrors.push(`Internal catalog query error: ${err.message}`)
      logStep(
        'retrieve_candidate_evidence',
        'internal_reviewed_catalog',
        'failed',
        `Internal database query failed: ${err.message}`,
        t,
        err.message
      )
    }
  }

  // Tool 2: Approved External Partner Catalog (with bounded 1-retry backoff)
  if (request.allowPartnerCatalog) {
    const catalogSearchFn = context.externalCatalogSearch || (process.env.GUARDIAN_CATALOG_API_URL ? searchApprovedCatalog : undefined)
    if (!catalogSearchFn) {
      t = Date.now()
      logStep(
        'retrieve_candidate_evidence',
        'catalog_search',
        'skipped',
        'Partner catalog requested but GUARDIAN_CATALOG_API_URL is not configured; no simulated products fabricated.',
        t
      )
    } else {
      let partnerSuccess = false
      for (let attempt = 1; attempt <= 2 && !partnerSuccess; attempt++) {
        t = Date.now()
        try {
          const partnerItems = await catalogSearchFn(request.goal, request.currency)
          gatheredEvidence.push(...partnerItems.slice(0, 10))
          partnerSuccess = true
          logStep(
            'retrieve_candidate_evidence',
            'catalog_search',
            'completed',
            `Partner catalog returned ${partnerItems.length} candidate record(s) on attempt ${attempt}.`,
            t
          )
        } catch (err: any) {
          if (attempt === 1) {
            logStep(
              'retrieve_candidate_evidence',
              'catalog_search',
              'failed',
              `Attempt 1 failed (${err.message}); initiating automatic retry with backoff.`,
              t,
              err.message
            )
            await new Promise(r => setTimeout(r, 200))
          } else {
            retrievalErrors.push(`Partner catalog connector failed: ${err.message}`)
            logStep(
              'retrieve_candidate_evidence',
              'catalog_search',
              'failed',
              `Attempt 2 failed; halted connector. Zero fake records created.`,
              t,
              err.message
            )
          }
        }
      }
    }
  }

  // Tool 3: Public Open Food Facts (Optional crowdsourced public fallback)
  if (request.allowPublicOffCatalog) {
    t = Date.now()
    try {
      const offItems = await searchPublicOpenFoodFacts(request.goal, request.currency)
      if (offItems.length > 0) {
        gatheredEvidence.push(...offItems)
        logStep(
          'retrieve_candidate_evidence',
          'open_food_facts_public',
          'completed',
          `Retrieved ${offItems.length} public record(s) from Open Food Facts API (unverified crowdsourced data).`,
          t
        )
      }
    } catch (err: any) {
      retrievalErrors.push(`Public catalog query error: ${err.message}`)
      logStep(
        'retrieve_candidate_evidence',
        'open_food_facts_public',
        'failed',
        `Public catalog lookup failed: ${err.message}`,
        t,
        err.message
      )
    }
  }

  // Deduplicate records by unique identifier
  const uniqueItems = new Map<string, ProductEvidence>()
  let duplicatesCount = 0
  for (const item of gatheredEvidence) {
    if (uniqueItems.has(item.id)) {
      duplicatesCount++
      continue
    }
    uniqueItems.set(item.id, item)
  }
  const normalizedEvidence = [...uniqueItems.values()].slice(0, 20)

  t = Date.now()
  logStep(
    'retrieve_candidate_evidence',
    'evidence_normalizer',
    'completed',
    `Normalized ${normalizedEvidence.length} total product evidence candidate(s); filtered ${duplicatesCount} duplicate identifier(s).`,
    t
  )

  // Stage 4: Deterministic Cross-Verification Engine
  t = Date.now()
  const evaluatedProducts: EvaluatedProduct[] = []
  if (normalizedEvidence.length === 0) {
    logStep(
      'cross_verify_dietary_rules',
      'deterministic_verifier',
      'skipped',
      'No product evidence available from any configured source. Halting rule evaluation.',
      t
    )
    uncertainties.push('No product evidence could be verified. Provide label photographs or configure a catalog connector.')
  } else {
    for (const item of normalizedEvidence) {
      const evaluated = evaluateDeterministicSafety(item, normalizedConstraints, request.budget)
      evaluatedProducts.push(evaluated)
      if (evaluated.uncertaintyScore > 0.4) {
        uncertainties.push(`Uncertainty on "${item.name}": incomplete declarations or ambiguous cross-contact wording.`)
      }
    }
    logStep(
      'cross_verify_dietary_rules',
      'deterministic_verifier',
      'completed',
      `Evaluated ${evaluatedProducts.length} record(s): ${evaluatedProducts.filter(p => p.status === 'candidate').length} candidate(s), ${evaluatedProducts.filter(p => p.status === 'excluded').length} excluded, ${evaluatedProducts.filter(p => p.status === 'needs_review').length} requiring review.`,
      t
    )
  }

  // Stage 5: Ranking and Uncertainty Assessment
  t = Date.now()
  const candidates = evaluatedProducts.filter(p => p.status === 'candidate')
  candidates.sort((a, b) => {
    // Sort by price if available, else by lower uncertainty
    if (a.price !== null && b.price !== null) return a.price - b.price
    if (a.price !== null) return -1
    if (b.price !== null) return 1
    return a.uncertaintyScore - b.uncertaintyScore
  })
  const shortlist = candidates.slice(0, request.maxResults).map(c => c.id)

  logStep(
    'rank_and_evaluate_uncertainty',
    'ranker_and_uncertainty_evaluator',
    'completed',
    `Ranked ${shortlist.length} candidate shortlist from ${candidates.length} qualifying item(s).`,
    t
  )

  // Stage 6: Persistence with Affirmative Consent Gate
  let saved = false
  t = Date.now()
  const approvedActions = request.approvedActions || []
  if (approvedActions.includes('save_shortlist')) {
    if (context.saveShortlist) {
      try {
        await context.saveShortlist(shortlist, runId, request.goal)
        saved = true
        logStep(
          'persist_shortlist_approval',
          'user_vault_storage',
          'completed',
          'Successfully persisted task and approved shortlist to user vault.',
          t
        )
      } catch (err: any) {
        logStep(
          'persist_shortlist_approval',
          'user_vault_storage',
          'failed',
          `Vault write failed: ${err.message}. Shortlist was not saved.`,
          t,
          err.message
        )
      }
    } else {
      logStep(
        'persist_shortlist_approval',
        'user_vault_storage',
        'skipped',
        'Save requested, but storage connector is unavailable or user is unauthenticated.',
        t
      )
    }
  } else {
    logStep(
      'persist_shortlist_approval',
      'user_vault_storage',
      'skipped',
      'Shortlist save skipped: user did not provide affirmative approval.',
      t
    )
  }

  // Determine Source Mode
  let sourceMode: AutonomousAgentResponse['sourceMode'] = 'NO_EVIDENCE_AVAILABLE'
  const hasUserSource = normalizedEvidence.some(e => e.sourceType === 'USER_UPLOADED_LABEL')
  const hasCatalogSource = normalizedEvidence.some(e => e.sourceType !== 'USER_UPLOADED_LABEL')
  if (hasUserSource && hasCatalogSource) sourceMode = 'MULTI_SOURCE_EVIDENCE'
  else if (hasUserSource) sourceMode = 'USER_SUPPLIED_EVIDENCE_ONLY'
  else if (hasCatalogSource) sourceMode = 'CATALOG_EVIDENCE_ONLY'

  return {
    runId,
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    mode: 'AUTONOMOUS_LANGGRAPH_STATE_MACHINE',
    goal: request.goal,
    sourceMode,
    plan,
    currentStage: 'persist_shortlist_approval',
    steps,
    products: evaluatedProducts,
    shortlist,
    saved,
    retrievalErrors,
    uncertainties,
    safetyNotice: 'A candidate rating represents an uncertified comparative status based strictly on retrieved text. It does NOT constitute medical or allergy safety certification. Always verify manufacturer labels directly before consuming.',
    limitations: [
      'Autonomous agent operates within bounded LangGraph-inspired deterministic states; arbitrary execution of unverified web URLs is strictly prohibited.',
      'Third-party and crowdsourced public databases may contain unverified or outdated ingredient formulations.',
      'A missing allergen declaration does NOT prove the absence of an allergen or cross-contact risk.'
    ],
    engineVersion: '2.0.0'
  }
}
