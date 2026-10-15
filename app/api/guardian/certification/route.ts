import { NextRequest, NextResponse } from 'next/server'
import { serverEvidenceStore } from '@/lib/guardian-agent/orchestrator/evidence-store'
import { checkGuardianRateLimitShared } from '@/lib/guardian-security'
import { isCertificateRevoked } from '@/lib/guardian-agent/orchestrator/certification-verifier'

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
 * 
 * NEVER exposes internal fields:
 * - auditRecordHash (internal tamper-evident cryptographic hash)
 * - auditHistory (internal server operational traces & actor IDs)
 * - operationId (internal server operation identifier)
 * - id (internal database primary key UUID)
 */
export async function GET(request: NextRequest) {
  // Shared distributed rate limiting
  const rateLimitRes = await checkGuardianRateLimitShared(request, undefined, {
    routeLabel: 'guardian-cert-public'
  })
  if (rateLimitRes) return rateLimitRes

  const { searchParams } = new URL(request.url)
  const certificateId = searchParams.get('certificateId')?.trim()
  const productId = searchParams.get('productId')?.trim()

  if (!certificateId || certificateId.length > 128) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing mandatory query parameter: certificateId (maximum 128 characters allowed)' },
      { status: 400 }
    )
  }

  if (productId && productId.length > 128) {
    return NextResponse.json(
      { success: false, error: 'Invalid query parameter: productId exceeds maximum allowable length of 128 characters' },
      { status: 400 }
    )
  }

  try {
    const record = await serverEvidenceStore.fetchRecordFromDatabase(certificateId)

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          error: `No authoritative verification evidence found for certificate ID: ${certificateId}`
        },
        { status: 404 }
      )
    }

    // Evaluate authoritative validity, revocation, expiry, freshness, and product binding
    const now = Date.now()
    const isRevoked = record.revocationStatus === 'REVOKED' || isCertificateRevoked(record.certificateId)
    const validUntilMs = record.validUntil ? Date.parse(record.validUntil) : NaN
    const isExpired = record.revocationStatus === 'EXPIRED' || (!Number.isNaN(validUntilMs) && validUntilMs < now)
    const validFromMs = record.validFrom ? Date.parse(record.validFrom) : NaN
    const isNotYetValid = !Number.isNaN(validFromMs) && validFromMs > now

    const revCheckedMs = record.revocationCheckedAt ? Date.parse(record.revocationCheckedAt) : NaN
    const isStale = !Number.isNaN(revCheckedMs) && (now - revCheckedMs > 30 * 24 * 60 * 60 * 1000)

    const isProductMismatch = Boolean(productId && record.associatedProductId !== productId)

    let verificationStatus:
      | 'AUTHENTICATED_VALID'
      | 'REVOKED'
      | 'EXPIRED'
      | 'NOT_YET_VALID'
      | 'STALE_VERIFICATION'
      | 'PRODUCT_MISMATCH' = 'AUTHENTICATED_VALID'

    let statusReason = 'Certificate is currently authenticated, active, and within its verified validity window.'
    let recordType: 'CURRENT_AUTHORITATIVE_RECORD' | 'HISTORICAL_EVIDENCE_RECORD' = 'CURRENT_AUTHORITATIVE_RECORD'

    if (isRevoked) {
      verificationStatus = 'REVOKED'
      recordType = 'HISTORICAL_EVIDENCE_RECORD'
      statusReason = 'Certificate has been revoked by issuing authority and is retained as a historical evidence record only.'
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
      statusReason = 'Authoritative revocation check is older than 30 days. Fresh registry verification is required before reliance.'
    } else if (isProductMismatch) {
      verificationStatus = 'PRODUCT_MISMATCH'
      statusReason = `Certificate was issued for product identity "${record.associatedProductId}", which does not match requested product "${productId}".`
    }

    const isCurrentlyValid = verificationStatus === 'AUTHENTICATED_VALID'

    // Return strictly sanitized public fields with explicit verification status
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
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300'
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
