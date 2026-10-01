import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const ALLOWED_JOURNEY_EVENTS = [
  'demo_opened',
  'scan_started',
  'scan_completed',
  'scan_failed',
  'result_reviewed',
  'correction_submitted',
  'comparison_completed',
  'product_saved'
] as const

export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
    }

    const { path, event_name, metadata } = body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // If Supabase credentials are missing or in simulated test, return ok
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: true, simulated: true })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Hash IP for GDPR compliance (no raw PII stored)
    const ipHash = crypto.createHash('sha256').update(ip + supabaseKey).digest('hex')

    // 1. Page view tracking
    if (path && !event_name) {
      await supabase.from('page_views').insert({
        path: path || '/',
        ip_hash: ipHash,
        user_agent: userAgent
      })
      return NextResponse.json({ success: true, type: 'page_view' })
    }

    // 2. Journey milestone event tracking
    if (event_name && ALLOWED_JOURNEY_EVENTS.includes(event_name)) {
      // Strictly sanitize metadata: strip images, extracted text, dietary preferences, and PII
      const sanitizedMeta: Record<string, any> = {}
      if (metadata && typeof metadata === 'object') {
        const allowedKeys = ['status', 'duration_ms', 'basis', 'source', 'is_sample', 'barcode_format', 'item_count', 'variant']
        for (const [key, val] of Object.entries(metadata)) {
          if (allowedKeys.includes(key) && typeof val !== 'object') {
            sanitizedMeta[key] = val
          }
        }
      }

      await supabase.from('analytics_events').insert({
        event_name,
        user_hash: ipHash,
        metadata: sanitizedMeta
      })

      return NextResponse.json({ success: true, type: 'journey_event', event: event_name })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error tracking analytics event:', err)
    // Analytics failure should never break client requests
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
