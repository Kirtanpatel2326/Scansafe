import { createClient } from '@/lib/supabase-server'
import { razorpay } from '@/lib/razorpay'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create an order in Razorpay
    const amount = 100 // ₹1.00 in paise (trial testing)
    const currency = 'INR'
    const options = {
      amount,
      currency,
      receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId: user.id,
        email: user.email || '',
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
