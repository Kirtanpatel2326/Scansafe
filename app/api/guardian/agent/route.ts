import { NextResponse } from 'next/server'
import { AgentRequestSchema, executeGuardianAgent } from '@/lib/guardian-agent/engine'
import { searchApprovedCatalog } from '@/lib/guardian-agent/catalog'
import { createClient } from '@/lib/supabase-server'
import {
  checkGuardianRateLimitShared,
  extractClientIdentifier,
  acquireGuardianExecutionSlotShared,
  releaseGuardianExecutionSlotShared
} from '@/lib/guardian-security'

export const runtime = 'nodejs'
export const maxDuration = 30 // 30-second bounded execution budget
const MAX_BYTES = 100000

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return NextResponse.json({ error: 'JSON required' }, { status: 415 })
  }
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  // Pre-auth identification for rate limiting
  const hasDatabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  let userId: string | undefined
  let db: Awaited<ReturnType<typeof createClient>> | undefined

  if (hasDatabase) {
    try {
      db = await createClient()
      const { data } = await db.auth.getUser()
      userId = data.user?.id
    } catch {
      // Unauthenticated / offline context
    }
  }

  // Rate Limiting (Priority 0)
  const rateLimitResponse = await checkGuardianRateLimitShared(request, userId, {
    routeLabel: 'guardian-agent-planner',
    maxRequests: userId ? 20 : 8 // 20 runs/min for signed-in, 8 for guests
  })
  if (rateLimitResponse) return rateLimitResponse

  // Concurrency Quota (max 2 active agent loops per user/IP using shared atomic leases)
  const clientKey = extractClientIdentifier(request, userId)
  const lease = await acquireGuardianExecutionSlotShared(clientKey, 2, 30)
  if (!lease.acquired) {
    if (lease.status === 'DATABASE_UNAVAILABLE') {
      return NextResponse.json(
        { error: 'Service temporarily unavailable: Concurrency coordination offline.' },
        { status: 503, headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' } }
      )
    }
    return NextResponse.json(
      { error: 'Concurrent execution limit reached (maximum 2 active agent tasks). Please wait.' },
      { status: 429, headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' } }
    )
  }
  const leaseToken = lease.leaseToken

  try {
    const reader = request.body?.getReader()
    if (!reader) return NextResponse.json({ error: 'Empty body' }, { status: 400 })
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_BYTES) {
        await reader.cancel()
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
      }
      chunks.push(value)
    }
    const buffer = new Uint8Array(size)
    let off = 0
    for (const c of chunks) {
      buffer.set(c, off)
      off += c.length
    }

    const parsed = AgentRequestSchema.safeParse(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer))
    )
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid agent request payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const requestData = parsed.data

    // P0: Trust-boundary enforcement for public API requests.
    // Externally imported / client-supplied records cannot self-assign trusted verification status.
    const sanitizedProducts = requestData.products?.map(p => {
      const isInternalVerified =
        p.sourceType === 'INTERNAL_VERIFIED_CATALOG' &&
        p.verificationStatus === 'MANUFACTURER_AUTHORIZED'
      if (!isInternalVerified) {
        return {
          ...p,
          certifiedRecords: p.certifiedRecords?.map(rec => ({
            ...rec,
            provenanceLevel: 'USER_UPLOADED_LABEL_EVIDENCE' as const,
            verificationMethod: 'UNVERIFIED_TEXT_MATCH' as const,
            registryConfirmed: false,
            status: 'UNVERIFIED' as const
          }))
        }
      }
      return p
    })

    // Execute with affirmative persistence gate and reliable error handling
    const result = await executeGuardianAgent(
      {
        ...requestData,
        products: sanitizedProducts
      },
      {
      signal: request.signal,
      ...((requestData.allowCatalogSearch || requestData.allowPartnerCatalog) &&
      process.env.GUARDIAN_CATALOG_API_URL
        ? { catalogSearch: searchApprovedCatalog }
        : {}),
      ...(db && userId
        ? {
            saveShortlist: async (ids, runId) => {
              const { error } = await db!.from('guardian_saved_tasks').insert({
                user_id: userId,
                run_id: runId,
                goal: requestData.goal,
                shortlist: ids
              })
              if (error) {
                // Ensure persistence failure is propagated so result.saved is false
                throw new Error(`Database persistence failed: ${error.message}`)
              }
            }
          }
        : {})
    })

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err: any) {
    const correlationId = crypto.randomUUID()
    // Secure internal audit log with correlation ID (never exposed to client)
    console.error(`[Guardian Agent API Error] [correlationId: ${correlationId}]`, {
      correlationId,
      clientKey,
      errorName: err?.name,
      errorMessage: err?.message,
      stack: err?.stack
    })

    // Explicit error classification:
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON payload in request body', code: 'BAD_REQUEST', correlationId },
        { status: 400 }
      )
    }

    if (err?.name === 'AbortError' || err?.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'Execution budget exceeded. Agent request timed out.', code: 'EXECUTION_TIMEOUT', correlationId },
        { status: 504 }
      )
    }

    if (typeof err?.message === 'string' && err.message.startsWith('Invalid agent request')) {
      return NextResponse.json(
        { error: 'Invalid agent request parameters', code: 'INVALID_PARAMETERS', correlationId },
        { status: 400 }
      )
    }

    // Default safe fallback: Never expose unexpected exceptions, DB errors, stack traces, or provider internals
    return NextResponse.json(
      {
        error: 'Unable to complete agent execution. An internal error occurred.',
        code: 'INTERNAL_ERROR',
        correlationId
      },
      { status: 500 }
    )
  } finally {
    await releaseGuardianExecutionSlotShared(clientKey, leaseToken)
  }
}
