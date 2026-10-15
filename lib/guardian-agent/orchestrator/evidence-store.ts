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
  fetchRecordFromDatabase(
    certificateId: string,
    options?: { bypassCache?: boolean; ttlMs?: number }
  ): Promise<AuditableVerificationOperation | null>
  recordVerifiedOperation(op: AuditableVerificationOperation): Promise<void>
  invalidateCache(certificateId?: string): void
}

/**
 * Bounded TTL for multi-instance server cache (60 seconds).
 * Ensures multiple server instances synchronize revocation and expiration changes
 * without serving stale in-memory data indefinitely.
 */
export const DEFAULT_CACHE_TTL_MS = 60 * 1000

interface CachedEvidenceEntry {
  record: AuditableVerificationOperation
  cachedAt: number
  expiresAt: number
}

/**
 * Internal storage map for server-verified operations with TTL.
 * In production runtime, records originate strictly from database verification operations.
 */
const VERIFIED_OPERATIONS_CACHE = new Map<string, CachedEvidenceEntry>()

/**
 * Core Protected Server-Controlled Evidence Store.
 * Evaluates authenticity solely through completed, tamper-evident auditable verification records.
 */
export class ServerControlledEvidenceStore implements IServerControlledEvidenceStore {
  /**
   * Retrieves an auditable verification operation record by certificate ID.
   * Performs cryptographic hash integrity verification on retrieval and enforces TTL.
   * Never treats a stored hash as proof of certification; only as an anti-tamper check.
   */
  public getRecord(certificateId: string): AuditableVerificationOperation | null {
    if (!certificateId) return null
    const key = certificateId.trim().toUpperCase()
    const entry = VERIFIED_OPERATIONS_CACHE.get(key)
    if (!entry) return null

    // Check TTL expiration for multi-instance cache consistency
    if (Date.now() > entry.expiresAt) {
      VERIFIED_OPERATIONS_CACHE.delete(key)
      return null
    }

    const record = entry.record

    // 1. Audit record cryptographic hash integrity check (anti-tamper)
    const expectedHash = computeVerificationRecordHash(record)
    if (record.auditRecordHash !== expectedHash) {
      console.error(`[EvidenceStore] Integrity violation: Audit record hash mismatch for cert ${certificateId}`)
      VERIFIED_OPERATIONS_CACHE.delete(key)
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
   * Invalidates cached evidence records across this server instance.
   * If certificateId is provided, invalidates only that certificate; otherwise clears entire cache.
   */
  public invalidateCache(certificateId?: string): void {
    if (certificateId) {
      VERIFIED_OPERATIONS_CACHE.delete(certificateId.trim().toUpperCase())
    } else {
      VERIFIED_OPERATIONS_CACHE.clear()
    }
  }

  /**
   * Asynchronously loads a verified certification evidence record from the persistent Supabase database.
   * Validates cryptographic hash integrity upon loading and caches with bounded TTL.
   * In production, failures fail closed immediately.
   */
  public async fetchRecordFromDatabase(
    certificateId: string,
    options: { bypassCache?: boolean; ttlMs?: number } = {}
  ): Promise<AuditableVerificationOperation | null> {
    if (!certificateId) return null
    const normId = certificateId.trim().toUpperCase()

    // 1. Check multi-instance cache unless bypass requested
    if (!options.bypassCache) {
      const cached = this.getRecord(normId)
      if (cached) return cached
    }

    const hasDb = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!hasDb) {
      // In production, missing database credentials MUST fail closed!
      if (process.env.NODE_ENV === 'production') {
        return null
      }
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
        // If DB query returned no data or an error, authoritative DB is unreachable or lacks the record.
        // Stale in-memory cache must NEVER override the authoritative database! Fail closed.
        VERIFIED_OPERATIONS_CACHE.delete(normId)
        return null
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
        VERIFIED_OPERATIONS_CACHE.delete(normId)
        return null
      }

      // Authoritative database record strictly overrides any stale in-memory cached state across instances
      const ttl = options.ttlMs || DEFAULT_CACHE_TTL_MS
      const now = Date.now()
      VERIFIED_OPERATIONS_CACHE.set(normId, {
        record: Object.freeze(op),
        cachedAt: now,
        expiresAt: now + ttl
      })
      return op
    } catch (err: any) {
      console.warn(`[EvidenceStore] Database connection error: ${err.message}`)
      VERIFIED_OPERATIONS_CACHE.delete(normId)
      return null
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

    // Update local multi-instance cache with bounded TTL
    const now = Date.now()
    VERIFIED_OPERATIONS_CACHE.set(normId, {
      record: Object.freeze({ ...op }),
      cachedAt: now,
      expiresAt: now + DEFAULT_CACHE_TTL_MS
    })
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
  op: AuditableVerificationOperation,
  ttlMs: number = 3600 * 1000 // 1 hour for test fixtures
): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SecurityError: Test fixture registration is strictly prohibited in production environment.')
  }
  const key = op.certificateId.trim().toUpperCase()
  const now = Date.now()
  VERIFIED_OPERATIONS_CACHE.set(key, {
    record: Object.freeze({ ...op }),
    cachedAt: now,
    expiresAt: now + ttlMs
  })
}

/**
 * Protected internal hook to clear test operations.
 * Strictly throws if invoked in a production environment.
 */
export function _internalClearTestVerificationOperations(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SecurityError: Clearing verification operations is strictly prohibited in production environment.')
  }
  VERIFIED_OPERATIONS_CACHE.clear()
}

