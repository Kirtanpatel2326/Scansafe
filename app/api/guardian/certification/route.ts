import { NextRequest, NextResponse } from 'next/server'
import { serverEvidenceStore } from '@/lib/guardian-agent/orchestrator/evidence-store'
import { checkGuardianRateLimitShared } from '@/lib/guardian-security'
import { evaluateAuthoritativeCertificationRecord } from '@/lib/guardian-agent/orchestrator/certification-verifier'

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
  const evidenceUrl = searchParams.get('evidenceUrl')?.trim()

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
    ['standard', standard],
    ['evidenceUrl', evidenceUrl]
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

    // Shared authoritative record evaluation engine
    const evaluation = evaluateAuthoritativeCertificationRecord(record, {
      productId,
      barcode,
      manufacturer,
      issuingAuthority,
      standard,
      evidenceUrl
    })

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
          verificationStatus: evaluation.verificationStatus,
          isCurrentlyValid: evaluation.isValid,
          recordType: evaluation.recordType,
          statusReason: evaluation.statusReason
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
