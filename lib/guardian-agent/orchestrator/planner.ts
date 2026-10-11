import { z } from 'zod'
import { Constraint, Currency, DecomposedGoal } from './types'

export interface StructuredPlan {
  mode: 'LLM_STRUCTURED_AUTONOMOUS_PLANNER' | 'BOUNDED_STATE_MACHINE_PLANNER'
  reasoning: string
  stages: string[]
  selectedTools: Array<'internal_catalog' | 'open_food_facts' | 'partner_catalog'>
  searchQueries: string[]
  replanCount: number
  replanNotes?: string
}

interface PlannerInput {
  goal: string
  constraints: Constraint[]
  budget?: number
  currency: Currency
  allowInternalCatalog: boolean
  allowPublicOffCatalog: boolean
  allowPartnerCatalog: boolean
  decomposedGoal?: DecomposedGoal
}

const ToolNameSchema = z.enum(['internal_catalog', 'open_food_facts', 'partner_catalog'])

/**
 * Strict schema for Gemini structured plan output.
 * Enforces reasoning length, tool enum, and bound on search queries count & length.
 */
export const GeminiPlanOutputSchema = z.object({
  reasoning: z.string().trim().min(3).max(500),
  selectedTools: z.array(ToolNameSchema).min(1).max(3),
  searchQueries: z.array(z.string().trim().min(2).max(100)).min(1).max(3)
})

/**
 * Real Bounded LLM-Based Planning Engine for ScanSafe Guardian.
 * 
 * Invokes Gemini structured JSON schema generation to formulate execution strategies,
 * tool priority sequences, and dynamic search queries.
 * 
 * Enforces:
 * - Strict Zod schema validation
 * - Dynamic tool allowlists (rejects unallowed tools)
 * - Maximum query count (≤ 3) and query length (≤ 100 chars)
 * - Maximum response payload size (≤ 50KB)
 * - Bounded request timeouts (abort signal)
 * - Deterministic dietary safety verification is ALWAYS executed independently
 *   in verifier.ts and NEVER delegated to probabilistic LLM judgment.
 */
export async function createAutonomousExecutionPlan(
  input: PlannerInput,
  timeoutMs: number = 7000,
  parentSignal?: AbortSignal
): Promise<StructuredPlan> {
  const availableTools: Array<'internal_catalog' | 'open_food_facts' | 'partner_catalog'> = []
  if (input.allowInternalCatalog) availableTools.push('internal_catalog')
  if (input.allowPublicOffCatalog) availableTools.push('open_food_facts')
  if (input.allowPartnerCatalog) availableTools.push('partner_catalog')

  // Check for LLM availability
  const hasGemini = Boolean(process.env.GEMINI_API_KEY)

  if (hasGemini && availableTools.length > 0) {
    if (parentSignal?.aborted) {
      return makeDeterministicPlan(input, availableTools)
    }

    const controller = new AbortController()
    let timer: NodeJS.Timeout | undefined

    if (parentSignal) {
      parentSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    try {
      timer = setTimeout(() => controller.abort(), timeoutMs)

      const categoryContext = input.decomposedGoal ? `
Required Product Category: "${input.decomposedGoal.requiredCategory}"
Target Category Keywords: [${input.decomposedGoal.categoryKeywords.join(', ')}]
Explicitly Excluded Category Keywords (DO NOT SEARCH FOR THESE): [${input.decomposedGoal.excludedCategoryKeywords.join(', ')}]
` : ''

      const prompt = `You are the food safety research planner for ScanSafe Guardian AI.
Given this research goal: "${input.goal}"
Active dietary constraints: [${input.constraints.join(', ')}]
Permitted tools (strict allowlist): [${availableTools.join(', ')}]
${categoryContext}
Respond strictly in valid JSON matching this schema:
{
  "reasoning": "Concise 1 sentence explanation of query plan",
  "selectedTools": ["${availableTools.join('", "')}"],
  "searchQueries": ["core product keyword (1-3 words)", "broader category fallback"]
}
IMPORTANT: searchQueries MUST identify the target food category. For instance, if seeking seed butter, search "seed butter" or "sunflower butter", NEVER ordinary "butter". Do NOT include allergen or dietary adjectives like gluten-free or vegan in searchQueries because dietary safety is checked deterministically afterwards.`

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
      const res = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2000,
            responseMimeType: 'application/json'
          }
        })
      })

      if (res.ok) {
        // Enforce max output payload limit (50 KB)
        const text = await res.text()
        if (text.length <= 50000) {
          const json = JSON.parse(text)
          const rawContent = json.candidates?.[0]?.content?.parts?.[0]?.text
          if (rawContent) {
            const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
            const rawParsed = JSON.parse(cleaned)
            const validation = GeminiPlanOutputSchema.safeParse(rawParsed)
            if (validation.success) {
              const plan = validation.data
              // Enforce strict tool allowlist against user-permitted tools
              const allowedTools = plan.selectedTools.filter(t => availableTools.includes(t))
              const sanitizedTools = allowedTools.length > 0 ? allowedTools : availableTools

              // Enforce sanitized search queries
              const sanitizedQueries = plan.searchQueries
                .map(q => q.slice(0, 100).trim())
                .filter(q => q.length >= 2)
              const finalQueries = sanitizedQueries.length > 0
                ? sanitizedQueries
                : [input.goal.slice(0, 100)]

              return {
                mode: 'LLM_STRUCTURED_AUTONOMOUS_PLANNER',
                reasoning: plan.reasoning,
                stages: [
                  `LLM Strategic Tool Sequence: query [${sanitizedTools.join(' -> ')}] with optimized terms "${finalQueries[0]}"`,
                  `Retrieve product evidence from selected authorized adapters`,
                  `Execute independent deterministic dietary safety verification (fail-closed, 15 allergen classes)`,
                  `Score evidence uncertainty (flagging crowdsourced/unverified/incomplete records)`,
                  `Verify affirmative user consent before persisting shortlist to Supabase vault`
                ],
                selectedTools: sanitizedTools,
                searchQueries: finalQueries,
                replanCount: 0
              }
            } else {
              console.warn('[Guardian Planner] Gemini output failed schema validation; falling back to state machine:', validation.error.flatten())
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('[Guardian Planner] LLM planner request aborted or failed; falling back to state machine:', err?.message)
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  return makeDeterministicPlan(input, availableTools)
}

function cleanProductSearchQuery(goal: string, constraints: string[] = []): string {
  let q = goal
    .replace(/^(find|search for|search|look for|check|get|buy|locate)\s+(me\s+)?(a\s+|an\s+|some\s+)?/i, '')
    .trim()
  for (const c of constraints) {
    q = q.replace(new RegExp(`\\b${c}[-\\s]?free\\b`, 'gi'), '')
  }
  q = q
    .replace(/\b(low[- ]sugar|vegan|organic|healthy|allergy[- ]safe|safe|and|with|without)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return q.length >= 3 ? q : goal.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().slice(0, 100)
}

function makeDeterministicPlan(
  input: PlannerInput,
  availableTools: Array<'internal_catalog' | 'open_food_facts' | 'partner_catalog'>
): StructuredPlan {
  const defaultQuery = cleanProductSearchQuery(input.goal, input.constraints)
  const searchQueries = (input.decomposedGoal && input.decomposedGoal.categoryKeywords.length > 0)
    ? Array.from(new Set([input.decomposedGoal.categoryKeywords[0], defaultQuery, ...input.decomposedGoal.categoryKeywords])).slice(0, 3)
    : [defaultQuery]

  return {
    mode: 'BOUNDED_STATE_MACHINE_PLANNER',
    reasoning: `Deterministic state-machine plan: prioritize available tools [${availableTools.join(', ') || 'user_evidence_only'}]. Target category: ${input.decomposedGoal?.requiredCategory || 'general'}.`,
    stages: [
      `Analyze objective and restrict candidate products for [${input.constraints.join(', ')}]`,
      `Assemble multi-source evidence from authorized sources: [${availableTools.join(', ') || 'user provided evidence'}]`,
      `Execute independent deterministic dietary safety verification (fail-closed, 15 allergen classes)`,
      `Evaluate strict goal relevance across category, nutritional thresholds, and certification standards`,
      `Verify affirmative action approval before persisting shortlist to user vault`
    ],
    selectedTools: availableTools,
    searchQueries,
    replanCount: 0
  }
}

export type ReplanReason =
  | 'EMPTY_RESULTS'
  | 'TOOL_FAILURE'
  | 'INSUFFICIENT_CANDIDATES'
  | 'CONFLICTING_EVIDENCE'

export interface ReplanOptions {
  reason: ReplanReason
  exhaustedTool: string
  remainingTools: Array<'internal_catalog' | 'open_food_facts' | 'partner_catalog'>
  fallbackQuery?: string
  currentCandidatesCount?: number
  targetCandidateCount?: number
  errorDetails?: string
}

/**
 * Dynamic replanning: triggered when initial tool returns 0 candidates, encounters errors,
 * discovers conflicting evidence, or produces insufficient qualifying candidates.
 */
export function dynamicReplanAfterToolExecution(
  currentPlan: StructuredPlan,
  optionsOrTool: ReplanOptions | string,
  legacyRemaining?: Array<'internal_catalog' | 'open_food_facts' | 'partner_catalog'>,
  legacyQuery?: string
): StructuredPlan {
  const opts: ReplanOptions = typeof optionsOrTool === 'string'
    ? {
        reason: 'EMPTY_RESULTS',
        exhaustedTool: optionsOrTool,
        remainingTools: legacyRemaining || [],
        fallbackQuery: legacyQuery
      }
    : optionsOrTool

  const replannedTools = opts.remainingTools.filter(t => t !== opts.exhaustedTool)
  const updatedQueries = opts.fallbackQuery && opts.fallbackQuery.trim().length >= 2
    ? [opts.fallbackQuery.trim(), ...currentPlan.searchQueries.filter(q => q !== opts.fallbackQuery!.trim())]
    : currentPlan.searchQueries

  let explanation = ''
  switch (opts.reason) {
    case 'EMPTY_RESULTS':
      explanation = `Tool "${opts.exhaustedTool}" yielded 0 candidates; dynamically shifted execution priority to [${replannedTools.join(', ') || 'user evidence'}]. Query updated to: "${updatedQueries[0]}".`
      break
    case 'TOOL_FAILURE':
      explanation = `Tool "${opts.exhaustedTool}" encountered an error (${opts.errorDetails || 'unreachable'}). Safely recovered by routing to next permitted tool: [${replannedTools.join(', ') || 'user evidence only'}].`
      break
    case 'INSUFFICIENT_CANDIDATES':
      explanation = `Discovered ${opts.currentCandidatesCount || 0} candidate(s), below target quota of ${opts.targetCandidateCount || 5}. Replanned to backfill shortlist from [${replannedTools.join(', ')}].`
      break
    case 'CONFLICTING_EVIDENCE':
      explanation = `Conflicting cross-source allergen claims detected. Replanned to seek corroborating evidence from remaining permitted tools: [${replannedTools.join(', ')}].`
      break
  }

  return {
    ...currentPlan,
    replanCount: currentPlan.replanCount + 1,
    replanNotes: explanation,
    selectedTools: replannedTools,
    searchQueries: updatedQueries,
    stages: [
      ...currentPlan.stages,
      `Dynamic Replan #${currentPlan.replanCount + 1} (${opts.reason}): ${explanation}`
    ]
  }
}
