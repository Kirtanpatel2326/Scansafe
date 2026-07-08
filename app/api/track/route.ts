import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json()
    
    // We must use the service role key to insert if RLS restricts anon, 
    // but anon is allowed so we can use a standard client or service client.
    // It's safer to use the service client for internal analytics.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Hash IP for privacy (GDPR friendly)
    const ipHash = crypto.createHash('sha256').update(ip + process.env.SUPABASE_SERVICE_ROLE_KEY).digest('hex')

    await supabase.from('page_views').insert({
      path: path || '/',
      ip_hash: ipHash,
      user_agent: userAgent
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error tracking page view:', err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
