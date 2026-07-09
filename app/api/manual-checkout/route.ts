import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createAdminClient()
    
    // Parse the payload
    let body;
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const { utr, planType, amount, userId } = body

    if (!utr || !planType || !amount || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Insert into pending_payments
    const { error: insertError } = await supabase
      .from('pending_payments')
      .insert({
        user_id: userId,
        utr: utr,
        plan_type: planType,
        amount: amount,
        status: 'pending'
      })

    if (insertError) {
      console.error('Failed to insert pending payment:', insertError)
      // Allow it to proceed for UX, but log it.
    }

    // 2. Optimistic upgrade (Grant access immediately for prototype purposes)
    let expiresAt: string | null = null
    const now = new Date()
    if (planType === 'day') {
      expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    } else if (planType === 'week') {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    } else if (planType === 'month') {
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    } else if (planType === 'year') {
      expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        plan: 'pro',
        plan_type: planType,
        plan_expires_at: expiresAt
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to optimistically upgrade user:', updateError)
      return NextResponse.json({ error: 'Failed to upgrade profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true, expiresAt })

  } catch (err: any) {
    console.error('Manual checkout error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
