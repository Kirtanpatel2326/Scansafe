-- ==========================================================
-- SCANSAFE V2 DATABASE SCHEMA MIGRATION
-- Transactional Credit Ledger, RLS Hardening, & Evidence Cache
-- ==========================================================

-- 1. PROFILES TABLE ADJUSTMENTS
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS scan_credits INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

-- Set default initial scans for new users to 5 (as originally specified)
ALTER TABLE public.profiles 
  ALTER COLUMN scan_credits SET DEFAULT 5;

-- 2. CREDIT RESERVATIONS TABLE (For two-phase atomic credit reservation & release)
CREATE TABLE IF NOT EXISTS public.credit_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    op_id TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    action TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('reserved', 'finalized', 'released', 'expired')),
    description TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_reservations_op_id 
    ON public.credit_reservations(user_id, op_id);

CREATE INDEX IF NOT EXISTS idx_credit_reservations_status_expires 
    ON public.credit_reservations(status, expires_at);

ALTER TABLE public.credit_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reservations" ON public.credit_reservations;
CREATE POLICY "Users can view their own reservations"
    ON public.credit_reservations FOR SELECT
    USING (auth.uid() = user_id);

-- 3. PAYMENT ORDERS TABLE (Server-side association)
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id TEXT PRIMARY KEY, -- Razorpay order_id
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pack_id TEXT NOT NULL,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'fulfilled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON public.payment_orders(user_id, created_at DESC);
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payment orders" ON public.payment_orders;
CREATE POLICY "Users can view their own payment orders"
    ON public.payment_orders FOR SELECT
    USING (auth.uid() = user_id);

-- 4. CREDIT LEDGER TABLE (Transactional accounting & idempotency)
CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive for credits added, negative for credits spent
    balance_after INTEGER NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('purchase', 'scan', 'compare', 'meal_compose', 'bonus', 'refund', 'initial_grant')),
    reference_id TEXT, -- e.g. payment_id, scan_id, or utr
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON public.credit_ledger(user_id, created_at DESC);

-- Unique index to enforce purchase fulfillment idempotency per transaction/reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_purchase_idempotency 
    ON public.credit_ledger (user_id, reference_id) 
    WHERE action = 'purchase' AND reference_id IS NOT NULL;

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own credit ledger" ON public.credit_ledger;
CREATE POLICY "Users can view their own credit ledger"
    ON public.credit_ledger FOR SELECT
    USING (auth.uid() = user_id);

-- 5. HARDEN PROFILES RLS (Prevent client-side privilege escalation)
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update non-sensitive fields in their own profile" ON public.profiles;

-- Revoke client-side UPDATE privileges on sensitive columns
REVOKE UPDATE (plan, plan_type, scan_credits, scans_today, scans_reset_at, razorpay_subscription_id) 
    ON public.profiles FROM authenticated;

CREATE POLICY "Allow users to update non-sensitive fields in their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 6. PRODUCTS CACHE SCHEMA 2.0
ALTER TABLE public.products_cache
    ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '2.0',
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ocr',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 7. ATOMIC DATABASE RPC FUNCTIONS (SECURITY DEFINER)

-- Function: reserve_credits
CREATE OR REPLACE FUNCTION public.reserve_credits(
    p_user_id UUID,
    p_amount INT,
    p_action TEXT,
    p_op_id TEXT,
    p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_current_credits INT;
    v_active_reserved INT;
    v_available_credits INT;
    v_existing_res RECORD;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT', 'message', 'Operation amount must be greater than zero');
    END IF;

    -- 1. Check if reservation with op_id already exists
    SELECT * INTO v_existing_res 
    FROM public.credit_reservations 
    WHERE user_id = p_user_id AND op_id = p_op_id;

    IF FOUND THEN
        IF v_existing_res.status = 'reserved' THEN
            RETURN jsonb_build_object('success', true, 'op_id', p_op_id, 'already_reserved', true);
        ELSIF v_existing_res.status = 'finalized' THEN
            RETURN jsonb_build_object('success', true, 'op_id', p_op_id, 'already_finalized', true);
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_CLOSED', 'status', v_existing_res.status);
        END IF;
    END IF;

    -- 2. Lock profile row for update
    SELECT COALESCE(scan_credits, 0) INTO v_current_credits 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- 3. Calculate active reservations
    SELECT COALESCE(SUM(amount), 0) INTO v_active_reserved
    FROM public.credit_reservations
    WHERE user_id = p_user_id AND status = 'reserved' AND expires_at > timezone('utc'::text, now());

    v_available_credits := v_current_credits - v_active_reserved;

    IF v_available_credits < p_amount THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'INSUFFICIENT_CREDITS', 
            'available_credits', v_available_credits,
            'required_credits', p_amount
        );
    END IF;

    -- 4. Record new reservation with 5-minute timeout
    INSERT INTO public.credit_reservations (user_id, op_id, amount, action, status, description, expires_at)
    VALUES (p_user_id, p_op_id, p_amount, p_action, 'reserved', p_description, timezone('utc'::text, now()) + interval '5 minutes');

    RETURN jsonb_build_object(
        'success', true, 
        'op_id', p_op_id, 
        'amount', p_amount,
        'available_credits_after', v_available_credits - p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: finalize_reservation
CREATE OR REPLACE FUNCTION public.finalize_reservation(
    p_user_id UUID,
    p_op_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_res RECORD;
    v_new_balance INT;
BEGIN
    -- 1. Lock reservation row
    SELECT * INTO v_res 
    FROM public.credit_reservations 
    WHERE user_id = p_user_id AND op_id = p_op_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_NOT_FOUND');
    END IF;

    IF v_res.status = 'finalized' THEN
        SELECT scan_credits INTO v_new_balance FROM public.profiles WHERE id = p_user_id;
        RETURN jsonb_build_object('success', true, 'already_finalized', true, 'new_balance', v_new_balance);
    END IF;

    IF v_res.status <> 'reserved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS', 'status', v_res.status);
    END IF;

    -- 2. Lock profile row & update balance
    UPDATE public.profiles
    SET scan_credits = scan_credits - v_res.amount
    WHERE id = p_user_id
    RETURNING scan_credits INTO v_new_balance;

    -- 3. Write to credit_ledger
    INSERT INTO public.credit_ledger (user_id, amount, balance_after, action, reference_id, description)
    VALUES (p_user_id, -v_res.amount, v_new_balance, v_res.action, p_op_id, v_res.description);

    -- 4. Mark reservation as finalized
    UPDATE public.credit_reservations
    SET status = 'finalized'
    WHERE id = v_res.id;

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: release_reservation
CREATE OR REPLACE FUNCTION public.release_reservation(
    p_user_id UUID,
    p_op_id TEXT,
    p_reason TEXT DEFAULT 'Operation cancelled or failed'
)
RETURNS JSONB AS $$
DECLARE
    v_res RECORD;
BEGIN
    SELECT * INTO v_res 
    FROM public.credit_reservations 
    WHERE user_id = p_user_id AND op_id = p_op_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_NOT_FOUND');
    END IF;

    IF v_res.status = 'released' THEN
        RETURN jsonb_build_object('success', true, 'already_released', true);
    END IF;

    IF v_res.status <> 'reserved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'CANNOT_RELEASE', 'status', v_res.status);
    END IF;

    UPDATE public.credit_reservations 
    SET status = 'released', description = description || ' | Released: ' || p_reason 
    WHERE id = v_res.id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: fulfill_purchase
CREATE OR REPLACE FUNCTION public.fulfill_purchase(
    p_user_id UUID,
    p_pack_id TEXT,
    p_amount_credits INT,
    p_reference_id TEXT,
    p_amount_paid_inr NUMERIC,
    p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_existing_id UUID;
    v_new_balance INT;
BEGIN
    IF p_amount_credits <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_CREDIT_AMOUNT');
    END IF;

    -- 1. Check idempotency in ledger
    SELECT id INTO v_existing_id 
    FROM public.credit_ledger 
    WHERE user_id = p_user_id AND reference_id = p_reference_id AND action = 'purchase';

    IF FOUND THEN
        SELECT scan_credits INTO v_new_balance FROM public.profiles WHERE id = p_user_id;
        RETURN jsonb_build_object('success', true, 'already_fulfilled', true, 'total_credits', v_new_balance);
    END IF;

    -- 2. Lock profile & update balance
    UPDATE public.profiles
    SET 
        scan_credits = COALESCE(scan_credits, 0) + p_amount_credits,
        plan = 'pro',
        plan_type = p_pack_id,
        razorpay_subscription_id = p_reference_id
    WHERE id = p_user_id
    RETURNING scan_credits INTO v_new_balance;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- 3. Insert into credit_ledger
    INSERT INTO public.credit_ledger (user_id, amount, balance_after, action, reference_id, description)
    VALUES (p_user_id, p_amount_credits, v_new_balance, 'purchase', p_reference_id, p_description);

    RETURN jsonb_build_object('success', true, 'credits_added', p_amount_credits, 'total_credits', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: refund_credits
CREATE OR REPLACE FUNCTION public.refund_credits(
    p_user_id UUID,
    p_amount INT,
    p_reference_id TEXT,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_new_balance INT;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_REFUND_AMOUNT');
    END IF;

    UPDATE public.profiles
    SET scan_credits = COALESCE(scan_credits, 0) + p_amount
    WHERE id = p_user_id
    RETURNING scan_credits INTO v_new_balance;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    INSERT INTO public.credit_ledger (user_id, amount, balance_after, action, reference_id, description)
    VALUES (p_user_id, p_amount, v_new_balance, 'refund', p_reference_id, p_reason);

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: approve_manual_payment
CREATE OR REPLACE FUNCTION public.approve_manual_payment(
    p_payment_id UUID,
    p_admin_id UUID,
    p_credits_to_grant INT DEFAULT 100
)
RETURNS JSONB AS $$
DECLARE
    v_payment RECORD;
    v_new_balance INT;
BEGIN
    -- 1. Lock pending payment
    SELECT * INTO v_payment 
    FROM public.pending_payments 
    WHERE id = p_payment_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYMENT_NOT_FOUND');
    END IF;

    IF v_payment.status <> 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYMENT_ALREADY_PROCESSED', 'status', v_payment.status);
    END IF;

    -- 2. Update payment status
    UPDATE public.pending_payments
    SET status = 'approved', updated_at = timezone('utc'::text, now())
    WHERE id = p_payment_id;

    -- 3. Atomically fulfill purchase
    UPDATE public.profiles
    SET 
        scan_credits = COALESCE(scan_credits, 0) + p_credits_to_grant,
        plan = 'pro',
        plan_type = v_payment.plan_type,
        razorpay_subscription_id = COALESCE(v_payment.utr, p_payment_id::text)
    WHERE id = v_payment.user_id
    RETURNING scan_credits INTO v_new_balance;

    INSERT INTO public.credit_ledger (user_id, amount, balance_after, action, reference_id, description)
    VALUES (
        v_payment.user_id, 
        p_credits_to_grant, 
        v_new_balance, 
        'purchase', 
        COALESCE(v_payment.utr, p_payment_id::text), 
        'Approved manual UPI transfer: UTR ' || COALESCE(v_payment.utr, 'N/A') || ' (' || p_credits_to_grant || ' credits)'
    );

    RETURN jsonb_build_object('success', true, 'total_credits', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: cleanup_expired_reservations
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS INT AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE public.credit_reservations
    SET status = 'expired'
    WHERE status = 'reserved' AND expires_at <= timezone('utc'::text, now());
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. UPDATE USER CREATION TRIGGER FOR INITIAL CREDITS (5 free scans)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, plan, plan_type, scan_credits)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        'free',
        'free',
        5
    ) ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
