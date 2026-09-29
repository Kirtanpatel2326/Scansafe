-- ==========================================================
-- SCANSAFE V2 DATABASE SCHEMA MIGRATION
-- Transactional Credit Ledger, Authoritative Operations, RLS Hardening, & Evidence Cache
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

-- Safe migration deduplication & reconciliation: quarantine duplicate op_id by setting op_id = NULL instead of deleting scans
WITH ranked_scans AS (
    SELECT id, user_id, op_id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, op_id 
               ORDER BY 
                   CASE WHEN accounting_status = 'completed' THEN 1 ELSE 2 END,
                   created_at DESC
           ) as rn
    FROM public.scans
    WHERE op_id IS NOT NULL
)
UPDATE public.scans
SET op_id = NULL
WHERE id IN (
    SELECT id FROM ranked_scans WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scans_user_op_id_unique ON public.scans(user_id, op_id) WHERE op_id IS NOT NULL;

-- 1.2 PENDING PAYMENTS AUDIT COLUMNS & UNIQUE UTR
ALTER TABLE public.pending_payments 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_payments_utr 
  ON public.pending_payments(utr) 
  WHERE utr IS NOT NULL;

-- 1.3 MEAL COMPOSITIONS AUDIT COLUMNS
ALTER TABLE public.meal_compositions
  ADD COLUMN IF NOT EXISTS op_id TEXT,
  ADD COLUMN IF NOT EXISTS accounting_status TEXT DEFAULT 'completed';

WITH ranked_meals AS (
    SELECT id, user_id, op_id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, op_id 
               ORDER BY 
                   CASE WHEN accounting_status = 'completed' THEN 1 ELSE 2 END,
                   created_at DESC
           ) as rn
    FROM public.meal_compositions
    WHERE op_id IS NOT NULL
)
UPDATE public.meal_compositions
SET op_id = NULL
WHERE id IN (
    SELECT id FROM ranked_meals WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_compositions_user_op_id_unique ON public.meal_compositions(user_id, op_id) WHERE op_id IS NOT NULL;

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

-- 2.1 AUTHORITATIVE SERVER-OWNED OPERATIONS TABLE
CREATE TABLE IF NOT EXISTS public.operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    op_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('scan', 'compare', 'meal_compose', 'meal_composer')),
    credit_cost INTEGER NOT NULL CHECK (credit_cost >= 0),
    payload_hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'accounting_pending')),
    worker_id TEXT,
    claim_seq INTEGER NOT NULL DEFAULT 1,
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    result JSONB,
    error_message TEXT,
    accounting_status TEXT NOT NULL DEFAULT 'none' CHECK (accounting_status IN ('none', 'reserved', 'finalized', 'released', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.operations ADD COLUMN IF NOT EXISTS claim_seq INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_user_op_id ON public.operations(user_id, op_id);
CREATE INDEX IF NOT EXISTS idx_operations_status_lease ON public.operations(user_id, status, lease_expires_at);

ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own operations" ON public.operations;
CREATE POLICY "Users can view their own operations"
    ON public.operations FOR SELECT
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
    action TEXT NOT NULL CHECK (action IN ('purchase', 'scan', 'compare', 'meal_compose', 'meal_composer', 'bonus', 'refund', 'initial_grant')),
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
REVOKE ALL ON public.credit_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.credit_ledger TO authenticated;

REVOKE ALL ON public.credit_reservations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.credit_reservations TO authenticated;

REVOKE ALL ON public.operations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.operations TO authenticated;

REVOKE ALL ON public.payment_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.payment_orders TO authenticated;

-- PostgreSQL Table vs Column Grant Hardening: Revoke table-level UPDATE/INSERT, then grant column-level UPDATE
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated, anon;
GRANT UPDATE (full_name, dietary_profile) ON public.profiles TO authenticated;

-- Hardening shared cache: revoke write access from client roles
REVOKE INSERT, UPDATE, DELETE ON public.products_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.products_cache TO PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Authenticated users can cache products" ON public.products_cache;

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update non-sensitive fields in their own profile" ON public.profiles;

CREATE POLICY "Allow users to update non-sensitive fields in their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 6. PRODUCTS CACHE SCHEMA 2.0 & QUARANTINE
ALTER TABLE public.products_cache
    ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT '2.0',
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ocr',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Quarantine legacy cache records created under older schema versions
UPDATE public.products_cache
SET schema_version = 'legacy_quarantined'
WHERE schema_version IS NULL OR schema_version < '2.0';

-- 7. ATOMIC DATABASE RPC FUNCTIONS (SECURITY DEFINER)

-- Function: reserve_credits (Consistent Lock Order & Available Credit Protection)
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

    -- 1. Consistent Lock Order: Lock parent profile row FOR UPDATE first
    SELECT COALESCE(scan_credits, 0) INTO v_current_credits 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- 2. Calculate active unexpired reservations held across all operations for this user
    SELECT COALESCE(SUM(amount), 0) INTO v_active_reserved
    FROM public.credit_reservations
    WHERE user_id = p_user_id AND status = 'reserved' AND expires_at > timezone('utc'::text, now());

    v_available_credits := v_current_credits - v_active_reserved;

    -- 3. Check if reservation with op_id already exists (idempotency + conflict check)
    SELECT * INTO v_existing_res 
    FROM public.credit_reservations 
    WHERE user_id = p_user_id AND op_id = p_op_id
    FOR UPDATE;

    IF FOUND THEN
        -- Verify that op_id is not being reused with conflicting parameters
        IF v_existing_res.amount <> p_amount OR v_existing_res.action <> p_action THEN
            RETURN jsonb_build_object('success', false, 'error', 'CONFLICTING_OP_ID', 'message', 'Operation ID was previously used with a different amount or action.');
        END IF;

        IF v_existing_res.status = 'finalized' THEN
            RETURN jsonb_build_object('success', true, 'op_id', p_op_id, 'already_finalized', true);
        END IF;

        IF v_existing_res.status = 'reserved' AND v_existing_res.expires_at > timezone('utc'::text, now()) THEN
            -- Active unexpired reservation already held: idempotent pass
            RETURN jsonb_build_object('success', true, 'op_id', p_op_id, 'already_reserved', true, 'available_credits_after', v_available_credits);
        END IF;

        -- Reopening an expired or released reservation requires acquiring new hold against available credits
        IF v_available_credits < p_amount THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'INSUFFICIENT_CREDITS', 
                'available_credits', v_available_credits,
                'required_credits', p_amount
            );
        END IF;

        UPDATE public.credit_reservations 
        SET status = 'reserved', 
            amount = p_amount,
            action = p_action,
            expires_at = timezone('utc'::text, now()) + interval '5 minutes',
            description = p_description
        WHERE id = v_existing_res.id;

        RETURN jsonb_build_object('success', true, 'op_id', p_op_id, 'amount', p_amount, 'reopened', true, 'available_credits_after', v_available_credits - p_amount);
    END IF;

    -- 4. New reservation: ensure available credits cover amount
    IF v_available_credits < p_amount THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'INSUFFICIENT_CREDITS', 
            'available_credits', v_available_credits,
            'required_credits', p_amount
        );
    END IF;

    -- Record new reservation with 5-minute timeout
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

-- Function: finalize_reservation (Active Protection & Expired Isolation)
CREATE OR REPLACE FUNCTION public.finalize_reservation(
    p_user_id UUID,
    p_op_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_res RECORD;
    v_current_credits INT;
    v_active_reserved_other INT;
    v_available_credits INT;
    v_new_balance INT;
BEGIN
    -- 1. Consistent Lock Order: Lock parent profile row FOR UPDATE first
    SELECT COALESCE(scan_credits, 0) INTO v_current_credits
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- 2. Lock reservation row
    SELECT * INTO v_res 
    FROM public.credit_reservations 
    WHERE user_id = p_user_id AND op_id = p_op_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_NOT_FOUND');
    END IF;

    IF v_res.status = 'finalized' THEN
        RETURN jsonb_build_object('success', true, 'already_finalized', true, 'new_balance', v_current_credits);
    END IF;

    IF v_res.status = 'released' THEN
        RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_RELEASED', 'message', 'Cannot finalize a released reservation.');
    END IF;

    -- Check if reservation is actively held
    IF v_res.status = 'reserved' AND v_res.expires_at > timezone('utc'::text, now()) THEN
        -- Valid active hold: check balance is sufficient
        IF v_current_credits < v_res.amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'current_balance', v_current_credits);
        END IF;

        UPDATE public.profiles
        SET scan_credits = scan_credits - v_res.amount
        WHERE id = p_user_id
        RETURNING scan_credits INTO v_new_balance;

        -- Write to credit_ledger
        INSERT INTO public.credit_ledger (user_id, amount, balance_after, action, reference_id, description)
        VALUES (p_user_id, -v_res.amount, v_new_balance, v_res.action, p_op_id, v_res.description);

        -- Mark reservation as finalized
        UPDATE public.credit_reservations
        SET status = 'finalized'
        WHERE id = v_res.id;

        RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
    END IF;

    -- If reservation is expired: it lost its entitlement to reserved credits.
    -- We must verify that spendable credits protecting OTHER active reservations are sufficient.
    SELECT COALESCE(SUM(amount), 0) INTO v_active_reserved_other
    FROM public.credit_reservations
    WHERE user_id = p_user_id AND status = 'reserved' AND expires_at > timezone('utc'::text, now()) AND id <> v_res.id;

    v_available_credits := v_current_credits - v_active_reserved_other;

    IF v_available_credits < v_res.amount THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'INSUFFICIENT_CREDITS', 
            'message', 'Reservation expired and remaining credits are reserved by other operations.',
            'available_credits', v_available_credits,
            'required', v_res.amount
        );
    END IF;

    UPDATE public.profiles
    SET scan_credits = scan_credits - v_res.amount
    WHERE id = p_user_id
    RETURNING scan_credits INTO v_new_balance;

    INSERT INTO public.credit_ledger (user_id, amount, balance_after, action, reference_id, description)
    VALUES (p_user_id, -v_res.amount, v_new_balance, v_res.action, p_op_id, v_res.description || ' (Expired Hold Finalization)');

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
    PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;

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

    IF v_res.status = 'finalized' THEN
        RETURN jsonb_build_object('success', false, 'error', 'CANNOT_RELEASE_FINALIZED');
    END IF;

    UPDATE public.credit_reservations 
    SET status = 'released', description = description || ' | Released: ' || p_reason 
    WHERE id = v_res.id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: claim_operation (Atomic Processing Ownership, Lease & Fencing Token)
CREATE OR REPLACE FUNCTION public.claim_operation(
    p_user_id UUID,
    p_op_id TEXT,
    p_action TEXT,
    p_credit_cost INT,
    p_payload_hash TEXT,
    p_worker_id TEXT,
    p_lease_seconds INT DEFAULT 120
)
RETURNS JSONB AS $$
DECLARE
    v_current_credits INT;
    v_active_reserved INT;
    v_available_credits INT;
    v_op RECORD;
    v_lease_expiry TIMESTAMPTZ;
    v_new_seq INT;
BEGIN
    IF p_credit_cost < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_CREDIT_COST');
    END IF;

    v_lease_expiry := timezone('utc'::text, now()) + (p_lease_seconds || ' seconds')::interval;

    -- 1. Lock profile row FOR UPDATE first
    SELECT COALESCE(scan_credits, 0) INTO v_current_credits 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- 2. Check operations table for existing record
    SELECT * INTO v_op
    FROM public.operations
    WHERE user_id = p_user_id AND op_id = p_op_id
    FOR UPDATE;

    IF FOUND THEN
        -- Check payload hash to prevent key reuse with different inputs
        IF v_op.payload_hash <> p_payload_hash THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'IDEMPOTENCY_CONFLICT', 
                'message', 'Idempotency key was previously used with a different request payload.'
            );
        END IF;

        IF v_op.status = 'completed' THEN
            RETURN jsonb_build_object(
                'success', true, 
                'status', 'completed', 
                'already_completed', true, 
                'result', v_op.result,
                'accounting_status', v_op.accounting_status,
                'fencing_token', v_op.claim_seq
            );
        END IF;

        IF v_op.status = 'accounting_pending' THEN
            RETURN jsonb_build_object(
                'success', true, 
                'status', 'accounting_pending', 
                'accounting_pending', true, 
                'result', v_op.result,
                'fencing_token', v_op.claim_seq
            );
        END IF;

        IF v_op.status = 'processing' THEN
            -- Check if lease is still active by another worker
            IF v_op.lease_expires_at > timezone('utc'::text, now()) AND v_op.worker_id <> p_worker_id THEN
                RETURN jsonb_build_object(
                    'success', false, 
                    'error', 'OPERATION_IN_PROGRESS', 
                    'message', 'Another worker is actively processing this operation.'
                );
            END IF;

            -- Re-validate available balance and refresh reservation if credit_cost > 0
            IF p_credit_cost > 0 THEN
                SELECT COALESCE(SUM(amount), 0) INTO v_active_reserved
                FROM public.credit_reservations
                WHERE user_id = p_user_id AND status = 'reserved' AND expires_at > timezone('utc'::text, now()) AND op_id <> p_op_id;

                v_available_credits := v_current_credits - v_active_reserved;
                IF v_available_credits < p_credit_cost THEN
                    RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'available_credits', v_available_credits);
                END IF;

                INSERT INTO public.credit_reservations (user_id, op_id, amount, action, status, description, expires_at)
                VALUES (p_user_id, p_op_id, p_credit_cost, p_action, 'reserved', 'Reserved for ' || p_action, timezone('utc'::text, now()) + interval '5 minutes')
                ON CONFLICT (user_id, op_id) DO UPDATE
                SET status = 'reserved', amount = p_credit_cost, action = p_action, expires_at = timezone('utc'::text, now()) + interval '5 minutes';
            END IF;

            -- Worker lease expired or same worker re-claiming: increment fencing sequence
            v_new_seq := COALESCE(v_op.claim_seq, 1) + 1;
            UPDATE public.operations
            SET worker_id = p_worker_id,
                lease_expires_at = v_lease_expiry,
                claim_seq = v_new_seq,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_op.id;

            RETURN jsonb_build_object('success', true, 'status', 'processing', 'claimed', true, 'op_id', p_op_id, 'fencing_token', v_new_seq);
        END IF;

        -- If status is 'failed' or 'pending', allow re-claiming
        IF p_credit_cost > 0 THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_active_reserved
            FROM public.credit_reservations
            WHERE user_id = p_user_id AND status = 'reserved' AND expires_at > timezone('utc'::text, now()) AND op_id <> p_op_id;

            v_available_credits := v_current_credits - v_active_reserved;
            IF v_available_credits < p_credit_cost THEN
                RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'available_credits', v_available_credits);
            END IF;
        END IF;

        v_new_seq := COALESCE(v_op.claim_seq, 1) + 1;
        UPDATE public.operations
        SET status = 'processing',
            worker_id = p_worker_id,
            claim_seq = v_new_seq,
            lease_expires_at = v_lease_expiry,
            error_message = NULL,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_op.id;

        -- Ensure reservation exists if credit_cost > 0
        IF p_credit_cost > 0 THEN
            INSERT INTO public.credit_reservations (user_id, op_id, amount, action, status, description, expires_at)
            VALUES (p_user_id, p_op_id, p_credit_cost, p_action, 'reserved', 'Reserved for ' || p_action, timezone('utc'::text, now()) + interval '5 minutes')
            ON CONFLICT (user_id, op_id) DO UPDATE
            SET status = 'reserved', amount = p_credit_cost, expires_at = timezone('utc'::text, now()) + interval '5 minutes';
        END IF;

        RETURN jsonb_build_object('success', true, 'status', 'processing', 'claimed', true, 'op_id', p_op_id, 'fencing_token', v_new_seq);
    END IF;

    -- 3. New operation: verify available credits if cost > 0
    IF p_credit_cost > 0 THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_active_reserved
        FROM public.credit_reservations
        WHERE user_id = p_user_id AND status = 'reserved' AND expires_at > timezone('utc'::text, now());

        v_available_credits := v_current_credits - v_active_reserved;

        IF v_available_credits < p_credit_cost THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'INSUFFICIENT_CREDITS', 
                'available_credits', v_available_credits,
                'required_credits', p_credit_cost
            );
        END IF;

        INSERT INTO public.credit_reservations (user_id, op_id, amount, action, status, description, expires_at)
        VALUES (p_user_id, p_op_id, p_credit_cost, p_action, 'reserved', 'Reserved for ' || p_action, timezone('utc'::text, now()) + interval '5 minutes');
    END IF;

    INSERT INTO public.operations (
        user_id, op_id, action, credit_cost, payload_hash, status, worker_id, claim_seq, lease_expires_at, accounting_status
    )
    VALUES (
        p_user_id, p_op_id, p_action, p_credit_cost, p_payload_hash, 'processing', p_worker_id, 1, v_lease_expiry, 
        CASE WHEN p_credit_cost > 0 THEN 'reserved' ELSE 'none' END
    );

    RETURN jsonb_build_object('success', true, 'status', 'processing', 'claimed', true, 'op_id', p_op_id, 'fencing_token', 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop obsolete overloads
DROP FUNCTION IF EXISTS public.save_operation_result_and_finalize(UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.save_operation_result_and_finalize(UUID, TEXT, TEXT, JSONB);

-- Function: save_operation_result_and_finalize
CREATE OR REPLACE FUNCTION public.save_operation_result_and_finalize(
    p_user_id UUID,
    p_op_id TEXT,
    p_worker_id TEXT,
    p_result JSONB,
    p_fencing_token INT
)
RETURNS JSONB AS $$
DECLARE
    v_op RECORD;
    v_res RECORD;
    v_current_credits INT;
    v_active_reserved_other INT;
    v_available_credits INT;
    v_new_balance INT;
BEGIN
    -- 1. Lock profile row FOR UPDATE first
    SELECT COALESCE(scan_credits, 0) INTO v_current_credits 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    -- 2. Lock operation row
    SELECT * INTO v_op
    FROM public.operations
    WHERE user_id = p_user_id AND op_id = p_op_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'OPERATION_NOT_FOUND');
    END IF;

    -- Verify worker ID and fencing token
    IF p_worker_id IS NULL OR TRIM(p_worker_id) = '' OR p_fencing_token IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_WORKER_PARAMS', 'message', 'Worker ID and fencing token are strictly required.');
    END IF;

    -- Strict worker ownership & generation matching regardless of lease expiry
    IF v_op.claim_seq <> p_fencing_token OR v_op.worker_id <> p_worker_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'STALE_WORKER_REJECTED', 'message', 'Worker ownership or fencing token does not match active operation.');
    END IF;

    IF v_op.status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'already_completed', true, 'new_balance', v_current_credits);
    END IF;

    -- Save durable result first
    UPDATE public.operations
    SET result = p_result,
        status = 'accounting_pending',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_op.id;

    -- If operation is 0-cost (e.g. sample or free), mark completed directly
    IF v_op.credit_cost = 0 THEN
        UPDATE public.operations
        SET status = 'completed',
            accounting_status = 'finalized',
            completed_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_op.id;
        RETURN jsonb_build_object('success', true, 'new_balance', v_current_credits);
    END IF;

    -- 3. Lock credit reservation row
    SELECT * INTO v_res
    FROM public.credit_reservations
    WHERE user_id = p_user_id AND op_id = p_op_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_NOT_FOUND');
    END IF;

    IF v_res.status = 'finalized' THEN
        UPDATE public.operations
        SET status = 'completed',
            accounting_status = 'finalized',
            completed_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_op.id;
        RETURN jsonb_build_object('success', true, 'already_finalized', true, 'new_balance', v_current_credits);
    END IF;

    -- Check available credits for finalization
    IF v_res.status = 'reserved' AND v_res.expires_at > timezone('utc'::text, now()) THEN
        IF v_current_credits < v_res.amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'current_balance', v_current_credits);
        END IF;
    ELSE
        -- Expired hold: ensure other active reservations are not encroached
        SELECT COALESCE(SUM(amount), 0) INTO v_active_reserved_other
        FROM public.credit_reservations
        WHERE user_id = p_user_id AND status = 'reserved' AND expires_at > timezone('utc'::text, now()) AND id <> v_res.id;

        v_available_credits := v_current_credits - v_active_reserved_other;
        IF v_available_credits < v_res.amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'available_credits', v_available_credits);
        END IF;
    END IF;

    -- Atomic debit
    UPDATE public.profiles
    SET scan_credits = scan_credits - v_res.amount
    WHERE id = p_user_id
    RETURNING scan_credits INTO v_new_balance;

    -- Insert into credit_ledger
    INSERT INTO public.credit_ledger (user_id, amount, balance_after, action, reference_id, description)
    VALUES (p_user_id, -v_res.amount, v_new_balance, v_res.action, p_op_id, v_res.description);

    -- Mark reservation and operation finalized/completed
    UPDATE public.credit_reservations
    SET status = 'finalized'
    WHERE id = v_res.id;

    UPDATE public.operations
    SET status = 'completed',
        accounting_status = 'finalized',
        completed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_op.id;

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop obsolete overloads
DROP FUNCTION IF EXISTS public.release_operation_on_failure(UUID, TEXT);
DROP FUNCTION IF EXISTS public.release_operation_on_failure(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.release_operation_on_failure(UUID, TEXT, TEXT, TEXT);

-- Function: release_operation_on_failure
CREATE OR REPLACE FUNCTION public.release_operation_on_failure(
    p_user_id UUID,
    p_op_id TEXT,
    p_worker_id TEXT,
    p_error_message TEXT,
    p_fencing_token INT
)
RETURNS JSONB AS $$
DECLARE
    v_op RECORD;
    v_res RECORD;
BEGIN
    PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;

    SELECT * INTO v_op
    FROM public.operations
    WHERE user_id = p_user_id AND op_id = p_op_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'OPERATION_NOT_FOUND');
    END IF;

    IF v_op.status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'already_completed', true);
    END IF;

    -- Verify worker ID and fencing token
    IF p_worker_id IS NULL OR TRIM(p_worker_id) = '' OR p_fencing_token IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_WORKER_PARAMS', 'message', 'Worker ID and fencing token are strictly required.');
    END IF;

    -- Strict worker ownership & generation matching regardless of lease expiry
    IF v_op.claim_seq <> p_fencing_token OR v_op.worker_id <> p_worker_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'STALE_WORKER_REJECTED', 'message', 'Worker ownership or fencing token does not match active operation.');
    END IF;

    UPDATE public.operations
    SET status = 'failed',
        error_message = p_error_message,
        accounting_status = 'released',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_op.id;

    -- Release reservation if active
    SELECT * INTO v_res
    FROM public.credit_reservations
    WHERE user_id = p_user_id AND op_id = p_op_id
    FOR UPDATE;

    IF FOUND AND v_res.status = 'reserved' THEN
        UPDATE public.credit_reservations
        SET status = 'released',
            description = description || ' | Released on failure: ' || p_error_message
        WHERE id = v_res.id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: recover_operation_accounting
CREATE OR REPLACE FUNCTION public.recover_operation_accounting(
    p_user_id UUID,
    p_op_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_op RECORD;
    v_res RECORD;
    v_current_credits INT;
    v_active_reserved_other INT;
    v_available_credits INT;
    v_new_balance INT;
BEGIN
    SELECT COALESCE(scan_credits, 0) INTO v_current_credits 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    END IF;

    SELECT * INTO v_op
    FROM public.operations
    WHERE user_id = p_user_id AND op_id = p_op_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'OPERATION_NOT_FOUND');
    END IF;

    IF v_op.status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'already_completed', true, 'new_balance', v_current_credits, 'result', v_op.result);
    END IF;

    IF v_op.status <> 'accounting_pending' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'INVALID_OPERATION_STATUS', 
            'message', 'Operation must be in accounting_pending status to recover accounting. Current status: ' || v_op.status
        );
    END IF;

    IF v_op.result IS NULL OR jsonb_typeof(v_op.result) <> 'object' THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'INVALID_OPERATION_RESULT', 
            'message', 'Operation does not have a valid durable result object.'
        );
    END IF;

    IF v_op.credit_cost = 0 THEN
        UPDATE public.operations
        SET status = 'completed', accounting_status = 'finalized', completed_at = timezone('utc'::text, now())
        WHERE id = v_op.id;
        RETURN jsonb_build_object('success', true, 'new_balance', v_current_credits, 'result', v_op.result);
    END IF;

    SELECT * INTO v_res
    FROM public.credit_reservations
    WHERE user_id = p_user_id AND op_id = p_op_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_NOT_FOUND');
    END IF;

    IF v_res.action <> v_op.action OR v_res.amount <> v_op.credit_cost THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'RESERVATION_MISMATCH', 
            'message', 'Reservation action or amount does not match operation.'
        );
    END IF;

    IF v_res.status = 'finalized' THEN
        UPDATE public.operations
        SET status = 'completed', accounting_status = 'finalized', completed_at = timezone('utc'::text, now())
        WHERE id = v_op.id;
        RETURN jsonb_build_object('success', true, 'new_balance', v_current_credits, 'result', v_op.result);
    END IF;

    -- Calculate available credits
    SELECT COALESCE(SUM(amount), 0) INTO v_active_reserved_other
    FROM public.credit_reservations
    WHERE user_id = p_user_id AND status = 'reserved' AND expires_at > timezone('utc'::text, now()) AND id <> v_res.id;

    v_available_credits := v_current_credits - v_active_reserved_other;
    IF v_available_credits < v_res.amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'available_credits', v_available_credits);
    END IF;

    UPDATE public.profiles
    SET scan_credits = scan_credits - v_res.amount
    WHERE id = p_user_id
    RETURNING scan_credits INTO v_new_balance;

    INSERT INTO public.credit_ledger (user_id, amount, balance_after, action, reference_id, description)
    VALUES (p_user_id, -v_res.amount, v_new_balance, v_res.action, p_op_id, v_res.description || ' (Accounting Recovery)');

    UPDATE public.credit_reservations
    SET status = 'finalized'
    WHERE id = v_res.id;

    UPDATE public.operations
    SET status = 'completed', accounting_status = 'finalized', completed_at = timezone('utc'::text, now())
    WHERE id = v_op.id;

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'result', v_op.result);
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

-- Function: refund_credits (Cumulative Refund Limit & Original Reference Verification)
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
    v_total_debited INT;
    v_total_refunded INT;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_REFUND_AMOUNT');
    END IF;

    IF p_reference_id IS NULL OR TRIM(p_reference_id) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_REFERENCE_ID', 'message', 'Refund reference ID is strictly required.');
    END IF;

    PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;

    -- Check if this exact refund reference has already been executed
    SELECT EXISTS(
        SELECT 1 FROM public.credit_ledger 
        WHERE user_id = p_user_id AND reference_id = p_reference_id AND action = 'refund'
    ) INTO v_already_refunded;

    IF v_already_refunded THEN
        SELECT scan_credits INTO v_new_balance FROM public.profiles WHERE id = p_user_id;
        RETURN jsonb_build_object('success', true, 'already_refunded', true, 'new_balance', v_new_balance);
    END IF;

    -- Enforce cumulative refund limit: check total debited amount for this reference
    SELECT COALESCE(ABS(SUM(amount)), 0) INTO v_total_debited 
    FROM public.credit_ledger 
    WHERE user_id = p_user_id AND reference_id = p_reference_id AND amount < 0;

    IF v_total_debited <= 0 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'ORIGINAL_DEBIT_NOT_FOUND', 
            'message', 'No valid original debit owned by this user was found for reference ID.'
        );
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded 
    FROM public.credit_ledger 
    WHERE user_id = p_user_id AND reference_id = p_reference_id AND action = 'refund' AND amount > 0;

    IF (v_total_refunded + p_amount) > v_total_debited THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'EXCEEDS_DEBIT_AMOUNT', 
            'message', 'Refund amount exceeds cumulative debited credits for this reference.',
            'total_debited', v_total_debited,
            'total_refunded', v_total_refunded
        );
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

-- Function: approve_manual_payment (Strict Verified Parameters, No SQL Defaults)
CREATE OR REPLACE FUNCTION public.approve_manual_payment(
    p_payment_id UUID,
    p_admin_id UUID,
    p_credits_to_grant INT
)
RETURNS JSONB AS $$
DECLARE
    v_payment RECORD;
    v_new_balance INT;
BEGIN
    IF p_credits_to_grant <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_CREDIT_AMOUNT');
    END IF;

    -- 1. Lock pending payment
    SELECT * INTO v_payment 
    FROM public.pending_payments 
    WHERE id = p_payment_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'PAYMENT_NOT_FOUND');
    END IF;

    IF v_payment.status = 'approved' THEN
        SELECT scan_credits INTO v_new_balance FROM public.profiles WHERE id = v_payment.user_id;
        RETURN jsonb_build_object('success', true, 'already_approved', true, 'total_credits', v_new_balance);
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
        rejection_reason = p_reason,
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

-- 8. UPDATE USER CREATION TRIGGER FOR INITIAL CREDITS (5 free scans atomically with initial grant ledger entry)
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

    INSERT INTO public.credit_ledger (user_id, amount, balance_after, action, reference_id, description)
    VALUES (
        new.id,
        5,
        5,
        'initial_grant',
        'signup_bonus',
        'Initial 5 lifetime free scans on account registration'
    ) ON CONFLICT DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. NARROW PERMISSIONS HARDENING (Strict service_role execution for transactional functions)
REVOKE EXECUTE ON FUNCTION public.reserve_credits(UUID, INT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_reservation(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_reservation(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_operation(UUID, TEXT, TEXT, INT, TEXT, TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.save_operation_result_and_finalize(UUID, TEXT, TEXT, JSONB, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_operation_on_failure(UUID, TEXT, TEXT, TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recover_operation_accounting(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_purchase(UUID, TEXT, INT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_credits(UUID, INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_manual_payment(UUID, UUID, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_manual_payment(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_order_payment(TEXT, TEXT, INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_reservations() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_credits(UUID, INT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_reservation(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_reservation(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_operation(UUID, TEXT, TEXT, INT, TEXT, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_operation_result_and_finalize(UUID, TEXT, TEXT, JSONB, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_operation_on_failure(UUID, TEXT, TEXT, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.recover_operation_accounting(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_purchase(UUID, TEXT, INT, TEXT, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(UUID, INT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_manual_payment(UUID, UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_manual_payment(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_order_payment(TEXT, TEXT, INT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reservations() TO service_role;
