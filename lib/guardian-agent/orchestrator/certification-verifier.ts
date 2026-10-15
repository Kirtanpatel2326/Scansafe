import crypto from 'node:crypto'
import {
  ClaimedCertification,
  ProductEvidence
} from './types'
import { serverEvidenceStore } from './evidence-store'

/**
 * Server-Controlled Certification Verification Service
 * ScanSafe Guardian AI — October 14 Trust Boundary Architecture
 *
 * Rules & Invariants:
 * 1. An approved URL hostname alone NEVER proves that the referenced certificate exists or is valid.
 * 2. A registryConfirmed Boolean alone is NOT sufficient proof of authentication.
 * 3. All public API requests are treated as untrusted; client cannot self-assign elevated certification status.
 * 4. Genuine certification authentication requires either:
 *    - A cryptographically verified server attestation token signed by server-side secrets.
 *    - An explicit match in the server's authoritative registry database.
 * 5. Expired, revoked, future-dated, or mismatched records fail closed as NEEDS_REVIEW.
 * 6. scansafe.co.in is removed from the independent certification registry allowlist.
 */

export const APPROVED_REGISTRY_DOMAINS = [
  'ams.usda.gov',
  'usda.gov',
  'ecocert.com',
  'gfco.org',
  'beyondceliac.org',
  'celiac.org',
  'allergencircles.org',
  'allergencontrol.com',
  'sqfi.com',
  'brcgs.com',
  'vegansociety.com',
  'vegan.org',
  'v-label.com',
  'standards.org',
  'ccof.org',
  'qai-inc.com',
  'soilassociation.org',
  'demeter.net'
  // scansafe.co.in strictly removed per security boundary policy
]

export const APPROVED_VERIFICATION_METHODS = new Set([
  'REGISTRY_LOOKUP_AUTHENTICATED',
  'EXTERNAL_STANDARDS_VERIFIER'
])

export const AUTHORITATIVE_REVOCATION_REGISTRY = new Set<string>([
  'REVOKED-7881',
  'REVOKED-NOP-001',
  'REVOKED-GFCO-999',
  'REVOKED-ECO-123'
])

export function isCertificateRevoked(certId?: string): boolean {
  if (!certId) return false
  return AUTHORITATIVE_REVOCATION_REGISTRY.has(certId.trim().toUpperCase())
}

export const DEPRECATED_FALLBACK_STRING = Buffer.from(
  'c2NhbnNhZmUtZ3VhcmRpYW4taW50ZXJuYWwtYXR0ZXN0YXRpb24tc2VjcmV0LTIwMjY=',
  'base64'
).toString('utf8')
export const DEPRECATED_FALLBACK_SECRET = DEPRECATED_FALLBACK_STRING

export const MAX_ATTESTATION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000 // 30 days maximum
export const DEFAULT_ATTESTATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
export const MIN_ATTESTATION_LIFETIME_MS = 60 * 1000 // 1 minute
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000 // 5 minutes

export interface KeyValidationResult {
  valid: boolean
  encoding?: 'hex' | 'base64' | 'utf8'
  bitLength?: number
  reason?: string
}

/**
 * Generates a cryptographically secure 256-bit (32-byte) attestation secret.
 */
export function generate256BitAttestationKey(encoding: 'hex' | 'base64' = 'hex'): string {
  return crypto.randomBytes(32).toString(encoding)
}

/**
 * Validates whether a secret key meets strict 256-bit cryptographic requirements:
 * 1. Must be a valid string of minimum 32 bytes (256 bits).
 * 2. Strictly rejects known deprecated or fallback secrets.
 * 3. High-entropy check: requires at least 8 unique characters, preventing repeating or trivial keys.
 *
 * Key Encoding: UTF-8 string or 32+ byte hexadecimal/base64 representation.
 * Key Rotation: Supported across active key (GUARDIAN_ATTESTATION_KID) and previous key (GUARDIAN_ATTESTATION_SECRET_PREVIOUS).
 * Key Expiry: Enforced per-token through ISO expiresAt timestamp (max 30 days).
 */
export function validateAttestationKey(secret?: string | null): KeyValidationResult {
  if (!secret || typeof secret !== 'string') {
    return { valid: false, reason: 'Key is missing or not a string' }
  }
  const trimmed = secret.trim()
  if (trimmed === DEPRECATED_FALLBACK_SECRET) {
    return { valid: false, reason: 'Deprecated fallback secret is strictly prohibited' }
  }

  // Detect encoding and bit-length
  let encoding: 'hex' | 'base64' | 'utf8' = 'utf8'
  let byteLength = Buffer.byteLength(trimmed, 'utf8')

  const isHex = /^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0
  if (isHex && trimmed.length >= 64) {
    encoding = 'hex'
    byteLength = trimmed.length / 2
  } else if (/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed) && trimmed.length >= 43) {
    try {
      const decoded = Buffer.from(trimmed, 'base64')
      if (decoded.length >= 32) {
        encoding = 'base64'
        byteLength = decoded.length
      }
    } catch {
      // fallback to utf8
    }
  }

  const bitLength = byteLength * 8
  if (bitLength < 256) {
    return {
      valid: false,
      reason: `Key strength (${bitLength} bits) is below the required 256-bit minimum (32 bytes).`
    }
  }

  // High-entropy validation: require at least 8 distinct characters
  const uniqueChars = new Set(trimmed)
  if (uniqueChars.size < 8) {
    return {
      valid: false,
      reason: `Key entropy is insufficient: contains only ${uniqueChars.size} unique characters (minimum 8 required).`
    }
  }

  // Pattern repetition check (e.g. repeating patterns "12121212..." or "abcdefghabcdefgh...")
  const half = Math.floor(trimmed.length / 2)
  if (trimmed.length >= 16 && trimmed.slice(0, half) === trimmed.slice(half, half * 2)) {
    return {
      valid: false,
      reason: 'Key contains repeating pattern and fails entropy verification.'
    }
  }

  return { valid: true, encoding, bitLength }
}

export function isValidAttestationSecret(secret?: string | null): boolean {
  return validateAttestationKey(secret).valid
}

/**
 * Retrieves the active server attestation signing key.
 * Throws if the key is missing, below 256 bits, or uses the blacklisted fallback secret.
 */
export function getActiveAttestationSecret(): { secret: string; kid: string } {
  const secret = process.env.GUARDIAN_ATTESTATION_SECRET
  const validation = validateAttestationKey(secret)
  if (!validation.valid) {
    throw new Error(
      `Server attestation signing key is not configured or fails cryptographic strength requirements (minimum 256 bits, non-deprecated): ${validation.reason || ''}`
    )
  }
  const kid = (process.env.GUARDIAN_ATTESTATION_KID || 'k1').trim()
  if (!/^[a-zA-Z0-9_\-]{1,64}$/.test(kid)) {
    throw new Error(`Invalid key identifier (kid): "${kid}". Must match ^[a-zA-Z0-9_-]{1,64}$`)
  }
  return { secret: secret!.trim(), kid }
}

/**
 * Generates a server-side HMAC-SHA256 attestation token for an authenticated certificate.
 * Format: v1.<kid>.<expiresAt>.<hmacHex>
 * Canonical payload: v1|<kid>|<expiresAt>|<productId>|<associatedProductId>|<certificationBody>|<certificationId>|<standard>|<evidenceUrl>|<validUntil>|<verifiedAt>
 */
export function generateServerAttestation(
  cert: {
    certificationBody: string
    certificationId?: string
    associatedProductId: string
    standard?: string
    evidenceUrl?: string
    validUntil?: string
    verifiedAt?: string
    attestationKid?: string
    attestationExpiresAt?: string
  },
  productId: string
): string {
  const { secret, kid: defaultKid } = getActiveAttestationSecret()
  const kid = cert.attestationKid ? cert.attestationKid.trim() : defaultKid
  if (!/^[a-zA-Z0-9_\-]{1,64}$/.test(kid)) {
    throw new Error(`Invalid key identifier (kid): "${kid}"`)
  }

  const now = Date.now()
  let expiresAt: string
  if (cert.attestationExpiresAt) {
    const customExpires = cert.attestationExpiresAt.trim()
    const expNum = Number(customExpires)
    const expiresMs = (!Number.isNaN(expNum) && Number.isFinite(expNum))
      ? (expNum > 1e11 ? expNum : expNum * 1000)
      : Date.parse(customExpires)

    if (Number.isNaN(expiresMs)) {
      throw new Error(`Invalid attestation expiration date: "${customExpires}"`)
    }
    const lifetimeMs = expiresMs - now
    if (lifetimeMs > MAX_ATTESTATION_LIFETIME_MS) {
      throw new Error(`Attestation lifetime exceeds maximum allowable limit of 30 days (${Math.round(lifetimeMs / 86400000)} days requested)`)
    }
    expiresAt = new Date(expiresMs).toISOString()
  } else {
    expiresAt = new Date(now + DEFAULT_ATTESTATION_LIFETIME_MS).toISOString()
  }

  const payload = [
    'v1',
    kid,
    expiresAt,
    productId.trim(),
    cert.associatedProductId.trim(),
    cert.certificationBody.trim().toLowerCase(),
    (cert.certificationId || '').trim().toLowerCase(),
    (cert.standard || '').trim().toLowerCase(),
    (cert.evidenceUrl || '').trim(),
    (cert.validUntil || '').trim(),
    (cert.verifiedAt || '').trim()
  ].join('|')

  const hmacHex = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `v1.${kid}.${expiresAt}.${hmacHex}`
}

/**
 * Cryptographically verifies that a certificate's attestation token was generated by
 * the server-controlled verification service for the exact product specified.
 * Supports v1 versioned tokens (v1.<kid>.<expiresAt>.<hmacHex>) with key rotation and expiration,
 * and timing-safe comparison.
 */
export function verifyServerAttestation(
  cert: ClaimedCertification,
  productId: string
): boolean {
  if (!cert.serverAttestationToken || typeof cert.serverAttestationToken !== 'string') {
    return false
  }

  const token = cert.serverAttestationToken.trim()

  // 1. Versioned v1 token: v1.<kid>.<expiresAt>.<hmacHex>
  if (token.startsWith('v1.')) {
    const firstDot = token.indexOf('.')
    const secondDot = token.indexOf('.', firstDot + 1)
    const lastDot = token.lastIndexOf('.')

    if (secondDot === -1 || lastDot <= secondDot) {
      return false
    }

    const kid = token.slice(firstDot + 1, secondDot).trim()
    const expiresAt = token.slice(secondDot + 1, lastDot).trim()
    const tokenHmac = token.slice(lastDot + 1).trim()

    // Key identifier format check
    if (!/^[a-zA-Z0-9_\-]{1,64}$/.test(kid)) {
      return false
    }

    // Verify token expiration & maximum lifetime range
    const expNum = Number(expiresAt)
    let expiresMs: number
    if (!Number.isNaN(expNum) && Number.isFinite(expNum)) {
      expiresMs = expNum > 1e11 ? expNum : expNum * 1000
    } else {
      expiresMs = Date.parse(expiresAt)
    }

    if (Number.isNaN(expiresMs)) {
      return false
    }

    const now = Date.now()
    // Rejection of expired tokens (with 5 min clock skew tolerance)
    if (expiresMs < now - MAX_CLOCK_SKEW_MS) {
      return false
    }

    // Rejection of excessive lifetimes (> 30 days + clock skew)
    if (expiresMs > now + MAX_ATTESTATION_LIFETIME_MS + MAX_CLOCK_SKEW_MS) {
      return false
    }

    // Key lookup & rotation support
    const activeKid = (process.env.GUARDIAN_ATTESTATION_KID || 'k1').trim()
    const activeSecret = process.env.GUARDIAN_ATTESTATION_SECRET
    const prevKid = (process.env.GUARDIAN_ATTESTATION_PREVIOUS_KID || 'k0').trim()
    const prevSecret = process.env.GUARDIAN_ATTESTATION_SECRET_PREVIOUS

    let secretToUse: string | undefined
    if (kid === activeKid && isValidAttestationSecret(activeSecret)) {
      secretToUse = activeSecret!.trim()
    } else if (kid === prevKid && isValidAttestationSecret(prevSecret)) {
      secretToUse = prevSecret!.trim()
    } else {
      return false
    }

    const payload = [
      'v1',
      kid,
      expiresAt,
      productId.trim(),
      cert.associatedProductId.trim(),
      cert.certificationBody.trim().toLowerCase(),
      (cert.certificationId || '').trim().toLowerCase(),
      (cert.standard || '').trim().toLowerCase(),
      (cert.evidenceUrl || '').trim(),
      (cert.validUntil || '').trim(),
      (cert.verifiedAt || '').trim()
    ].join('|')

    try {
      const expectedHmac = crypto.createHmac('sha256', secretToUse).update(payload).digest('hex')
      if (expectedHmac.length !== tokenHmac.length) {
        return false
      }
      return crypto.timingSafeEqual(
        Buffer.from(expectedHmac, 'utf8'),
        Buffer.from(tokenHmac, 'utf8')
      )
    } catch {
      return false
    }
  }

  // 2. Legacy unversioned tokens strictly rejected (all legitimate tokens must be versioned v1)
  return false
}

/**
 * Evaluates a claimed certificate against all trust-boundary rules.
 * Fails closed if any check fails or authentication cannot be confirmed.
 */
export function verifyClaimedCertification(
  record: ClaimedCertification,
  product: ProductEvidence
): {
  authenticated: boolean
  invalidationReason?: string
} {
  // 1. Associated product ID identity check
  if (record.associatedProductId !== product.id) {
    return {
      authenticated: false,
      invalidationReason: `Certification identity mismatch: Certificate from ${record.certificationBody} (ID: ${record.certificationId || 'N/A'}) was issued for product identity "${record.associatedProductId}", which does not match candidate product "${product.id}".`
    }
  }

  // 2. Brand identity binding check (if both certificate and product specify a brand)
  if (record.brand && product.brand) {
    const recBrandNorm = record.brand.trim().toLowerCase()
    const prodBrandNorm = product.brand.trim().toLowerCase()
    if (!recBrandNorm.includes(prodBrandNorm) && !prodBrandNorm.includes(recBrandNorm)) {
      return {
        authenticated: false,
        invalidationReason: `Brand identity mismatch: Certificate from ${record.certificationBody} was issued for brand "${record.brand}", which does not match product brand "${product.brand}".`
      }
    }
  }

  // 3. Revocation status check (explicit flag, status enum, and authoritative revocation registry)
  if (record.isRevoked || record.status === 'REVOKED' || isCertificateRevoked(record.certificationId)) {
    return {
      authenticated: false,
      invalidationReason: `Revoked certification: Certificate from ${record.certificationBody} (ID: ${record.certificationId || 'N/A'}) has been revoked by issuing authority.`
    }
  }

  // 4. Active status check & expiration
  if (record.status === 'EXPIRED') {
    return {
      authenticated: false,
      invalidationReason: `Expired certification: Certificate from ${record.certificationBody} (ID: ${record.certificationId || 'N/A'}) has expired; cannot establish active compliance.`
    }
  }
  if (record.status !== 'ACTIVE') {
    return {
      authenticated: false,
      invalidationReason: `Unverified certification status: Certificate from ${record.certificationBody} status is "${record.status}"; not authenticated as active.`
    }
  }

  // 5. Validity period bounds (validFrom and validUntil)
  if (record.validFrom) {
    const validFromMs = Date.parse(record.validFrom)
    if (!Number.isNaN(validFromMs) && validFromMs > Date.now()) {
      return {
        authenticated: false,
        invalidationReason: `Certificate validity period not yet started: Certificate from ${record.certificationBody} is only valid starting ${record.validFrom}.`
      }
    }
  }
  if (record.validUntil) {
    const validUntilMs = Date.parse(record.validUntil)
    if (!Number.isNaN(validUntilMs) && validUntilMs < Date.now()) {
      return {
        authenticated: false,
        invalidationReason: `Expired certificate validity: Certificate from ${record.certificationBody} expired on ${record.validUntil}.`
      }
    }
  }

  // 6. Verification timestamp validation (missing, unparseable, or future-dated)
  if (!record.verifiedAt || !record.verifiedAt.trim()) {
    return {
      authenticated: false,
      invalidationReason: `Missing verification timestamp: Certificate from ${record.certificationBody} lacks a verified timestamp.`
    }
  }
  const verifiedMs = Date.parse(record.verifiedAt)
  if (Number.isNaN(verifiedMs)) {
    return {
      authenticated: false,
      invalidationReason: `Invalid verification timestamp: Certificate from ${record.certificationBody} contains unparseable timestamp "${record.verifiedAt}".`
    }
  }
  // Reject future timestamps, allowing up to 60s for clock drift
  if (verifiedMs > Date.now() + 60000) {
    return {
      authenticated: false,
      invalidationReason: `Future-dated verification timestamp: Certificate from ${record.certificationBody} contains future timestamp "${record.verifiedAt}".`
    }
  }

  // 7. Provenance level check (Strictly INDEPENDENTLY_AUTHENTICATED_CERTIFICATION)
  if (record.provenanceLevel === 'DOCUMENTED_THIRD_PARTY_CLAIM') {
    return {
      authenticated: false,
      invalidationReason: `Documented third-party claim without authentication: Record from ${record.certificationBody} is marked "DOCUMENTED_THIRD_PARTY_CLAIM", which cannot be equated with independently authenticated certification.`
    }
  }
  if (record.provenanceLevel !== 'INDEPENDENTLY_AUTHENTICATED_CERTIFICATION') {
    return {
      authenticated: false,
      invalidationReason: `Manufacturer/unverified claim only: Record from ${record.certificationBody} is marked "${record.provenanceLevel}" without independent registry authentication.`
    }
  }

  // 8. Explicitly approved authentication methods backed by real verification evidence
  if (!APPROVED_VERIFICATION_METHODS.has(record.verificationMethod)) {
    return {
      authenticated: false,
      invalidationReason: `Unsupported verification method: Claim from ${record.certificationBody} used "${record.verificationMethod}", but only explicitly approved methods (REGISTRY_LOOKUP_AUTHENTICATED, EXTERNAL_STANDARDS_VERIFIER) backed by real verification evidence are accepted.`
    }
  }

  // 9. Server-controlled registry confirmation flag
  if (!record.registryConfirmed) {
    return {
      authenticated: false,
      invalidationReason: `ACTIVE status without registry confirmation: Certificate from ${record.certificationBody} claims active status but lacks server-controlled registry confirmation.`
    }
  }

  // 10. Evidence URL & Authoritative Registry Domain Validation
  if (!record.evidenceUrl || !record.evidenceUrl.trim()) {
    return {
      authenticated: false,
      invalidationReason: `Missing certification source URL: Claimed certificate from ${record.certificationBody} lacks verifiable evidence proof URL.`
    }
  }
  try {
    const parsedUrl = new URL(record.evidenceUrl)
    const hostname = parsedUrl.hostname.toLowerCase()
    const isApproved = APPROVED_REGISTRY_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    )
    if (!isApproved) {
      return {
        authenticated: false,
        invalidationReason: `Forged or unapproved registry URL: Certificate proof URL "${record.evidenceUrl}" (host: ${hostname}) is not from an approved authoritative registry domain.`
      }
    }
  } catch {
    return {
      authenticated: false,
      invalidationReason: `Malformed certification proof URL: Certificate proof URL "${record.evidenceUrl}" is invalid.`
    }
  }

  // 11. Internally generated evidence verification operation check:
  // Community OCR or unverified internal cache records without a completed verification operation cannot establish authenticated certification
  if (product.verificationStatus === 'UNVERIFIED_COMMUNITY_OCR') {
    return {
      authenticated: false,
      invalidationReason: `Internally generated evidence without completed verification operation: Product verificationStatus is "${product.verificationStatus}"; unverified community OCR cannot establish authenticated certification without documented verification.`
    }
  }

  // 12. CRITICAL TRUST BOUNDARY CHECK:
  // A registryConfirmed boolean or approved URL hostname alone is NOT sufficient proof of authentication.
  // Requirement 6: A valid internal signature cannot by itself establish independent certification authenticity.
  // Requirement 2: Independently authenticated records must originate from a completed, auditable verification operation.
  // Requirement 5: Bind authenticated certification status to product identity, issuing authority, applicable standard,
  // evidence URL, validity dates, revocation status and a real verification record.
  const verifiedOp = record.certificationId
    ? serverEvidenceStore.getRecord(record.certificationId.trim().toUpperCase())
    : null

  if (!verifiedOp) {
    return {
      authenticated: false,
      invalidationReason: `Authoritative registry verification unavailable: Certificate ID "${record.certificationId || 'N/A'}" lacks a completed, auditable verification operation record in the server evidence store. An approved URL hostname alone does not prove certificate existence or validity. An internal attestation signature cannot by itself establish independent certification authenticity without an auditable verification record.`
    }
  }

  // 1. Revocation check on verification operation record
  if (verifiedOp.revocationStatus === 'REVOKED' || isCertificateRevoked(verifiedOp.certificateId)) {
    return {
      authenticated: false,
      invalidationReason: `Revoked certification in authoritative registry: Certificate ID "${record.certificationId}" has been revoked by issuing authority.`
    }
  }

  // 2. Expiration check on verification operation record
  if (verifiedOp.revocationStatus === 'EXPIRED') {
    return {
      authenticated: false,
      invalidationReason: `Expired certification in authoritative registry: Certificate ID "${record.certificationId}" is marked expired.`
    }
  }
  if (verifiedOp.validUntil) {
    const untilMs = Date.parse(verifiedOp.validUntil)
    if (!Number.isNaN(untilMs) && untilMs < Date.now()) {
      return {
        authenticated: false,
        invalidationReason: `Expired certification in authoritative registry: Certificate ID "${record.certificationId}" expired on ${verifiedOp.validUntil}.`
      }
    }
  }

  // 3. Product identity binding
  if (verifiedOp.associatedProductId !== product.id || verifiedOp.associatedProductId !== record.associatedProductId) {
    return {
      authenticated: false,
      invalidationReason: `Product identity mismatch in authoritative registry: Certificate ID "${record.certificationId}" was issued for product identity "${verifiedOp.associatedProductId}", which does not match candidate product "${product.id}".`
    }
  }

  // 4. Standard binding
  if (record.standard && verifiedOp.standard) {
    const regStd = verifiedOp.standard.trim().toLowerCase().replace(/[-_ ]/g, '')
    const recStd = record.standard.trim().toLowerCase().replace(/[-_ ]/g, '')
    if (regStd !== recStd && !regStd.includes(recStd) && !recStd.includes(regStd)) {
      return {
        authenticated: false,
        invalidationReason: `Standard mismatch in authoritative registry: Certificate ID "${record.certificationId}" is registered for standard "${verifiedOp.standard}", which does not match claimed standard "${record.standard}".`
      }
    }
  }

  // 5. Evidence URL binding
  if (record.evidenceUrl && verifiedOp.evidenceUrl) {
    if (record.evidenceUrl.trim().toLowerCase() !== verifiedOp.evidenceUrl.trim().toLowerCase()) {
      return {
        authenticated: false,
        invalidationReason: `Evidence URL mismatch in authoritative registry: Claimed evidence URL "${record.evidenceUrl}" does not match authoritative registry proof URL "${verifiedOp.evidenceUrl}" for certificate ID "${record.certificationId}".`
      }
    }
  }

  // 6. Issuing authority binding
  if (record.certificationBody && verifiedOp.issuingAuthority) {
    const regBody = verifiedOp.issuingAuthority.trim().toLowerCase()
    const recBody = record.certificationBody.trim().toLowerCase()
    if (regBody !== recBody && !regBody.includes(recBody) && !recBody.includes(regBody)) {
      return {
        authenticated: false,
        invalidationReason: `Issuing authority mismatch in authoritative registry: Certificate ID "${record.certificationId}" was issued by "${verifiedOp.issuingAuthority}", which does not match claimed authority "${record.certificationBody}".`
      }
    }
  }

  // 7. Brand binding (if both specify)
  if (verifiedOp.brand && product.brand) {
    const regBrand = verifiedOp.brand.trim().toLowerCase()
    const prodBrand = product.brand.trim().toLowerCase()
    if (!regBrand.includes(prodBrand) && !prodBrand.includes(regBrand)) {
      return {
        authenticated: false,
        invalidationReason: `Brand identity mismatch in authoritative registry: Certificate ID "${record.certificationId}" was registered for brand "${verifiedOp.brand}", which does not match product brand "${product.brand}".`
      }
    }
  }

  // 8. Cryptographic attestation token check if token is present
  if (record.serverAttestationToken) {
    const hasValidAttestation = verifyServerAttestation(record, product.id)
    if (!hasValidAttestation) {
      return {
        authenticated: false,
        invalidationReason: `Invalid cryptographic attestation token: Certificate ID "${record.certificationId}" carries an invalid or expired server attestation signature.`
      }
    }
  }

  // All checks passed!
  return {
    authenticated: true
  }
}
