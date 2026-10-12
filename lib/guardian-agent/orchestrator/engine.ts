import {
  AutonomousAgentInput,
  AutonomousAgentResponse,
  AgentStep,
  ProductEvidence,
  EvaluatedProduct
} from './types'
import { evaluateDeterministicSafety, detectEvidenceConflicts } from './verifier'
import { decomposeUserGoal, evaluateProductGoalRelevance } from './goal-verifier'
import { searchInternalReviewedCatalog, searchPublicOpenFoodFacts } from './tools'
import { searchApprovedCatalog } from '../catalog'
import { createAutonomousExecutionPlan, dynamicReplanAfterToolExecution } from './planner'

export interface AgentContext {
  userId?: string
  db?: any
  externalCatalogSearch?: (query: string, currency: string, signal?: AbortSignal) => Promise<ProductEvidence[]>
  saveShortlist?: (ids: string[], runId: string, goal: string) => Promise<void>
  signal?: AbortSignal
}

const EXECUTION_TIMEOUT_MS = 25000 // 25s safe hard-stop budget

/**
 * Controlled State Machine Orchestrator for Guardian Agent Phase 2.
 * 
 * Features:
 * - Real bounded LLM planning with structured tool selection & dynamic replanning.
 * - Deterministic dietary safety verification strictly independent of LLM judgment.
 * - Transparent execution mode: 'LLM_STRUCTURED_AUTONOMOUS_PLANNER' or 'BOUNDED_STATE_MACHINE_PLANNER'.
 * - Strict input validation; rejects malformed payloads fail-closed.
 * - Timeout budget, retry budgets, and affirmative approval gates.
 */
export async function runGuardianAutonomousAgent(
  rawRequest: AutonomousAgentInput,
  context: AgentContext = {}
): Promise<AutonomousAgentResponse> {
  const started = Date.now()

  // 1. Strict Input Validation (Fail-closed for both HTTP and direct callers)
  if (!rawRequest || typeof rawRequest !== 'object') {
    throw new Error('Invalid agent request: payload must be a non-null object.')
  }
  if (!rawRequest.goal || typeof rawRequest.goal !== 'string' || rawRequest.goal.trim().length < 5) {
    throw new Error('Invalid agent request: goal must be a valid string of at least 5 characters.')
  }
  if (rawRequest.goal.length > 1000) {
    throw new Error('Invalid agent request: goal exceeds 1000 characters limit.')
  }
  if (!Array.isArray(rawRequest.constraints) || rawRequest.constraints.length === 0) {
    throw new Error('Invalid agent request: at least one active dietary constraint is required.')
  }
  if (rawRequest.constraints.length > 15) {
    throw new Error('Invalid agent request: exceeds 15 dietary constraints limit.')
  }
  const VALID_CONSTRAINTS = [
    'peanut', 'tree_nut', 'milk', 'egg', 'soy', 'wheat', 'sesame',
    'gluten', 'crustacean', 'fish', 'mustard', 'celery', 'lupin', 'mollusc', 'sulphite'
  ]
  for (const c of rawRequest.constraints) {
    if (!VALID_CONSTRAINTS.includes(c)) {
      throw new Error(`Invalid agent request: unknown or unsupported dietary constraint '${c}'.`)
    }
  }
  if (rawRequest.budget !== undefined && (typeof rawRequest.budget !== 'number' || rawRequest.budget <= 0 || !Number.isFinite(rawRequest.budget))) {
    throw new Error('Invalid agent request: budget must be a positive finite number.')
  }
  if (rawRequest.currency !== undefined && !['INR', 'AED', 'USD'].includes(rawRequest.currency)) {
    throw new Error('Invalid agent request: currency must be INR, AED, or USD.')
  }
  if (rawRequest.maxResults !== undefined) {
    if (typeof rawRequest.maxResults !== 'number' || !Number.isInteger(rawRequest.maxResults) || rawRequest.maxResults < 1 || rawRequest.maxResults > 20) {
      throw new Error('Invalid agent request: maxResults must be an integer between 1 and 20.')
    }
  }
  if (rawRequest.products !== undefined) {
    if (!Array.isArray(rawRequest.products)) {
      throw new Error('Invalid agent request: products must be an array.')
    }
    if (rawRequest.products.length > 50) {
      throw new Error('Invalid agent request: products array cannot exceed 50 items.')
    }
    for (const [idx, p] of rawRequest.products.entries()) {
      if (!p || typeof p !== 'object' || !p.id || !p.name || typeof p.ingredients !== 'string' || typeof p.allergenStatement !== 'string' || typeof p.labelComplete !== 'boolean') {
        throw new Error(`Invalid agent request: malformed product item at index ${idx}. Must include id, name, ingredients, allergenStatement, and labelComplete.`)
      }
    }
  }
  if (rawRequest.approvedActions !== undefined) {
    if (!Array.isArray(rawRequest.approvedActions)) {
      throw new Error('Invalid agent request: approvedActions must be an array.')
    }
    const VALID_ACTIONS = ['save_shortlist', 'notify_user']
    for (const action of rawRequest.approvedActions) {
      if (!VALID_ACTIONS.includes(action)) {
        throw new Error(`Invalid agent request: unknown or unsupported action '${action}'.`)
      }
    }
  }

  const request = {
    ...rawRequest,
    goal: String(rawRequest.goal).trim(),
    constraints: [...rawRequest.constraints],
    budget: rawRequest.budget,
    currency: rawRequest.currency || 'INR',
    maxResults: rawRequest.maxResults || 5,
    allowInternalCatalog: rawRequest.allowInternalCatalog ?? true,
    allowPublicOffCatalog: rawRequest.allowPublicOffCatalog ?? false,
    allowPartnerCatalog: rawRequest.allowPartnerCatalog ?? false,
    products: (Array.isArray(rawRequest.products) ? rawRequest.products : []).map(p => ({
      ...p,
      sourceType: p.sourceType || 'USER_UPLOADED_LABEL',
      verificationStatus: p.verificationStatus || 'MANUALLY_PROVIDED',
      evidenceLimitations: p.evidenceLimitations || []
    })) as ProductEvidence[],
    approvedActions: Array.isArray(rawRequest.approvedActions) ? rawRequest.approvedActions : []
  }

  // Check client cancellation
  if (context.signal?.aborted) {
    const err = new Error('Execution aborted by client signal')
    err.name = 'AbortError'
    throw err
  }

  const globalController = new AbortController()
  let globalTimer: NodeJS.Timeout | undefined

  if (context.signal) {
    context.signal.addEventListener('abort', () => globalController.abort(), { once: true })
  }

  try {
    globalTimer = setTimeout(() => globalController.abort(), EXECUTION_TIMEOUT_MS)

    const MAX_REPLANS = 3
    const permittedTools: Array<'internal_catalog' | 'open_food_facts' | 'partner_catalog'> = []
    if (request.allowInternalCatalog) permittedTools.push('internal_catalog')
    if (request.allowPublicOffCatalog) permittedTools.push('open_food_facts')
    if (request.allowPartnerCatalog) permittedTools.push('partner_catalog')

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

    // Stage 1: Structured Goal Decomposition & Autonomous Planning
    let t = Date.now()
    const decomposedGoal = decomposeUserGoal(
      request.goal,
      request.constraints,
      request.budget,
      request.currency,
      request.maxResults
    )

    const executionPlan = await createAutonomousExecutionPlan({
      goal: request.goal,
      constraints: request.constraints,
      budget: request.budget,
      currency: request.currency,
      allowInternalCatalog: request.allowInternalCatalog,
      allowPublicOffCatalog: request.allowPublicOffCatalog,
      allowPartnerCatalog: request.allowPartnerCatalog,
      decomposedGoal
    }, 7000, globalController.signal)

    logStep(
      'parse_objective',
      'plan_orchestrator',
      'completed',
      `Decomposed goal (${decomposedGoal.requiredCategory}) & formulated plan via ${executionPlan.mode}. Reasoning: ${executionPlan.reasoning}`,
      t
    )

  // Stage 2: Evidence Gathering with Dynamic Replanning & Safe Timeout
  t = Date.now()
  const gatheredEvidence: ProductEvidence[] = [...request.products]

  if (request.products.length > 0) {
    logStep(
      'check_evidence_sources',
      'user_evidence_loader',
      'completed',
      `Loaded ${request.products.length} user-supplied package label record(s).`,
      t
    )
  }

  let currentPlan = executionPlan
  const toolQueue: Array<'internal_catalog' | 'open_food_facts' | 'partner_catalog'> = [...currentPlan.selectedTools]
  const executedTools = new Set<string>()

  while (toolQueue.length > 0) {
    const toolName = toolQueue.shift()!
    if (executedTools.has(toolName)) continue
    executedTools.add(toolName)

    // Check execution budget hard-stop or abort
    if (globalController.signal.aborted || (Date.now() - started) > EXECUTION_TIMEOUT_MS) {
      retrievalErrors.push('Execution deadline reached or cancelled; safely halted further tool dispatch.')
      break
    }

    const currentQuery = currentPlan.searchQueries[0] || request.goal

    if (toolName === 'internal_catalog' && request.allowInternalCatalog) {
      t = Date.now()
      try {
        const matches = await searchInternalReviewedCatalog(currentQuery, request.currency, globalController.signal)
        if (matches.length > 0) {
          gatheredEvidence.push(...matches)
          logStep(
            'retrieve_candidate_evidence',
            'internal_reviewed_catalog',
            'completed',
            `Retrieved ${matches.length} record(s) from ScanSafe database.`,
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
          // Dynamic replan on EMPTY_RESULTS: refine query and shift to remaining permitted tools
          const remainingPermitted = permittedTools.filter(item => !executedTools.has(item))
          if (remainingPermitted.length > 0 && currentPlan.replanCount < MAX_REPLANS) {
            const refinedQuery = currentQuery.split(/\s+/).slice(0, 3).join(' ')
            currentPlan = dynamicReplanAfterToolExecution(currentPlan, {
              reason: 'EMPTY_RESULTS',
              exhaustedTool: 'internal_catalog',
              remainingTools: remainingPermitted,
              fallbackQuery: refinedQuery
            })
            for (const nextTool of remainingPermitted) {
              if (!toolQueue.includes(nextTool)) toolQueue.push(nextTool)
            }
            logStep(
              'retrieve_candidate_evidence',
              'dynamic_replanner',
              'completed',
              currentPlan.replanNotes || 'Replanned tool priorities after empty internal catalog results.',
              t
            )
          }
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
        // Dynamic replan on TOOL_FAILURE
        const remainingPermitted = permittedTools.filter(item => !executedTools.has(item))
        if (currentPlan.replanCount < MAX_REPLANS) {
          currentPlan = dynamicReplanAfterToolExecution(currentPlan, {
            reason: 'TOOL_FAILURE',
            exhaustedTool: 'internal_catalog',
            remainingTools: remainingPermitted,
            errorDetails: err.message
          })
          for (const nextTool of remainingPermitted) {
            if (!toolQueue.includes(nextTool)) toolQueue.push(nextTool)
          }
          logStep(
            'retrieve_candidate_evidence',
            'dynamic_replanner',
            'completed',
            currentPlan.replanNotes || 'Replanned tool priorities after internal catalog failure.',
            t
          )
        }
      }
    } else if (toolName === 'partner_catalog' && request.allowPartnerCatalog) {
      const catalogSearchFn = context.externalCatalogSearch || (process.env.GUARDIAN_CATALOG_API_URL ? searchApprovedCatalog : undefined)
      if (!catalogSearchFn) {
        t = Date.now()
        logStep(
          'retrieve_candidate_evidence',
          'catalog_search',
          'skipped',
          'Partner catalog requested but GUARDIAN_CATALOG_API_URL is not configured; zero simulated products fabricated.',
          t
        )
      } else {
        let partnerSuccess = false
        // Bounded retry budget respecting remaining global deadline
        for (let attempt = 1; attempt <= 2 && !partnerSuccess; attempt++) {
          const remainingMs = EXECUTION_TIMEOUT_MS - (Date.now() - started)
          if (remainingMs <= 600 || globalController.signal.aborted) {
            retrievalErrors.push('Partner catalog retry skipped: insufficient execution time remaining.')
            break
          }
          t = Date.now()
          try {
            const partnerItems = await catalogSearchFn(currentQuery, request.currency, globalController.signal)
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
                `Attempt 1 failed (${err.message}); evaluating retry against remaining budget.`,
                t,
                err.message
              )
              const remainingAfterErr = EXECUTION_TIMEOUT_MS - (Date.now() - started)
              if (remainingAfterErr > 600 && !globalController.signal.aborted) {
                await new Promise(r => setTimeout(r, Math.min(200, remainingAfterErr - 100)))
              }
            } else {
              retrievalErrors.push(`Partner catalog connector failed: ${err.message}`)
              logStep(
                'retrieve_candidate_evidence',
                'catalog_search',
                'failed',
                `Attempt 2 failed; halted connector safely. Zero fake records created.`,
                t,
                err.message
              )
              // Dynamic replan on TOOL_FAILURE
              const remainingPermitted = permittedTools.filter(item => !executedTools.has(item))
              if (currentPlan.replanCount < MAX_REPLANS) {
                currentPlan = dynamicReplanAfterToolExecution(currentPlan, {
                  reason: 'TOOL_FAILURE',
                  exhaustedTool: 'partner_catalog',
                  remainingTools: remainingPermitted,
                  errorDetails: err.message
                })
                for (const nextTool of remainingPermitted) {
                  if (!toolQueue.includes(nextTool)) toolQueue.push(nextTool)
                }
                logStep(
                  'retrieve_candidate_evidence',
                  'dynamic_replanner',
                  'completed',
                  currentPlan.replanNotes || 'Replanned tool priorities after partner catalog failure.',
                  t
                )
              }
            }
          }
        }
      }
    } else if (toolName === 'open_food_facts' && request.allowPublicOffCatalog) {
      t = Date.now()
      try {
        const offItems = await searchPublicOpenFoodFacts(currentQuery, request.currency, globalController.signal)
        if (offItems.length > 0) {
          gatheredEvidence.push(...offItems)
          uncertainties.push('Public Open Food Facts records contain crowdsourced entries; ingredient formulations may differ by region.')
          logStep(
            'retrieve_candidate_evidence',
            'open_food_facts_crowdsourced',
            'completed',
            `Retrieved ${offItems.length} record(s) from Open Food Facts public database.`,
            t
          )
        } else {
          logStep(
            'retrieve_candidate_evidence',
            'open_food_facts_crowdsourced',
            'completed',
            'Open Food Facts query completed; zero matching records found.',
            t
          )
          // Dynamic replan on EMPTY_RESULTS
          const remainingPermitted = permittedTools.filter(item => !executedTools.has(item))
          if (remainingPermitted.length > 0 && currentPlan.replanCount < MAX_REPLANS) {
            currentPlan = dynamicReplanAfterToolExecution(currentPlan, {
              reason: 'EMPTY_RESULTS',
              exhaustedTool: 'open_food_facts',
              remainingTools: remainingPermitted
            })
            for (const nextTool of remainingPermitted) {
              if (!toolQueue.includes(nextTool)) toolQueue.push(nextTool)
            }
            logStep(
              'retrieve_candidate_evidence',
              'dynamic_replanner',
              'completed',
              currentPlan.replanNotes || 'Replanned after Open Food Facts returned empty results.',
              t
            )
          }
        }
      } catch (err: any) {
        retrievalErrors.push(`Open Food Facts error: ${err.message}`)
        logStep(
          'retrieve_candidate_evidence',
          'open_food_facts_crowdsourced',
          'failed',
          `Open Food Facts query failed: ${err.message}`,
          t,
          err.message
        )
        // Dynamic replan on TOOL_FAILURE
        const remainingPermitted = permittedTools.filter(item => !executedTools.has(item))
        if (remainingPermitted.length > 0 && currentPlan.replanCount < MAX_REPLANS) {
          currentPlan = dynamicReplanAfterToolExecution(currentPlan, {
            reason: 'TOOL_FAILURE',
            exhaustedTool: 'open_food_facts',
            remainingTools: remainingPermitted,
            errorDetails: err.message
          })
          for (const nextTool of remainingPermitted) {
            if (!toolQueue.includes(nextTool)) toolQueue.push(nextTool)
          }
          logStep(
            'retrieve_candidate_evidence',
            'dynamic_replanner',
            'completed',
            currentPlan.replanNotes || 'Replanned tool priorities after Open Food Facts failure.',
            t
          )
        }
      }
    }

    // Dynamic replan on INSUFFICIENT_CANDIDATES: if current tool queue is empty, but we have < 3 candidates
    const remainingUnused = permittedTools.filter(item => !executedTools.has(item))
    if (
      toolQueue.length === 0 &&
      gatheredEvidence.length < (request.maxResults || 3) &&
      remainingUnused.length > 0 &&
      currentPlan.replanCount < MAX_REPLANS
    ) {
      currentPlan = dynamicReplanAfterToolExecution(currentPlan, {
        reason: 'INSUFFICIENT_CANDIDATES',
        exhaustedTool: toolName,
        remainingTools: remainingUnused,
        currentCandidatesCount: gatheredEvidence.length,
        targetCandidateCount: request.maxResults || 5
      })
      for (const nextTool of remainingUnused) {
        if (!toolQueue.includes(nextTool)) toolQueue.push(nextTool)
      }
      logStep(
        'retrieve_candidate_evidence',
        'dynamic_replanner',
        'completed',
        currentPlan.replanNotes || 'Replanned to backfill insufficient candidate pool.',
        t
      )
    }
  }

  // Stage 3: Deduplication and Evidence Normalization
  const uniqueItems = new Map<string, ProductEvidence>()
  let duplicatesCount = 0
  for (const item of gatheredEvidence) {
    if (!item || !item.id) continue
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

  // Stage 4: Independent Deterministic Verification (Safety & Goal Relevance)
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
    // Cross-source conflict screening across gathered evidence
    const sourceConflicts = detectEvidenceConflicts(normalizedEvidence, request.constraints)

    for (const item of normalizedEvidence) {
      const safetyEval = evaluateDeterministicSafety(item, request.constraints, request.budget)
      const goalEval = evaluateProductGoalRelevance(item, decomposedGoal)

      if (sourceConflicts.has(item.id)) {
        safetyEval.conflictingClaims = true
        safetyEval.allergenStatus = 'CONFLICTING'
        safetyEval.status = 'needs_review'
        safetyEval.uncertaintyScore = Math.max(safetyEval.uncertaintyScore, 0.90)
        safetyEval.reasons.push(`Needs Review (SOURCE CONFLICT): ${sourceConflicts.get(item.id)}`)
      }

      // Priority 2: Two independent evaluation dimensions.
      // Shortlisting requires passing BOTH food safety and goal relevance.
      let combinedStatus: 'candidate' | 'excluded' | 'needs_review' = 'needs_review'
      if (sourceConflicts.has(item.id) || safetyEval.allergenStatus === 'CONFLICTING') {
        combinedStatus = 'needs_review'
      } else if (goalEval.status === 'EXCLUDED' || safetyEval.allergenStatus === 'CONTAINS' || safetyEval.allergenStatus === 'MAY_CONTAIN') {
        combinedStatus = 'excluded'
      } else if (safetyEval.allergenStatus === 'NO_RESTRICTED_TOKENS_DETECTED' && goalEval.status === 'MATCH') {
        combinedStatus = 'candidate'
      } else {
        combinedStatus = 'needs_review'
      }

      const evaluated: EvaluatedProduct = {
        ...safetyEval,
        status: combinedStatus,
        goalRelevanceStatus: goalEval.status,
        categoryMatch: goalEval.categoryMatch,
        relevanceReasons: goalEval.relevanceReasons,
        attributeEvidence: goalEval.attributeEvidence,
        reasons: [...safetyEval.reasons, ...goalEval.relevanceReasons]
      }

      evaluatedProducts.push(evaluated)
      if (evaluated.uncertaintyScore > 0.4 || goalEval.status === 'NEEDS_REVIEW') {
        const reviewNote = goalEval.relevanceReasons.find(r => r.startsWith('NEEDS_REVIEW')) ||
          'incomplete declarations, crowdsourced origin, or unverified claims'
        uncertainties.push(`Uncertainty on "${item.name}": ${reviewNote}.`)
      }
    }

    logStep(
      'cross_verify_dietary_rules',
      'deterministic_verifier',
      'completed',
      `Evaluated ${evaluatedProducts.length} product(s) across food safety (15 allergens) and goal relevance (${decomposedGoal.requiredCategory}) independently of LLM.`,
      t
    )
  }

  // Stage 5: Uncertainty Scoring and Candidate Shortlist
  t = Date.now()
  const candidates = evaluatedProducts.filter(p => p.status === 'candidate')
  candidates.sort((a, b) => {
    // Rank by price ascending, with unknown price last
    const priceA = a.price ?? Number.POSITIVE_INFINITY
    const priceB = b.price ?? Number.POSITIVE_INFINITY
    if (priceA !== priceB) return priceA - priceB
    return (a.uncertaintyScore ?? 0.5) - (b.uncertaintyScore ?? 0.5)
  })

  const shortlist = candidates.slice(0, request.maxResults).map(p => p.id)

  logStep(
    'rank_and_evaluate_uncertainty',
    'uncertainty_ranker',
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
          `Shortlist persisted with user affirmative approval into user vault (Run ID: ${runId}).`,
          t
        )
      } catch (err: any) {
        saved = false
        retrievalErrors.push(`Failed to persist shortlist: ${err.message}`)
        logStep(
          'persist_shortlist_approval',
          'user_vault_storage',
          'failed',
          `Vault persistence failed: ${err.message}. Shortlist marked unsaved.`,
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
      mode: currentPlan.mode,
      goal: request.goal,
      decomposedGoal,
      sourceMode,
      plan: currentPlan.stages,
      currentStage: 'persist_shortlist_approval',
      steps,
      products: evaluatedProducts,
      shortlist,
      saved,
      retrievalErrors,
      uncertainties,
      safetyNotice: 'Evidence-backed candidates represent uncertified comparative evaluations based strictly on retrieved packaging text. This does NOT constitute medical, food-safety, or allergy-free certification. Always verify physical manufacturer labels directly before consuming.',
      limitations: [
        'Autonomous agent operates within bounded deterministic state machine; arbitrary execution of unverified web URLs is strictly prohibited.',
        'Third-party and crowdsourced public databases (Open Food Facts, community OCR cache) may contain unverified or outdated ingredient formulations.',
        'A missing allergen declaration does NOT prove the absence of an allergen or cross-contact risk.',
        'Product shortlists only include items passing both deterministic allergen safety and category/attribute goal relevance.'
      ]
    }
  } finally {
    if (globalTimer) clearTimeout(globalTimer)
  }
}
