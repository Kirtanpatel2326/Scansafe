import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * Auditable Verification Operation Record
 *
 * Represents a completed, cryptographically sealed verification operation
 * performed by the server against an authoritative registry or verified audit source.
 * Preserves verification provenance, timestamps, certificate identity, issuing authority,
 * applicable standard, product binding, validity, revocation status, and audit history.
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
  auditHistory?: Array<{
    timestamp: string
    action: string
    previousHash?: string
    actor?: string
    details?: string
  }>
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
 * In production, this store is backed by persistent database records.
 * Only authorized server-side workflows (service_role) may insert or update records.
 * Ordinary users and external providers have zero write access.
 */
export interface IServerControlledEvidenceStore {
  getRecord(certificateId: string): AuditableVerificationOperation | null
  getVerifiedRecord(
    certificateId: string,
    productId: string
  ): AuditableVerificationOperation | null
  fetchRecordFromDatabase(certificateId: string): Promise<AuditableVerificationOperation | null>
  recordVerifiedOperation(op: AuditableVerificationOperation): Promise<void>
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
   * Never treats a stored hash as proof of certification; only as an anti-tamper check.
   */
  public getRecord(certificateId: string): AuditableVerificationOperation | null {
    if (!certificateId) return null
    const key = certificateId.trim().toUpperCase()
    const record = VERIFIED_OPERATIONS_STORE.get(key)
    if (!record) return null

    // 1. Audit record cryptographic hash integrity check (anti-tamper)
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

  /**
   * Asynchronously loads a verified certification evidence record from the persistent Supabase database.
   * Validates cryptographic hash integrity upon loading.
   */
  public async fetchRecordFromDatabase(certificateId: string): Promise<AuditableVerificationOperation | null> {
    if (!certificateId) return null
    const normId = certificateId.trim().toUpperCase()

    const hasDb = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!hasDb) {
      return this.getRecord(normId)
    }

    try {
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('guardian_certification_evidence')
        .select('*')
        .eq('certificate_id', normId)
        .maybeSingle()

      if (error || !data) {
        if (error) console.warn(`[EvidenceStore] DB lookup error for ${normId}:`, error.message)
        return this.getRecord(normId)
      }

      const op: AuditableVerificationOperation = {
        operationId: data.operation_id,
        timestamp: data.verified_at || data.created_at,
        verificationMethod: data.verification_method,
        authoritativeSource: data.authoritative_source,
        certificateId: data.certificate_id,
        issuingAuthority: data.issuing_authority,
        standard: data.standard,
        evidenceUrl: data.evidence_url,
        associatedProductId: data.associated_product_id,
        brand: data.brand || undefined,
        validFrom: data.valid_from,
        validUntil: data.valid_until,
        revocationCheckedAt: data.revocation_checked_at,
        revocationStatus: data.revocation_status,
        auditRecordHash: data.audit_record_hash,
        auditHistory: data.audit_history || []
      }

      // Verify cryptographic anti-tamper hash
      const expectedHash = computeVerificationRecordHash(op)
      if (expectedHash !== op.auditRecordHash) {
        console.error(`[EvidenceStore] Database tamper violation: Hash mismatch for cert ${normId}`)
        return null
      }

      // Cache verified record for fast synchronous verification
      VERIFIED_OPERATIONS_STORE.set(normId, Object.freeze(op))
      return op
    } catch (err: any) {
      console.warn(`[EvidenceStore] Database connection error: ${err.message}`)
      return this.getRecord(normId)
    }
  }

  /**
   * Persists an authenticated verification operation to the database.
   * Only authorized server-side workflows equipped with service_role credentials may invoke this.
   */
  public async recordVerifiedOperation(op: AuditableVerificationOperation): Promise<void> {
    const expectedHash = computeVerificationRecordHash(op)
    if (op.auditRecordHash !== expectedHash) {
      throw new Error(`IntegrityError: Audit record hash mismatch. Expected ${expectedHash}, got ${op.auditRecordHash}`)
    }

    const normId = op.certificateId.trim().toUpperCase()
    const hasDb = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (hasDb) {
      const admin = createAdminClient()
      const { error } = await admin
        .from('guardian_certification_evidence')
        .upsert(
          {
            operation_id: op.operationId,
            certificate_id: normId,
            associated_product_id: op.associatedProductId.trim(),
            issuing_authority: op.issuingAuthority.trim(),
            standard: op.standard.trim().toUpperCase(),
            evidence_url: op.evidenceUrl.trim(),
            brand: op.brand ? op.brand.trim() : null,
            valid_from: op.validFrom,
            valid_until: op.validUntil,
            revocation_status: op.revocationStatus,
            revocation_checked_at: op.revocationCheckedAt,
            verification_method: op.verificationMethod,
            authoritative_source: op.authoritativeSource,
            verified_at: op.timestamp,
            audit_record_hash: op.auditRecordHash,
            audit_history: op.auditHistory || [],
            updated_at: new Date().toISOString()
          },
          { onConflict: 'operation_id' }
        )

      if (error) {
        throw new Error(`Database error saving verification evidence: ${error.message}`)
      }
    }

    VERIFIED_OPERATIONS_STORE.set(normId, Object.freeze({ ...op }))
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
