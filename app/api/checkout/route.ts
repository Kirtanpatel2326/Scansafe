import { createClient } from '@/lib/supabase-server'
import { razorpay } from '@/lib/razorpay'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse plan type from request body
    let planType = 'lifetime'
    try {
      const body = await request.json()
      if (body && body.planType) {
        planType = body.planType
      }
    } catch (e) {
      // Body might be empty, default to lifetime
    }

    // Map planType to price in paise (1 INR = 100 paise)
    let amount = 49900 // Default: ₹499 (lifetime)
    if (planType === 'day') {
      amount = 1000 // ₹10
    } else if (planType === 'week') {
      amount = 9900 // ₹99
    } else if (planType === 'month') {
      amount = 29900 // ₹299
    } else if (planType === 'year') {
      amount = 99900 // ₹999
    } else if (planType === 'lifetime') {
      amount = 49900 // ₹499
    }

    const currency = 'INR'
    const options = {
      amount,
      currency,
      receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId: user.id,
        email: user.email || '',
        planType,
      },
    }

    const order = await razorpay.orders.create(options)

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      user: {
        email: user.email,
        name: user.user_metadata?.full_name || '',
      }
    })
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error)
    return NextResponse.json({ error: 'Failed to initialize payment gateway. Please try again later.' }, { status: 500 })
  }
}
