import { createClient, createAdminClient } from '@/lib/supabase-server'
import { getScanPack, LIVE_PAYMENTS_ENABLED } from '@/lib/plans'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const ManualCheckoutSchema = z.object({
  utr: z.string().trim().min(8, "UTR reference must be at least 8 alphanumeric characters").max(50),
  planType: z.string().min(1).max(50),
  amount: z.number().positive().optional(),
  userId: z.string().uuid().optional()
});

export async function POST(request: Request) {
  try {
    // 0. Safe Submission Fallback: Check if manual submissions are enabled
    if (!LIVE_PAYMENTS_ENABLED) {
      return NextResponse.json({
        error: "PAYMENTS_AWAITING_VERIFICATION",
        message: "Manual payment submissions are currently disabled pending production verification."
      }, { status: 503 });
    }

    const sessionClient = await createClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'AUTH_REQUIRED', 
        message: 'Please sign in to submit a manual UPI payment reference.' 
      }, { status: 401 });
    }

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

    const { utr, planType } = parsed.data;

    // Validate pack from server catalog
    const pack = getScanPack(planType);
    if (!pack) {
      return NextResponse.json({ error: `Invalid scan pack selected: ${planType}` }, { status: 400 });
    }

    // Normalize UTR: uppercase alphanumeric only
    const normalizedUtr = utr.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalizedUtr.length < 8) {
      return NextResponse.json({ 
        error: 'INVALID_UTR', 
        message: 'Normalized UTR must contain at least 8 alphanumeric characters.' 
      }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if this normalized UTR was already submitted
    const { data: existingPayment } = await adminClient
      .from('pending_payments')
      .select('id, status, user_id')
      .eq('utr', normalizedUtr)
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json({
        error: 'UTR_ALREADY_SUBMITTED',
        message: 'This transaction reference (UTR) has already been submitted for verification.',
        status: existingPayment.status
      }, { status: 400 });
    }

    // Insert into pending_payments with status 'pending' using server-side user.id and pack.priceInr
    const { data: inserted, error: insertError } = await adminClient
      .from('pending_payments')
      .insert({
        user_id: user.id,
        utr: normalizedUtr,
        plan_type: pack.id,
        amount: pack.priceInr,
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
      amount: pack.priceInr,
      message: 'Your transfer reference has been submitted. Credits will be added to your account once verified (typically within 1-2 hours).'
    });

  } catch (err: any) {
    console.error('Manual checkout error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
