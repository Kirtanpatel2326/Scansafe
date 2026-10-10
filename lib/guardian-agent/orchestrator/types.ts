import { z } from 'zod'
import { GUARDIAN_ENGINE_VERSION } from '../../guardian'

export const ConstraintEnum = z.enum([
  'peanut',
  'tree_nut',
  'milk',
  'egg',
  'soy',
  'wheat',
  'sesame',
  'gluten',
  'crustacean',
  'fish',
  'mustard',
  'celery',
  'lupin',
  'mollusc',
  'sulphite'
])
export type Constraint = z.infer<typeof ConstraintEnum>

export const CurrencyEnum = z.enum(['INR', 'AED', 'USD'])
export type Currency = z.infer<typeof CurrencyEnum>

export const ProductEvidenceSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(100).optional(),
  ingredients: z.string().trim().max(10000),
  allergenStatement: z.string().trim().max(3000),
  labelComplete: z.boolean(),
  evidenceSource: z.string().trim().min(4).max(500),
  sourceType: z.enum([
    'USER_UPLOADED_LABEL',
    'INTERNAL_VERIFIED_CATALOG',
    'OPEN_FOOD_FACTS_PUBLIC',
    'PARTNER_MANUFACTURER_FEED',
    'SYNTHETIC_BENCHMARK_FIXTURE'
  ]).default('USER_UPLOADED_LABEL'),
  price: z.number().finite().nonnegative().max(100000).optional(),
  currency: CurrencyEnum.default('INR'),
  gtin: z.string().trim().max(50).optional(),
  retrievedAt: z.string().datetime().optional()
})
export type ProductEvidence = z.infer<typeof ProductEvidenceSchema>

export const AgentPlanStageEnum = z.enum([
  'parse_objective',
  'check_evidence_sources',
  'retrieve_candidate_evidence',
  'cross_verify_dietary_rules',
  'rank_and_evaluate_uncertainty',
  'persist_shortlist_approval'
])

export const AgentStepSchema = z.object({
  id: z.number().int().positive(),
  stage: AgentPlanStageEnum,
  tool: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']),
  description: z.string(),
  at: z.string(),
  durationMs: z.number().nonnegative(),
  error: z.string().nullable().optional()
})
export type AgentStep = z.infer<typeof AgentStepSchema>

export const EvaluatedProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  price: z.number().nullable(),
  currency: CurrencyEnum,
  evidenceSource: z.string(),
  sourceType: z.string(),
  status: z.enum(['candidate', 'excluded', 'needs_review']),
  reasons: z.array(z.string()),
  allergenHits: z.array(z.string()),
  precautionaryNotice: z.boolean(),
  conflictingClaims: z.boolean(),
  uncertaintyScore: z.number().min(0).max(1)
})
export type EvaluatedProduct = z.infer<typeof EvaluatedProductSchema>

export const AutonomousAgentRequestSchema = z.object({
  goal: z.string().trim().min(5).max(1000),
  constraints: z.array(ConstraintEnum).min(1).max(15),
  budget: z.number().positive().finite().max(100000).optional(),
  currency: CurrencyEnum.default('INR'),
  maxResults: z.number().int().min(1).max(20).default(5),
  allowInternalCatalog: z.boolean().default(true),
  allowPublicOffCatalog: z.boolean().default(false),
  allowPartnerCatalog: z.boolean().default(false),
  products: z.array(ProductEvidenceSchema).max(50).optional(),
  approvedActions: z.array(z.enum(['save_shortlist', 'notify_user'])).default([])
})
export type AutonomousAgentRequest = z.output<typeof AutonomousAgentRequestSchema>
export type AutonomousAgentInput = z.input<typeof AutonomousAgentRequestSchema>

export const AutonomousAgentResponseSchema = z.object({
  runId: z.string().uuid(),
  createdAt: z.string(),
  elapsedMs: z.number().nonnegative(),
  mode: z.literal('AUTONOMOUS_LANGGRAPH_STATE_MACHINE'),
  goal: z.string(),
  sourceMode: z.enum([
    'USER_SUPPLIED_EVIDENCE_ONLY',
    'CATALOG_EVIDENCE_ONLY',
    'MULTI_SOURCE_EVIDENCE',
    'NO_EVIDENCE_AVAILABLE'
  ]),
  plan: z.array(z.string()),
  currentStage: AgentPlanStageEnum,
  steps: z.array(AgentStepSchema),
  products: z.array(EvaluatedProductSchema),
  shortlist: z.array(z.string()),
  saved: z.boolean(),
  retrievalErrors: z.array(z.string()),
  uncertainties: z.array(z.string()),
  safetyNotice: z.string(),
  limitations: z.array(z.string()),
  engineVersion: z.string().default(GUARDIAN_ENGINE_VERSION)
})
export type AutonomousAgentResponse = z.infer<typeof AutonomousAgentResponseSchema>
