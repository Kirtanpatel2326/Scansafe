import { NextRequest, NextResponse } from 'next/server'
import { serverEvidenceStore } from '@/lib/guardian-agent/orchestrator/evidence-store'
import { checkGuardianRateLimitShared } from '@/lib/guardian-security'

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

    // Optional product identity binding verification
    if (productId && record.associatedProductId !== productId) {
      return NextResponse.json(
        {
          success: false,
          error: `Certificate ID ${certificateId} was issued for a different product identity.`
        },
        { status: 404 }
      )
    }

    // Return strictly sanitized public fields
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
          verifiedAt: record.timestamp
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
