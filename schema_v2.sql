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

-- 1.1 SCANS TABLE CONSTRAINT ADJUSTMENTS (Preserve null/insufficient evidence health scores & idempotent ops)
ALTER TABLE public.scans 
  ALTER COLUMN health_score DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS op_id TEXT,
  ADD COLUMN IF NOT EXISTS accounting_status TEXT DEFAULT 'completed';

ALTER TABLE public.scans 
  DROP CONSTRAINT IF EXISTS scans_health_score_check;

ALTER TABLE public.scans 
  ADD CONSTRAINT scans_health_score_check 
  CHECK (health_score IS NULL OR (health_score >= 0 AND health_score <= 100));

ALTER TABLE public.scans 
  DROP CONSTRAINT IF EXISTS scans_safety_level_check;

ALTER TABLE public.scans 
  ADD CONSTRAINT scans_safety_level_check 
  CHECK (safety_level IN ('safe', 'moderate', 'danger', 'insufficient_evidence'));

CREATE INDEX IF NOT EXISTS idx_scans_user_op_id ON public.scans(user_id, op_id);

-- 1.2 PENDING PAYMENTS AUDIT COLUMNS & UNIQUE UTR
ALTER TABLE public.pending_payments 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_payments_utr 
  ON public.pending_payments(utr) 
  WHERE utr IS NOT NULL;

-- 1.3 MEAL COMPOSITIONS AUDIT COLUMNS
ALTER TABLE public.meal_compositions
  ADD COLUMN IF NOT EXISTS op_id TEXT;

CREATE INDEX IF NOT EXISTS idx_meal_compositions_user_op_id ON public.meal_compositions(user_id, op_id);

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
    payment_id TEXT,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'fulfilled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
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

-- Unique index to enforce refund idempotency per reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_refund_idempotency 
    ON public.credit_ledger (user_id, reference_id) 
    WHERE action = 'refund' AND reference_id IS NOT NULL;

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own credit ledger" ON public.credit_ledger;
CREATE POLICY "Users can view their own credit ledger"
    ON public.credit_ledger FOR SELECT
    USING (auth.uid() = user_id);

-- 5. HARDEN TABLE-LEVEL & COLUMN-LEVEL PERMISSIONS (Prevent privilege escalation)
REVOKE INSERT, UPDATE, DELETE ON public.credit_ledger FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.credit_reservations FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.payment_orders FROM anon, authenticated;

REVOKE UPDATE (plan, plan_type, scan_credits, scans_today, scans_reset_at, razorpay_subscription_id) 
    ON public.profiles FROM authenticated;

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update non-sensitive fields in their own profile" ON public.profiles;

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

    -- 1. Check if reservation with op_id already exists (idempotency + conflict check)
    SELECT * INTO v_existing_res 
    FROM public.credit_reservations 
    WHERE user_id = p_user_id AND op_id = p_op_id;

    IF FOUND THEN
        -- Verify that op_id is not being reused with conflicting parameters
        IF v_existing_res.amount <> p_amount OR v_existing_res.action <> p_action THEN
            RETURN jsonb_build_object('success', false, 'error', 'CONFLICTING_OP_ID', 'message', 'Operation ID was previously used with a different amount or action.');
        END IF;

        IF v_existing_res.status = 'reserved' THEN
            IF v_existing_res.expires_at <= timezone('utc'::text, now()) THEN
                UPDATE public.credit_reservations SET status = 'expired' WHERE id = v_existing_res.id;
                RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_EXPIRED', 'message', 'Previous reservation has expired.');
            END IF;
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

    -- 3. Calculate active reservations (ignoring expired ones)
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
    v_current_credits INT;
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

    IF v_res.status = 'expired' OR (v_res.status = 'reserved' AND v_res.expires_at <= timezone('utc'::text, now())) THEN
        UPDATE public.credit_reservations SET status = 'expired' WHERE id = v_res.id;
        RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_EXPIRED', 'message', 'Cannot finalize an expired reservation.');
    END IF;

    IF v_res.status <> 'reserved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS', 'status', v_res.status);
    END IF;

    -- 2. Lock profile row & update balance using stored reservation amount
    SELECT COALESCE(scan_credits, 0) INTO v_current_credits
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_credits < v_res.amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'current_balance', v_current_credits);
    END IF;

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
    v_already_refunded BOOLEAN;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_REFUND_AMOUNT');
    END IF;

    -- Check if this reference has already been refunded
    IF p_reference_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM public.credit_ledger 
            WHERE user_id = p_user_id AND reference_id = p_reference_id AND action = 'refund'
        ) INTO v_already_refunded;

        IF v_already_refunded THEN
            SELECT scan_credits INTO v_new_balance FROM public.profiles WHERE id = p_user_id;
            RETURN jsonb_build_object('success', true, 'already_refunded', true, 'new_balance', v_new_balance);
        END IF;
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
    SET 
        status = 'approved', 
        approved_by = p_admin_id,
        approved_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
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

-- Function: reject_manual_payment
CREATE OR REPLACE FUNCTION public.reject_manual_payment(
    p_payment_id UUID,
    p_admin_id UUID,
    p_reason TEXT DEFAULT 'Payment rejected by admin'
)
RETURNS JSONB AS $$
DECLARE
    v_payment RECORD;
BEGIN
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

    UPDATE public.pending_payments
    SET 
        status = 'rejected', 
        approved_by = p_admin_id,
        approved_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_payment_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: fulfill_order_payment
CREATE OR REPLACE FUNCTION public.fulfill_order_payment(
    p_order_id TEXT,
    p_payment_id TEXT,
    p_credits_to_grant INT,
    p_pack_id TEXT,
    p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_new_balance INT;
    v_already_fulfilled BOOLEAN;
BEGIN
    -- 1. Lock payment order
    SELECT * INTO v_order 
    FROM public.payment_orders 
    WHERE id = p_order_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    IF v_order.status = 'fulfilled' THEN
        SELECT scan_credits INTO v_new_balance FROM public.profiles WHERE id = v_order.user_id;
        RETURN jsonb_build_object('success', true, 'already_fulfilled', true, 'total_credits', v_new_balance);
    END IF;

    -- 2. Check if ledger already recorded this order
    SELECT EXISTS(
        SELECT 1 FROM public.credit_ledger 
        WHERE user_id = v_order.user_id AND reference_id = p_order_id AND action = 'purchase'
    ) INTO v_already_fulfilled;

    IF v_already_fulfilled THEN
        UPDATE public.payment_orders 
        SET status = 'fulfilled', payment_id = COALESCE(p_payment_id, payment_id), updated_at = timezone('utc'::text, now()) 
        WHERE id = p_order_id;

        SELECT scan_credits INTO v_new_balance FROM public.profiles WHERE id = v_order.user_id;
        RETURN jsonb_build_object('success', true, 'already_fulfilled', true, 'total_credits', v_new_balance);
    END IF;

    -- 3. Lock profile & credit balance
    UPDATE public.profiles
    SET 
        scan_credits = COALESCE(scan_credits, 0) + p_credits_to_grant,
        plan = 'pro',
        plan_type = p_pack_id,
        razorpay_subscription_id = p_order_id
    WHERE id = v_order.user_id
    RETURNING scan_credits INTO v_new_balance;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- 4. Record in credit ledger
    INSERT INTO public.credit_ledger (user_id, amount, balance_after, action, reference_id, description)
    VALUES (v_order.user_id, p_credits_to_grant, v_new_balance, 'purchase', p_order_id, p_description);

    -- 5. Mark payment order fulfilled
    UPDATE public.payment_orders
    SET 
        status = 'fulfilled',
        payment_id = COALESCE(p_payment_id, payment_id),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true, 'credits_added', p_credits_to_grant, 'total_credits', v_new_balance);
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

-- 9. NARROW PERMISSIONS HARDENING (Strict service_role execution for transactional functions)
REVOKE EXECUTE ON FUNCTION public.reserve_credits(UUID, INT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_reservation(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_reservation(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_purchase(UUID, TEXT, INT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_credits(UUID, INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_manual_payment(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_manual_payment(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_order_payment(TEXT, TEXT, INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_reservations() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_credits(UUID, INT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_reservation(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_reservation(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_purchase(UUID, TEXT, INT, TEXT, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(UUID, INT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_manual_payment(UUID, UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_manual_payment(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_order_payment(TEXT, TEXT, INT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reservations() TO service_role;
