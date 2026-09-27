import { createAdminClient } from '@/lib/supabase-server'
import { getScanPack } from '@/lib/plans'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ManualCheckoutSchema = z.object({
  utr: z.string().trim().min(8, "UTR reference must be at least 8 characters").max(50),
  planType: z.string().min(1).max(50),
  amount: z.number().positive(),
  userId: z.string().uuid("Invalid user ID")
});

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = ManualCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: "INVALID_FIELDS",
        details: parsed.error.format()
      }, { status: 400 });
    }

    const { utr, planType, amount, userId } = parsed.data;

    // Validate pack
    const pack = getScanPack(planType);
    if (!pack) {
      return NextResponse.json({ error: `Invalid scan pack selected: ${planType}` }, { status: 400 });
    }

    // Check if this UTR was already submitted
    const { data: existingPayment } = await supabase
      .from('pending_payments')
      .select('id, status')
      .eq('utr', utr)
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json({
        error: 'UTR_ALREADY_SUBMITTED',
        message: 'This transaction reference (UTR) has already been submitted for verification.',
        status: existingPayment.status
      }, { status: 400 });
    }

    // Insert into pending_payments with status 'pending'
    const { data: inserted, error: insertError } = await supabase
      .from('pending_payments')
      .insert({
        user_id: userId,
        utr: utr,
        plan_type: pack.id,
        amount: amount,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to record pending payment:', insertError);
      return NextResponse.json({ error: 'Failed to record payment reference. Please try again.' }, { status: 500 });
    }

    // Notice: Do NOT perform unverified optimistic upgrade.
    // Credits will be granted atomically upon admin verification.
    return NextResponse.json({
      success: true,
      status: 'pending',
      paymentId: inserted?.id,
      message: 'Your transfer reference has been submitted. Credits will be added to your account once verified (typically within 1-2 hours).'
    });

  } catch (err: any) {
    console.error('Manual checkout error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
