import { NextRequest, NextResponse } from 'next/server'
import {
  serverEvidenceStore,
  computeVerificationRecordHash
} from '@/lib/guardian-agent/orchestrator/evidence-store'
import { checkGuardianRateLimitShared } from '@/lib/guardian-security'
import { isCertificateRevoked } from '@/lib/guardian-agent/orchestrator/certification-verifier'

/**
 * Minimal clock-skew tolerance window for verification and revocation timestamps.
 * Prevents future-dated timestamps while allowing up to 5 minutes of legitimate clock drift.
 */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Public Controlled Read-Only Certification Verification Endpoint.
 * 
 * Exposes ONLY safe, deliberately public verification fields:
 * - certificateId
 * - associatedProductId
 * - issuingAuthority
 * - standard
 * - evidenceUrl
 * - brand
 * - validFrom
 * - validUntil
 * - revocationStatus
 * - revocationCheckedAt
 * - verificationMethod
 * - verifiedAt
 * - verificationStatus
 * - isCurrentlyValid
 * - recordType
 * - statusReason
 * 
 * NEVER exposes internal fields:
 * - auditRecordHash (internal tamper-evident cryptographic hash)
 * - auditHistory (internal server operational traces & actor IDs)
 * - operationId (internal server operation identifier)
 * - id (internal database primary key UUID)
 */
export async function GET(request: NextRequest) {
  // Shared distributed rate limiting (120 req/min per IP to accommodate product grid verification)
  const rateLimitRes = await checkGuardianRateLimitShared(request, undefined, {
    routeLabel: 'guardian-cert-public',
    maxRequests: 120
  })
  if (rateLimitRes) return rateLimitRes

  const { searchParams } = new URL(request.url)
  const certificateId = searchParams.get('certificateId')?.trim()
  const productId = searchParams.get('productId')?.trim()
  const barcode = searchParams.get('barcode')?.trim()
  const manufacturer = searchParams.get('manufacturer')?.trim() || searchParams.get('brand')?.trim()
  const issuingAuthority = searchParams.get('issuingAuthority')?.trim()
  const standard = searchParams.get('standard')?.trim()

  if (!certificateId || certificateId.length > 128) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing mandatory query parameter: certificateId (maximum 128 characters allowed)' },
      { status: 400 }
    )
  }

  const boundedParams: Array<[string, string | undefined]> = [
    ['productId', productId],
    ['barcode', barcode],
    ['manufacturer', manufacturer],
    ['issuingAuthority', issuingAuthority],
    ['standard', standard]
  ]

  for (const [paramName, paramVal] of boundedParams) {
    if (paramVal && paramVal.length > 128) {
      return NextResponse.json(
        { success: false, error: `Invalid query parameter: ${paramName} exceeds maximum allowable length of 128 characters` },
        { status: 400 }
      )
    }
  }

  try {
    // 4. Authoritative fresh lookup bypassing any stale in-memory cached state
    const record = await serverEvidenceStore.fetchRecordFromDatabase(certificateId, { bypassCache: true })

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: `No authoritative verification evidence found for certificate ID: ${certificateId}`
        },
        { status: 404 }
      )
    }

    // 1 & 2. Strictly validate all timestamps: validFrom, validUntil, verifiedAt (record.timestamp), revocationCheckedAt
    const now = Date.now()
    const validFromMs = record.validFrom ? Date.parse(record.validFrom) : NaN
    const validUntilMs = record.validUntil ? Date.parse(record.validUntil) : NaN
    const verifiedAtMs = record.timestamp ? Date.parse(record.timestamp) : NaN
    const revCheckedMs = record.revocationCheckedAt ? Date.parse(record.revocationCheckedAt) : NaN

    const isMalformedDates = Number.isNaN(validFromMs) || Number.isNaN(validUntilMs) || Number.isNaN(verifiedAtMs)
    // 1. Reject contradictory validity dates (validFrom later than validUntil)
    const isContradictoryDates = !Number.isNaN(validFromMs) && !Number.isNaN(validUntilMs) && validFromMs > validUntilMs

    // 2. Reject future verification and revocation-check timestamps beyond documented minimal clock skew (5 min)
    const isFutureTimestamps =
      (!Number.isNaN(verifiedAtMs) && verifiedAtMs > now + MAX_CLOCK_SKEW_MS) ||
      (!Number.isNaN(revCheckedMs) && revCheckedMs > now + MAX_CLOCK_SKEW_MS)

    const isMissingRevocation = Number.isNaN(revCheckedMs)

    // Revocation and expiration evaluations
    const isRevoked = record.revocationStatus === 'REVOKED' || isCertificateRevoked(record.certificateId)
    const isExpired = record.revocationStatus === 'EXPIRED' || (!Number.isNaN(validUntilMs) && validUntilMs < now)
    const isNotYetValid = !Number.isNaN(validFromMs) && validFromMs > now
    const isStale = isMissingRevocation || (now - revCheckedMs > 30 * 24 * 60 * 60 * 1000)

    // 6. Confirm authenticated status is supported by an authorized completed verification operation
    const hasAuthorizedMethod =
      record.verificationMethod === 'REGISTRY_LOOKUP_AUTHENTICATED' ||
      record.verificationMethod === 'EXTERNAL_STANDARDS_VERIFIER'
    const hasAuthorizedSource = Boolean(record.authoritativeSource && record.authoritativeSource.trim().length > 0)
    const hasValidOperationId = Boolean(record.operationId && record.operationId.trim().length > 0)
    const expectedHash = computeVerificationRecordHash(record)
    const isIntegrityVerified = record.auditRecordHash === expectedHash
    const isAuthorizedOperation = hasAuthorizedMethod && hasAuthorizedSource && hasValidOperationId && isIntegrityVerified

    // 3. Strict matches for user-requested product identity, manufacturer, issuing authority, and standard,
    // including when corresponding stored field is missing
    const isProductMismatch = Boolean(
      productId && (!record.associatedProductId || record.associatedProductId.trim() !== productId)
    )
    const isBarcodeMismatch = Boolean(
      barcode && (!record.associatedProductId || record.associatedProductId.trim() !== barcode)
    )
    const isManufacturerMismatch = Boolean(
      manufacturer &&
      (!record.brand || record.brand.toLowerCase().trim() !== manufacturer.toLowerCase().trim())
    )
    const isAuthorityMismatch = Boolean(
      issuingAuthority &&
      (!record.issuingAuthority || record.issuingAuthority.toLowerCase().trim() !== issuingAuthority.toLowerCase().trim())
    )
    const isStandardMismatch = Boolean(
      standard &&
      (!record.standard || record.standard.toLowerCase().trim() !== standard.toLowerCase().trim())
    )

    let verificationStatus:
      | 'AUTHENTICATED_VALID'
      | 'REVOKED'
      | 'EXPIRED'
      | 'NOT_YET_VALID'
      | 'STALE_VERIFICATION'
      | 'MALFORMED_TIMESTAMPS'
      | 'CONTRADICTORY_VALIDITY_DATES'
      | 'FUTURE_DATED_VERIFICATION'
      | 'UNAUTHORIZED_VERIFICATION_OPERATION'
      | 'PRODUCT_MISMATCH'
      | 'MANUFACTURER_MISMATCH'
      | 'ISSUING_AUTHORITY_MISMATCH'
      | 'STANDARD_MISMATCH' = 'AUTHENTICATED_VALID'

    let statusReason = 'Certificate is currently authenticated, active, and within its verified validity window.'
    let recordType: 'CURRENT_AUTHORITATIVE_RECORD' | 'HISTORICAL_EVIDENCE_RECORD' = 'CURRENT_AUTHORITATIVE_RECORD'

    if (isRevoked) {
      verificationStatus = 'REVOKED'
      recordType = 'HISTORICAL_EVIDENCE_RECORD'
      statusReason = 'Certificate has been revoked by issuing authority and is retained as a historical evidence record only.'
    } else if (isMalformedDates) {
      verificationStatus = 'MALFORMED_TIMESTAMPS'
      recordType = 'HISTORICAL_EVIDENCE_RECORD'
      statusReason = 'Certificate evidence contains missing or invalid timestamp specifications.'
    } else if (isContradictoryDates) {
      verificationStatus = 'CONTRADICTORY_VALIDITY_DATES'
      recordType = 'HISTORICAL_EVIDENCE_RECORD'
      statusReason = `Certificate validity dates are contradictory: validFrom (${record.validFrom}) is later than validUntil (${record.validUntil}).`
    } else if (isFutureTimestamps) {
      verificationStatus = 'FUTURE_DATED_VERIFICATION'
      recordType = 'HISTORICAL_EVIDENCE_RECORD'
      statusReason = 'Verification or revocation-check timestamp is future-dated beyond acceptable clock skew (max 5 minutes).'
    } else if (!isAuthorizedOperation) {
      verificationStatus = 'UNAUTHORIZED_VERIFICATION_OPERATION'
      recordType = 'HISTORICAL_EVIDENCE_RECORD'
      statusReason = 'Record lacks proof of an authorized completed verification operation against an authoritative registry.'
    } else if (isExpired) {
      verificationStatus = 'EXPIRED'
      recordType = 'HISTORICAL_EVIDENCE_RECORD'
      statusReason = 'Certificate validity period has lapsed. Retained as a historical evidence record only.'
    } else if (isNotYetValid) {
      verificationStatus = 'NOT_YET_VALID'
      statusReason = `Certificate validity period has not yet begun (valid from: ${record.validFrom}).`
    } else if (isStale) {
      verificationStatus = 'STALE_VERIFICATION'
      recordType = 'HISTORICAL_EVIDENCE_RECORD'
      statusReason = isMissingRevocation
        ? 'Revocation check timestamp is missing or malformed. Fresh authoritative verification required.'
        : 'Authoritative revocation check is older than 30 days. Fresh registry verification is required before reliance.'
    } else if (isProductMismatch) {
      verificationStatus = 'PRODUCT_MISMATCH'
      statusReason = `Certificate was issued for product identity "${record.associatedProductId || 'None'}", which does not match requested product "${productId}".`
    } else if (isBarcodeMismatch) {
      verificationStatus = 'PRODUCT_MISMATCH'
      statusReason = `Certificate was issued for product identity "${record.associatedProductId || 'None'}", which does not match requested barcode "${barcode}".`
    } else if (isManufacturerMismatch) {
      verificationStatus = 'MANUFACTURER_MISMATCH'
      statusReason = `Certificate was issued for brand "${record.brand || 'None'}", which does not match requested manufacturer "${manufacturer}".`
    } else if (isAuthorityMismatch) {
      verificationStatus = 'ISSUING_AUTHORITY_MISMATCH'
      statusReason = `Certificate issuing authority "${record.issuingAuthority || 'None'}" does not match requested authority "${issuingAuthority}".`
    } else if (isStandardMismatch) {
      verificationStatus = 'STANDARD_MISMATCH'
      statusReason = `Certificate standard "${record.standard || 'None'}" does not match requested standard "${standard}".`
    }

    const isCurrentlyValid = verificationStatus === 'AUTHENTICATED_VALID'

    // Return strictly sanitized public fields with explicit verification status and no-store caching
    return NextResponse.json(
      {
        success: true,
        data: {
          certificateId: record.certificateId,
          associatedProductId: record.associatedProductId,
          issuingAuthority: record.issuingAuthority,
          standard: record.standard,
          evidenceUrl: record.evidenceUrl,
          brand: record.brand || null,
          validFrom: record.validFrom,
          validUntil: record.validUntil,
          revocationStatus: record.revocationStatus,
          revocationCheckedAt: record.revocationCheckedAt,
          verificationMethod: record.verificationMethod,
          verifiedAt: record.timestamp,
          verificationStatus,
          isCurrentlyValid,
          recordType,
          statusReason
        }
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (err: any) {
    console.error('[Public Certification API Error]', err.message)
    return NextResponse.json(
      { success: false, error: 'Internal verification service error' },
      { status: 500 }
    )
  }
}

/**
 * Rejects external submissions to prevent clients or external providers
 * from creating or assigning authenticated certification status.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'External certification creation is strictly prohibited. Verification operations must originate from authenticated server workflows.'
    },
    {
      status: 405,
      headers: { Allow: 'GET' }
    }
  )
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'External certification mutation is strictly prohibited.'
    },
    {
      status: 405,
      headers: { Allow: 'GET' }
    }
  )
}
