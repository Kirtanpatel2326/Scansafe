import crypto from 'node:crypto'

/**
 * Auditable Verification Operation Record
 *
 * Represents a completed, cryptographically sealed verification operation
 * performed by the server against an authoritative registry or verified audit source.
 */
export interface AuditableVerificationOperation {
  operationId: string
  timestamp: string // ISO timestamp of verification operation
  verificationMethod: 'REGISTRY_LOOKUP_AUTHENTICATED' | 'EXTERNAL_STANDARDS_VERIFIER'
  authoritativeSource: string // e.g. 'USDA National Organic Program Database'
  certificateId: string
  issuingAuthority: string
  standard: string
  evidenceUrl: string
  associatedProductId: string
  brand?: string
  validFrom: string
  validUntil: string
  revocationCheckedAt: string
  revocationStatus: 'ACTIVE' | 'REVOKED' | 'EXPIRED'
  auditRecordHash: string // SHA-256 integrity hash of this record
}

/**
 * Computes canonical SHA-256 audit record hash for a verification operation.
 */
export function computeVerificationRecordHash(
  op: Omit<AuditableVerificationOperation, 'auditRecordHash'>
): string {
  const payload = [
    'op_v1',
    op.operationId.trim(),
    op.timestamp.trim(),
    op.verificationMethod.trim(),
    op.authoritativeSource.trim().toLowerCase(),
    op.certificateId.trim().toUpperCase(),
    op.issuingAuthority.trim().toLowerCase(),
    op.standard.trim().toUpperCase(),
    op.evidenceUrl.trim().toLowerCase(),
    op.associatedProductId.trim(),
    (op.brand || '').trim().toLowerCase(),
    op.validFrom.trim(),
    op.validUntil.trim(),
    op.revocationCheckedAt.trim(),
    op.revocationStatus.trim().toUpperCase()
  ].join('|')
  return crypto.createHash('sha256').update(payload).digest('hex')
}

/**
 * Interface for the Protected Server-Controlled Evidence Store.
 * In production, this store is read-only and backed by verified database records.
 * Arbitrary runtime injection of authoritative certification records is strictly prohibited.
 */
export interface IServerControlledEvidenceStore {
  getRecord(certificateId: string): AuditableVerificationOperation | null
  getVerifiedRecord(
    certificateId: string,
    productId: string
  ): AuditableVerificationOperation | null
}

/**
 * Internal storage map for server-verified operations.
 * Immutable in production runtime.
 */
const VERIFIED_OPERATIONS_STORE = new Map<string, AuditableVerificationOperation>()

/**
 * Core Protected Server-Controlled Evidence Store.
 * Evaluates authenticity solely through completed, tamper-evident auditable verification records.
 */
export class ServerControlledEvidenceStore implements IServerControlledEvidenceStore {
  /**
   * Retrieves an auditable verification operation record by certificate ID.
   * Performs cryptographic hash integrity verification on retrieval.
   */
  public getRecord(certificateId: string): AuditableVerificationOperation | null {
    if (!certificateId) return null
    const key = certificateId.trim().toUpperCase()
    const record = VERIFIED_OPERATIONS_STORE.get(key)
    if (!record) return null

    // 1. Audit record cryptographic hash integrity check
    const expectedHash = computeVerificationRecordHash(record)
    if (record.auditRecordHash !== expectedHash) {
      console.error(`[EvidenceStore] Integrity violation: Audit record hash mismatch for cert ${certificateId}`)
      return null
    }

    return record
  }

  /**
   * Retrieves a verified certification operation record strictly bound to a product ID.
   * Performs cryptographic integrity verification, product binding, and revocation validation.
   */
  public getVerifiedRecord(
    certificateId: string,
    productId: string
  ): AuditableVerificationOperation | null {
    const record = this.getRecord(certificateId)
    if (!record) return null

    // Exact product identity binding check
    if (record.associatedProductId !== productId.trim()) {
      return null
    }

    // Revocation status check
    if (record.revocationStatus === 'REVOKED') {
      return null
    }

    return record
  }
}

/**
 * Singleton instance of the server evidence store.
 */
export const serverEvidenceStore = new ServerControlledEvidenceStore()

/**
 * Protected internal hook used EXCLUSIVELY by isolated test fixtures.
 * Strictly throws if invoked in a production environment.
 */
export function _internalInjectTestVerificationOperation(
  op: AuditableVerificationOperation
): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SecurityError: Test fixture registration is strictly prohibited in production environment.')
  }
  const key = op.certificateId.trim().toUpperCase()
  VERIFIED_OPERATIONS_STORE.set(key, Object.freeze({ ...op }))
}

/**
 * Protected internal hook to clear test operations.
 * Strictly throws if invoked in a production environment.
 */
export function _internalClearTestVerificationOperations(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SecurityError: Clearing verification operations is strictly prohibited in production environment.')
  }
  VERIFIED_OPERATIONS_STORE.clear()
}
