import { createAdminClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    // Parse payload
    const body = JSON.parse(rawBody)
    console.log('Received Razorpay Webhook Event:', body.event)

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not configured on the server.')
      return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 })
    }

    if (!signature) {
      console.error('x-razorpay-signature header is missing')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const shasum = crypto.createHmac('sha256', webhookSecret)
    shasum.update(rawBody)
    const expectedSignature = shasum.digest('hex')

    if (expectedSignature !== signature) {
      console.error('Invalid Razorpay Webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Process upgrade on payment success
    if (body.event === 'payment.captured' || body.event === 'order.paid') {
      const entity = body.payload?.payment?.entity || body.payload?.order?.entity
      const notes = entity?.notes
      const userId = notes?.userId
      const paymentId = entity?.id || 'manual_payment'
      const planType = notes?.planType || 'year'

      if (!userId) {
        console.error('No userId found in Razorpay payment notes')
        return NextResponse.json({ error: 'No userId in notes' }, { status: 400 })
      }

      // Calculate expiration date
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

      console.log(`Upgrading user ${userId} to Pro plan: type=${planType}, expires=${expiresAt} (Payment: ${paymentId})...`)

      const supabaseAdmin = createAdminClient()

      // Upgrade profile to Pro with subscription fields
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({
          plan: 'pro',
          plan_type: planType,
          plan_expires_at: expiresAt,
          razorpay_subscription_id: paymentId
        })
        .eq('id', userId)
        .select()

      if (error) {
        console.error('Failed to upgrade user profile in DB:', error)
        return NextResponse.json({ error: 'DB upgrade failed' }, { status: 500 })
      }

      console.log('User successfully upgraded to Pro:', data)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in Razorpay Webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
