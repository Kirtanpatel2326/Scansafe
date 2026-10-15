import crypto from 'node:crypto'
import {
  AuditableVerificationOperation,
  computeVerificationRecordHash,
  _internalInjectTestVerificationOperation,
  _internalClearTestVerificationOperations
} from './evidence-store'

/**
 * Isolated Test Evidence Store Harness
 *
 * This harness provides fixture registration strictly for test and benchmark runners.
 * In a production environment, invoking any method in this module immediately fails closed with SecurityError.
 */

export function assertTestEnvironment(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SecurityError: Test fixture registration is strictly prohibited in production environments.')
  }
}

export interface CreateTestOpParams {
  operationId?: string
  timestamp?: string
  verificationMethod?: 'REGISTRY_LOOKUP_AUTHENTICATED' | 'EXTERNAL_STANDARDS_VERIFIER'
  authoritativeSource?: string
  certificateId: string
  issuingAuthority?: string
  standard?: string
  evidenceUrl?: string
  associatedProductId: string
  brand?: string
  validFrom?: string
  validUntil?: string
  revocationCheckedAt?: string
  revocationStatus?: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  auditHistory?: Array<{
    timestamp: string
    action: string
    previousHash?: string
    actor?: string
    details?: string
  }>
}

/**
 * Constructs a cryptographically sealed AuditableVerificationOperation for testing.
 */
export function createTestVerificationOperation(
  params: CreateTestOpParams
): AuditableVerificationOperation {
  assertTestEnvironment()
  const nowIso = new Date().toISOString()
  const base = {
    operationId: params.operationId || `test_op_${crypto.randomUUID()}`,
    timestamp: params.timestamp || '2026-10-01T00:00:00Z',
    verificationMethod: params.verificationMethod || 'REGISTRY_LOOKUP_AUTHENTICATED',
    authoritativeSource: params.authoritativeSource || 'Authoritative Standards Registry Database',
    certificateId: params.certificateId,
    issuingAuthority: params.issuingAuthority || 'USDA National Organic Program',
    standard: params.standard || 'NOP_ORGANIC',
    evidenceUrl: params.evidenceUrl || 'https://ams.usda.gov/organic/verify/cert',
    associatedProductId: params.associatedProductId,
    brand: params.brand,
    validFrom: params.validFrom || '2026-01-01T00:00:00Z',
    validUntil: params.validUntil || '2027-01-01T00:00:00Z',
    revocationCheckedAt: params.revocationCheckedAt || nowIso,
    revocationStatus: params.revocationStatus || 'ACTIVE',
    auditHistory: params.auditHistory || []
  }
  const auditRecordHash = computeVerificationRecordHash(base)
  return { ...base, auditRecordHash }
}

/**
 * Registers one or more test verification operations into the server evidence store.
 */
export function registerTestVerificationOperations(
  ops: AuditableVerificationOperation[]
): void {
  assertTestEnvironment()
  for (const op of ops) {
    _internalInjectTestVerificationOperation(op)
  }
}

/**
 * Clears all test verification operations.
 */
export function clearTestVerificationOperations(): void {
  assertTestEnvironment()
  _internalClearTestVerificationOperations()
}

/**
 * Initializes standard baseline benchmark fixtures for test runners.
 */
export function initializeBenchmarkTestFixtures(): void {
  assertTestEnvironment()
  clearTestVerificationOperations()
  registerTestVerificationOperations([
    createTestVerificationOperation({
      certificateId: 'CERT-REG-101',
      issuingAuthority: 'Independent Standards Registry',
      standard: 'ORGANIC',
      associatedProductId: 'strictly_qualifying_1',
      evidenceUrl: 'https://registry.standards.org/verify/101',
      authoritativeSource: 'Independent Standards Registry Official Database'
    }),
    createTestVerificationOperation({
      certificateId: 'USDA-NOP-101',
      issuingAuthority: 'USDA National Organic Program',
      standard: 'ORGANIC',
      associatedProductId: 'organic_sunbutter_1',
      evidenceUrl: 'https://organic.ams.usda.gov/integrity/101',
      authoritativeSource: 'USDA National Organic Program Integrity Database'
    }),
    createTestVerificationOperation({
      certificateId: 'ACG-7881',
      issuingAuthority: 'Allergen Control Group',
      standard: 'PEANUT_FREE',
      associatedProductId: 'oat_bar_1',
      evidenceUrl: 'https://allergencircles.org/verify/7881',
      authoritativeSource: 'Allergen Control Group Official Verification Portal'
    })
  ])
}
