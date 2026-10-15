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

export const SourceTypeEnum = z.enum([
  'USER_UPLOADED_LABEL',
  'INTERNAL_CACHE_OCR',
  'INTERNAL_VERIFIED_CATALOG',
  'OPEN_FOOD_FACTS_CROWDSOURCED',
  'OPEN_FOOD_FACTS_PUBLIC', // preserved for backwards compatibility
  'PARTNER_MANUFACTURER_FEED',
  'SYNTHETIC_BENCHMARK_FIXTURE'
])
export type SourceType = z.infer<typeof SourceTypeEnum>

export const VerificationStatusEnum = z.enum([
  'UNVERIFIED_COMMUNITY_OCR',
  'MANUFACTURER_AUTHORIZED',
  'CROWDSOURCED_COMMUNITY',
  'MANUALLY_PROVIDED',
  'SYNTHETIC_FIXTURE'
])
export type VerificationStatus = z.infer<typeof VerificationStatusEnum>

export const AllergenStatusEnum = z.enum([
  'CONTAINS',
  'MAY_CONTAIN',
  'UNKNOWN',
  'CONFLICTING',
  'NO_RESTRICTED_TOKENS_DETECTED'
])
export type AllergenStatus = z.infer<typeof AllergenStatusEnum>

export const GoalRelevanceStatusEnum = z.enum([
  'MATCH',
  'EXCLUDED',
  'NEEDS_REVIEW'
])
export type GoalRelevanceStatus = z.infer<typeof GoalRelevanceStatusEnum>

export const DecomposedGoalSchema = z.object({
  rawGoal: z.string(),
  requiredCategory: z.string().trim().min(1).max(100),
  categoryKeywords: z.array(z.string()).default([]),
  excludedCategoryKeywords: z.array(z.string()).default([]),
  requiredAttributes: z.array(z.string()).default([]),
  excludedIngredients: z.array(z.string()).default([]),
  dietaryRestrictions: z.array(ConstraintEnum).default([]),
  optionalPreferences: z.array(z.string()).default([]),
  budget: z.number().positive().finite().optional(),
  currency: CurrencyEnum.default('INR'),
  maxResults: z.number().int().min(1).max(20).default(5),
  quantity: z.string().optional(),
  geographicOrRetailerConstraints: z.string().optional()
})
export type DecomposedGoal = z.infer<typeof DecomposedGoalSchema>

export const CertificationProvenanceLevelEnum = z.enum([
  'UNVERIFIED_PRODUCT_METADATA',
  'UNVERIFIED_METADATA',
  'USER_UPLOADED_LABEL_EVIDENCE',
  'PRODUCT_LABEL_DECLARATION',
  'MANUFACTURER_SELF_DECLARED',
  'MANUFACTURER_DECLARATION',
  'DOCUMENTED_THIRD_PARTY_CLAIM',
  'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION'
])
export type CertificationProvenanceLevel = z.infer<typeof CertificationProvenanceLevelEnum>

export const VerificationMethodEnum = z.enum([
  'UNVERIFIED_TEXT_MATCH',
  'MANUFACTURER_SELF_DECLARATION',
  'PACKAGING_LABEL_INSPECTION',
  'THIRD_PARTY_AUDIT_DATABASE',
  'REGISTRY_LOOKUP_AUTHENTICATED',
  'EXTERNAL_STANDARDS_VERIFIER'
])
export type VerificationMethod = z.infer<typeof VerificationMethodEnum>

export const CertificationStatusEnum = z.enum([
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
  'UNVERIFIED',
  'MISMATCHED'
])
export type CertificationStatus = z.infer<typeof CertificationStatusEnum>

export const ClaimedCertificationSchema = z.object({
  certificationBody: z.string().trim().min(1).max(200),
  certificationId: z.string().trim().max(100).optional(),
  associatedProductId: z.string().trim().min(1).max(100),
  brand: z.string().trim().max(100).optional(),
  barcode: z.string().trim().max(100).optional(),
  evidenceUrl: z.string().max(1000).optional(),
  observedAt: z.string(),
  verifiedAt: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  verificationMethod: VerificationMethodEnum.default('UNVERIFIED_TEXT_MATCH'),
  provenanceLevel: CertificationProvenanceLevelEnum.default('UNVERIFIED_PRODUCT_METADATA'),
  verificationOperator: z.string().trim().max(100).optional(),
  standard: z.string().optional(),
  status: CertificationStatusEnum.default('UNVERIFIED'),
  registryConfirmed: z.boolean().default(false),
  isRevoked: z.boolean().default(false).optional(),
  serverAttestationToken: z.string().optional(),
  attestationKid: z.string().trim().max(50).optional(),
  attestationExpiresAt: z.string().optional(),
  registryId: z.string().optional(),
  notes: z.string().optional()
})
export type ClaimedCertification = z.infer<typeof ClaimedCertificationSchema>

export const ProductEvidenceSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(100).optional(),
  ingredients: z.string().trim().max(10000),
  allergenStatement: z.string().trim().max(3000),
  labelComplete: z.boolean(),
  evidenceSource: z.string().trim().min(4).max(500),
  sourceType: SourceTypeEnum.default('USER_UPLOADED_LABEL'),
  verificationStatus: VerificationStatusEnum.default('MANUALLY_PROVIDED'),
  evidenceLimitations: z.array(z.string()).default([]),
  sourceUrl: z.string().max(1000).optional(),
  price: z.number().finite().nonnegative().max(100000).optional(),
  currency: CurrencyEnum.default('INR'),
  gtin: z.string().trim().max(50).optional(),
  retrievedAt: z.string().optional(),
  sugarsPer100g: z.number().finite().nonnegative().optional(),
  isOrganicDeclared: z.boolean().optional(),
  certificationsDeclared: z.array(z.string()).optional(),
  certifiedRecords: z.array(ClaimedCertificationSchema).optional(),
  categoriesDeclared: z.array(z.string()).optional()
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

export const AttributeEvidenceDetailSchema = z.object({
  status: GoalRelevanceStatusEnum,
  evidence: z.string()
})
export type AttributeEvidenceDetail = z.infer<typeof AttributeEvidenceDetailSchema>

export const EvaluatedProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  price: z.number().nullable(),
  currency: CurrencyEnum,
  evidenceSource: z.string(),
  sourceType: z.string(),
  verificationStatus: z.string().optional(),
  allergenStatus: AllergenStatusEnum,
  goalRelevanceStatus: GoalRelevanceStatusEnum.optional(),
  categoryMatch: z.boolean().optional(),
  status: z.enum(['candidate', 'excluded', 'needs_review']),
  reasons: z.array(z.string()),
  relevanceReasons: z.array(z.string()).optional(),
  attributeEvidence: z.record(z.string(), AttributeEvidenceDetailSchema).optional(),
  allergenHits: z.array(z.string()),
  precautionaryNotice: z.boolean(),
  conflictingClaims: z.boolean(),
  uncertaintyScore: z.number().min(0).max(1),
  evidenceLimitations: z.array(z.string()).optional(),
  sourceUrl: z.string().optional(),
  gtin: z.string().optional(),
  retrievedAt: z.string().optional(),
  certifiedRecords: z.array(ClaimedCertificationSchema).optional()
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
  products: z.array(ProductEvidenceSchema).max(50).default([]),
  approvedActions: z.array(z.enum(['save_shortlist', 'notify_user'])).default([])
})
export type AutonomousAgentRequest = z.output<typeof AutonomousAgentRequestSchema>
export type AutonomousAgentInput = z.input<typeof AutonomousAgentRequestSchema>

export const AgentExecutionModeEnum = z.enum([
  'LLM_STRUCTURED_AUTONOMOUS_PLANNER',
  'BOUNDED_STATE_MACHINE_PLANNER',
  'BOUNDED_AUTONOMOUS_WORKFLOW'
])
export type AgentExecutionMode = z.infer<typeof AgentExecutionModeEnum>

export const TaskStateEnum = z.enum([
  'PLANNING',
  'RESEARCHING',
  'VERIFYING',
  'REPLANNING',
  'AWAITING_APPROVAL',
  'COMPLETED',
  'PARTIAL',
  'INSUFFICIENT_EVIDENCE',
  'FAILED',
  'CANCELLED'
])
export type TaskState = z.infer<typeof TaskStateEnum>

export const AutonomousAgentResponseSchema = z.object({
  runId: z.string().uuid(),
  createdAt: z.string(),
  elapsedMs: z.number().nonnegative(),
  mode: AgentExecutionModeEnum,
  goal: z.string(),
  taskState: TaskStateEnum.default('COMPLETED'),
  decomposedGoal: DecomposedGoalSchema.optional(),
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
  limitations: z.array(z.string())
})
export type AutonomousAgentResponse = z.infer<typeof AutonomousAgentResponseSchema>
export { GUARDIAN_ENGINE_VERSION }
