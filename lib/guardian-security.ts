import { NextResponse } from 'next/server'
import { createAdminClient } from './supabase-server'

interface RateLimitRecord {
  count: number
  resetAt: number
}

// Global in-memory rate limiter table preserved across hot-reloads
const rateLimitTable = globalThis as unknown as {
  guardianRateLimitMap?: Map<string, RateLimitRecord>
  guardianActiveRuns?: Map<string, number>
}

if (!rateLimitTable.guardianRateLimitMap) {
  rateLimitTable.guardianRateLimitMap = new Map()
}

if (!rateLimitTable.guardianActiveRuns) {
  rateLimitTable.guardianActiveRuns = new Map()
}

export function extractClientIdentifier(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim()
    if (firstIp) return `ip:${firstIp}`
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return `ip:${realIp.trim()}`
  return 'ip:127.0.0.1'
}

export interface RateLimitOptions {
  windowMs?: number
  maxRequests?: number
  routeLabel?: string
}

/**
 * Synchronous in-memory rate limiter (used for offline tests or unit tests).
 */
export function checkGuardianRateLimit(
  request: Request,
  userId?: string,
  options: RateLimitOptions = {}
): NextResponse | null {
  const windowMs = options.windowMs || 60 * 1000 // 1 minute window
  const maxRequests = options.maxRequests || (userId ? 30 : 10) // 30 req/min for signed-in, 10 for guests
  const id = extractClientIdentifier(request, userId)
  const route = options.routeLabel || 'guardian-api'
  const key = `${route}:${id}`

  const now = Date.now()
  const map = rateLimitTable.guardianRateLimitMap!

  // Garbage collect expired entries periodically
  if (map.size > 2000) {
    for (const [k, v] of Array.from(map.entries())) {
      if (now > v.resetAt) map.delete(k)
    }
  }

  const existing = map.get(key)
  if (!existing || now > existing.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    return NextResponse.json(
      {
        error: `Guardian rate limit exceeded for ${route}. Quota: ${maxRequests} requests per minute.`,
        retryAfter: retryAfterSeconds
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'Cache-Control': 'no-store'
        }
      }
    )
  }

  existing.count += 1
  return null
}

/**
 * Production-grade shared atomic rate limiter suitable for Vercel serverless lambdas.
 * Uses PostgreSQL stored procedure `guardian_consume_rate_limit` for single-transaction atomic evaluation.
 * Never silently falls back to uncoordinated memory in production.
 */
export async function checkGuardianRateLimitShared(
  request: Request,
  userId?: string,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  const windowMs = options.windowMs || 60 * 1000
  const maxRequests = options.maxRequests || (userId ? 30 : 10)
  const id = extractClientIdentifier(request, userId)
  const route = options.routeLabel || 'guardian-api'
  const key = `${route}:${id}`

  const hasDb = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (hasDb) {
    try {
      const admin = createAdminClient()

      // Atomic Single-Transaction Quota Check & Increment via PostgreSQL RPC
      const { data, error: rpcErr } = await admin.rpc('guardian_consume_rate_limit', {
        p_key: key,
        p_max_requests: maxRequests,
        p_window_seconds: Math.ceil(windowMs / 1000)
      })

      if (!rpcErr && data) {
        const record = Array.isArray(data) ? data[0] : data
        if (record && record.allowed === false) {
          const resetTime = new Date(record.reset_at).getTime()
          const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000))
          return NextResponse.json(
            {
              error: `Guardian rate limit exceeded for ${route}. Quota: ${maxRequests} requests per minute.`,
              retryAfter: retryAfterSeconds
            },
            {
              status: 429,
              headers: {
                'Retry-After': String(retryAfterSeconds),
                'Cache-Control': 'no-store'
              }
            }
          )
        }
        return null // Rate limit allowed
      }

      if (rpcErr) {
        console.warn('[Guardian RateLimit] Atomic RPC returned error:', rpcErr.message)
      }
    } catch (err) {
      console.warn('[Guardian RateLimit] Shared storage connection exception:', err)
    }
  }

  // Strict Production Safety: Never silently fall back to uncoordinated memory in production!
  if (process.env.NODE_ENV === 'production') {
    console.error('[Guardian RateLimit] Shared atomic rate limiter unavailable in production environment.')
    return NextResponse.json(
      { error: 'Service temporarily unavailable: Shared rate limit coordination offline.' },
      {
        status: 503,
        headers: {
          'Retry-After': '5',
          'Cache-Control': 'no-store'
        }
      }
    )
  }

  // Graceful deterministic fallback for offline tests & local development
  return checkGuardianRateLimit(request, userId, options)
}

/**
 * Synchronous in-memory execution slot check.
 */
export function acquireGuardianExecutionSlot(clientId: string, maxConcurrent: number = 2): boolean {
  const activeMap = rateLimitTable.guardianActiveRuns!
  const current = activeMap.get(clientId) || 0
  if (current >= maxConcurrent) return false
  activeMap.set(clientId, current + 1)
  return true
}

export function releaseGuardianExecutionSlot(clientId: string): void {
  const activeMap = rateLimitTable.guardianActiveRuns!
  const current = activeMap.get(clientId) || 1
  if (current <= 1) {
    activeMap.delete(clientId)
  } else {
    activeMap.set(clientId, current - 1)
  }
}

export interface LeaseResult {
  acquired: boolean
  leaseToken: string | null
  status: 'ACQUIRED' | 'CONCURRENCY_LIMIT_EXCEEDED' | 'DATABASE_UNAVAILABLE'
}

/**
 * Production-grade shared atomic concurrency lease suitable for Vercel serverless runtimes.
 * Acquires a time-to-live (TTL) lease in PostgreSQL via `guardian_acquire_concurrency_lease` RPC.
 * Uses transactional advisory lock `pg_advisory_xact_lock` to serialize concurrent requests.
 * Never silently falls back to uncoordinated memory in production.
 */
export async function acquireGuardianExecutionSlotShared(
  clientId: string,
  maxConcurrent: number = 2,
  ttlSeconds: number = 30
): Promise<LeaseResult> {
  const hasDb = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (hasDb) {
    try {
      const admin = createAdminClient()
      const { data, error: rpcErr } = await admin.rpc('guardian_acquire_concurrency_lease', {
        p_client_key: clientId,
        p_max_concurrent: maxConcurrent,
        p_ttl_seconds: ttlSeconds
      })

      if (!rpcErr && data) {
        const row = Array.isArray(data) ? data[0] : data
        if (row && row.acquired && row.lease_id) {
          return {
            acquired: true,
            leaseToken: String(row.lease_id),
            status: 'ACQUIRED'
          }
        }
        return {
          acquired: false,
          leaseToken: null,
          status: 'CONCURRENCY_LIMIT_EXCEEDED'
        }
      }

      if (rpcErr) {
        console.warn('[Guardian Concurrency] Shared lease RPC returned error:', rpcErr.message)
      }
    } catch (err) {
      console.warn('[Guardian Concurrency] Shared lease table exception:', err)
    }
  }

  // Strict Production Safety: Never silently fall back to uncoordinated memory in production!
  if (process.env.NODE_ENV === 'production') {
    console.error('[Guardian Concurrency] Shared lease table unavailable in production environment.')
    return {
      acquired: false,
      leaseToken: null,
      status: 'DATABASE_UNAVAILABLE'
    }
  }

  // Fallback to in-memory slot for local development and offline unit tests
  const acquired = acquireGuardianExecutionSlot(clientId, maxConcurrent)
  return {
    acquired,
    leaseToken: acquired ? `mem_lease_${Math.random().toString(36).substring(7)}` : null,
    status: acquired ? 'ACQUIRED' : 'CONCURRENCY_LIMIT_EXCEEDED'
  }
}

export async function releaseGuardianExecutionSlotShared(
  clientId: string,
  leaseToken?: string | null
): Promise<boolean> {
  if (!leaseToken) return false

  if (leaseToken.startsWith('mem_lease_')) {
    releaseGuardianExecutionSlot(clientId)
    return true
  }

  const hasDb = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (hasDb) {
    try {
      const admin = createAdminClient()
      const { data, error: rpcErr } = await admin.rpc('guardian_release_concurrency_lease', {
        p_lease_id: leaseToken
      })
      if (rpcErr) {
        console.error('[Guardian Concurrency] Error releasing shared lease via RPC:', rpcErr.message)
        return false
      }
      releaseGuardianExecutionSlot(clientId)
      return Boolean(data ?? true)
    } catch (err) {
      console.error('[Guardian Concurrency] Error releasing shared lease via RPC:', err)
      return false
    }
  }

  // Decrement in-memory counter in offline local mode
  releaseGuardianExecutionSlot(clientId)
  return true
}

export function resetGuardianRateLimiterForTesting(): void {
  rateLimitTable.guardianRateLimitMap?.clear()
  activeRunsForTestingClear()
}

function activeRunsForTestingClear(): void {
  rateLimitTable.guardianActiveRuns?.clear()
}
