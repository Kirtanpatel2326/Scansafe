-- ==========================================================
-- SCANSAFE V2 DATABASE SCHEMA MIGRATION
-- Transactional Credit Ledger, RLS Hardening, & Evidence Cache
-- ==========================================================

-- 1. PROFILES TABLE ADJUSTMENTS
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS scan_credits INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT "free",
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;

-- Set default initial scans for new users to 3
ALTER TABLE public.profiles 
  ALTER COLUMN scan_credits SET DEFAULT 3;

-- 2. CREDIT LEDGER TABLE (Transactional accounting & idempotency)
CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- positive for credits added, negative for credits spent
    balance_after INTEGER NOT NULL,
    action TEXT NOT NULL CHECK (action IN ("purchase", "scan", "compare", "meal_compose", "bonus", "refund", "initial_grant")),
    reference_id TEXT, -- e.g. payment_id, scan_id, or utr
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone("utc"::text, now()) NOT NULL
);

-- Index for speedy ledger retrieval per user
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON public.credit_ledger(user_id, created_at DESC);

-- Unique index to enforce purchase fulfillment idempotency per transaction/reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_purchase_idempotency 
    ON public.credit_ledger (user_id, reference_id) 
    WHERE action = "purchase" AND reference_id IS NOT NULL;

-- Enable RLS on Credit Ledger
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing ledger policies if rerun
DROP POLICY IF EXISTS "Users can view their own credit ledger" ON public.credit_ledger;
DROP POLICY IF EXISTS "Deny direct client insertion to credit ledger" ON public.credit_ledger;

-- Ledger RLS: Users can SELECT their own ledger records; server service_role performs inserts
CREATE POLICY "Users can view their own credit ledger"
    ON public.credit_ledger FOR SELECT
    USING (auth.uid() = user_id);

-- 3. HARDEN PROFILES RLS (Prevent client-side privilege escalation)
-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update non-sensitive fields in their own profile" ON public.profiles;

-- Revoke client-side UPDATE privileges on sensitive columns
REVOKE UPDATE (plan, plan_type, scan_credits, scans_today, scans_reset_at, razorpay_subscription_id) 
    ON public.profiles FROM authenticated;

-- Re-create UPDATE policy allowing users to update their own non-sensitive columns (dietary_profile, full_name)
CREATE POLICY "Allow users to update non-sensitive fields in their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 4. PRODUCTS CACHE SCHEMA 2.0
ALTER TABLE public.products_cache
    ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT "2.0",
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT "ocr",
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone("utc"::text, now());

-- 5. UPDATE USER CREATION TRIGGER FOR INITIAL CREDITS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, plan, plan_type, scan_credits)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>"full_name", split_part(new.email, "@", 1)),
        "free",
        "free",
        3
    ) ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
