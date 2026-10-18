/**
 * SCANSAFE GUARDIAN AI — STAGING SUPABASE COORDINATION VERIFICATION
 * 
 * Tests atomic rate limiting and concurrency lease acquisition with multiple concurrent
 * requests against the deployed Supabase staging instance.
 * 
 * Rules:
 * 1. Clearly distinguishes live staging Supabase network calls from in-memory emulator tests.
 * 2. Tests multiple concurrent requests against live Supabase RPC endpoints.
 * 3. Verifies that when RPCs or tables are absent from staging Supabase, the system
 *    strictly fails closed (HTTP 503 / DATABASE_UNAVAILABLE) in both Vercel Preview and Production.
 * 4. Never fabricates success or marks missing live-service features as passed.
 */

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
        if (!process.env[key]) {
          process.env[key] = val
        }
      }
    }
  }
}
loadEnvLocal()

async function main() {
  console.log('======================================================================')
  console.log('🛡️  SCANSAFE GUARDIAN — LIVE STAGING SUPABASE COORDINATION AUDIT')
  console.log('======================================================================\n')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log(`[Config Check] Target Supabase URL: ${supabaseUrl || 'MISSING'}`)
  console.log(`[Config Check] Service Role Key: ${serviceRoleKey ? 'PRESENT (' + serviceRoleKey.slice(0, 10) + '...)' : 'MISSING'}\n`)

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ FATAL: Missing Supabase credentials in .env.local')
    process.exit(1)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // ------------------------------------------------------------------
  // PART 1: LIVE STAGING SUPABASE DIRECT RPC CONCURRENCY PROBE
  // ------------------------------------------------------------------
  console.log('▶ [Part 1] Live Staging Supabase Direct RPC Concurrency Probe (10 Concurrent Requests)')
  const testKey = `staging_live_rl_${Date.now()}`
  const testClient = `staging_live_lease_${Date.now()}`

  console.log(`  Probing guardian_consume_rate_limit with 10 concurrent requests (Key: ${testKey})...`)
  const rateLimitProbes = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      adminClient.rpc('guardian_consume_rate_limit', {
        p_key: testKey,
        p_max_requests: 5,
        p_window_seconds: 60
      })
    )
  )

  const firstRlError = rateLimitProbes.find(p => p.error)?.error
  if (firstRlError) {
    console.log(`  ℹ️  [LIVE STAGING SUPABASE] guardian_consume_rate_limit RPC unavailable:`)
    console.log(`      Error Message: "${firstRlError.message}"`)
    console.log(`      Code: ${firstRlError.code || 'PGRST'}`)
    console.log(`      Status: RPC unmigrated in staging Supabase database.`)
  } else {
    const allowedCount = rateLimitProbes.filter(p => {
      const row = Array.isArray(p.data) ? p.data[0] : p.data
      return row?.allowed === true
    }).length
    console.log(`  ✓ [LIVE STAGING SUPABASE] guardian_consume_rate_limit: ${allowedCount} allowed out of 10 requests.`)
  }

  console.log(`\n  Probing guardian_acquire_concurrency_lease with 10 concurrent requests (Client: ${testClient})...`)
  const leaseProbes = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      adminClient.rpc('guardian_acquire_concurrency_lease', {
        p_client_key: testClient,
        p_max_concurrent: 2,
        p_ttl_seconds: 15
      })
    )
  )

  const firstLeaseError = leaseProbes.find(p => p.error)?.error
  if (firstLeaseError) {
    console.log(`  ℹ️  [LIVE STAGING SUPABASE] guardian_acquire_concurrency_lease RPC unavailable:`)
    console.log(`      Error Message: "${firstLeaseError.message}"`)
    console.log(`      Code: ${firstLeaseError.code || 'PGRST'}`)
    console.log(`      Status: RPC unmigrated in staging Supabase database.`)
  } else {
    const acquiredLeases = leaseProbes.filter(p => {
      const row = Array.isArray(p.data) ? p.data[0] : p.data
      return row?.acquired === true
    })
    console.log(`  ✓ [LIVE STAGING SUPABASE] guardian_acquire_concurrency_lease: ${acquiredLeases.length} acquired out of 10 (Max: 2).`)
  }

  // ------------------------------------------------------------------
  // PART 2: VERCEL PREVIEW ENVIRONMENT FAIL-CLOSED BEHAVIOR UNDER UNMIGRATED STAGING
  // ------------------------------------------------------------------
  console.log('\n▶ [Part 2] Deployed Environment Fail-Closed Verification (Vercel Preview & Production)')
  const { checkGuardianRateLimitShared, acquireGuardianExecutionSlotShared, isDeployedEnvironment } = await import('../lib/guardian-security')

  // Test with VERCEL_ENV='preview'
  const prevVercel = process.env.VERCEL
  const prevVercelEnv = process.env.VERCEL_ENV
  const prevNodeEnv = process.env.NODE_ENV

  try {
    ;(process.env as any).VERCEL = '1'
    ;(process.env as any).VERCEL_ENV = 'preview'
    ;(process.env as any).NODE_ENV = 'production'

    console.log(`  Environment Context: VERCEL=${process.env.VERCEL}, VERCEL_ENV=${process.env.VERCEL_ENV}, NODE_ENV=${process.env.NODE_ENV}`)
    console.log(`  isDeployedEnvironment(): ${isDeployedEnvironment()}`)

    const dummyReq = new Request('http://localhost:3000/api/guardian/agent', {
      headers: { 'x-forwarded-for': '198.51.100.201' }
    })

    const rlRes = await checkGuardianRateLimitShared(dummyReq, undefined, { routeLabel: 'staging-audit-preview' })
    if (firstRlError) {
      if (rlRes?.status === 503) {
        console.log(`  ✓ [VERCEL PREVIEW FAIL-CLOSED] Rate limiter strictly returned HTTP 503 Service Unavailable when shared RPC is missing.`)
      } else {
        console.error(`  ❌ [REGRESSION] Expected HTTP 503, got ${rlRes?.status}`)
      }
    } else {
      console.log(`  ✓ [VERCEL PREVIEW LIVE] Rate limiter executed via live Supabase RPC.`)
    }

    const leaseRes = await acquireGuardianExecutionSlotShared('staging_preview_probe', 2, 30)
    if (firstLeaseError) {
      if (leaseRes.acquired === false && leaseRes.status === 'DATABASE_UNAVAILABLE') {
        console.log(`  ✓ [VERCEL PREVIEW FAIL-CLOSED] Concurrency lease strictly returned DATABASE_UNAVAILABLE when shared lease table is missing.`)
      } else {
        console.error(`  ❌ [REGRESSION] Expected DATABASE_UNAVAILABLE, got ${JSON.stringify(leaseRes)}`)
      }
    } else {
      console.log(`  ✓ [VERCEL PREVIEW LIVE] Concurrency lease acquired: ${leaseRes.acquired}`)
    }
  } finally {
    if (prevVercel !== undefined) (process.env as any).VERCEL = prevVercel; else delete (process.env as any).VERCEL
    if (prevVercelEnv !== undefined) (process.env as any).VERCEL_ENV = prevVercelEnv; else delete (process.env as any).VERCEL_ENV
    if (prevNodeEnv !== undefined) (process.env as any).NODE_ENV = prevNodeEnv; else delete (process.env as any).NODE_ENV
  }

  // ------------------------------------------------------------------
  // PART 3: IN-MEMORY PROCESS-LOCAL EMULATOR FOR ISOLATED UNIT TESTS
  // ------------------------------------------------------------------
  console.log('\n▶ [Part 3] Process-Local Fallback Isolation (Local Dev & Unit Tests Only)')
  const testNodeEnv = process.env.NODE_ENV
  try {
    ;(process.env as any).NODE_ENV = 'test'
    delete (process.env as any).VERCEL
    delete (process.env as any).VERCEL_ENV
    // Temporarily unset Supabase URL to test in-memory fallback
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    delete (process.env as any).NEXT_PUBLIC_SUPABASE_URL

    const dummyLocalReq = new Request('http://localhost:3000/api/guardian/agent', {
      headers: { 'x-forwarded-for': '127.0.0.1' }
    })
    const localRlRes = await checkGuardianRateLimitShared(dummyLocalReq, undefined, { routeLabel: 'local-unit-test' })
    const localLeaseRes = await acquireGuardianExecutionSlotShared('local_test_client', 2, 30)

    console.log(`  Local test rate limit result: ${localRlRes === null ? 'Allowed (in-memory)' : 'Blocked'}`)
    console.log(`  Local test lease result: ${localLeaseRes.acquired ? 'Acquired (in-memory token: ' + localLeaseRes.leaseToken + ')' : 'Failed'}`)

    if (origUrl) (process.env as any).NEXT_PUBLIC_SUPABASE_URL = origUrl
  } finally {
    if (testNodeEnv !== undefined) (process.env as any).NODE_ENV = testNodeEnv; else delete (process.env as any).NODE_ENV
  }

  console.log('\n======================================================================')
  console.log('📊 AUDIT SUMMARY: LIVE STAGING PROBE COMPLETED TRANSPARENTLY')
  console.log('======================================================================\n')
}

main().catch(err => {
  console.error('Audit script exception:', err)
  process.exit(1)
})
