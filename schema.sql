-- SCANSAFE ULTRA Database Schema Definition
-- Run this in your Supabase SQL Editor to provision tables, triggers, and RLS policies.

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
    plan_type TEXT DEFAULT 'free',
    scan_credits INTEGER DEFAULT 5,
    dietary_profile JSONB DEFAULT '{"age": null, "weight": null, "allergies": [], "conditions": [], "goals": []}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
CREATE POLICY "Allow users to read their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update non-sensitive profile fields" ON public.profiles;
CREATE POLICY "Allow users to update non-sensitive profile fields" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Revoke table-level UPDATE/INSERT from clients to protect scan_credits and plan
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated, anon;
GRANT UPDATE (full_name, dietary_profile) ON public.profiles TO authenticated;


-- 1.5 PENDING PAYMENTS (For manual UPI verification)
CREATE TABLE IF NOT EXISTS public.pending_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    utr TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_payments_utr 
  ON public.pending_payments(utr) 
  WHERE utr IS NOT NULL;

ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own pending payments" ON public.pending_payments;
CREATE POLICY "Users can insert their own pending payments"
    ON public.pending_payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own pending payments" ON public.pending_payments;
CREATE POLICY "Users can view their own pending payments"
    ON public.pending_payments FOR SELECT
    USING (auth.uid() = user_id);


-- 2. FAMILY MEMBERS TABLE (Multi-profile mode)
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dietary_profile JSONB DEFAULT '{"age": null, "weight": null, "allergies": [], "conditions": [], "goals": []}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own family members" ON public.family_members;
CREATE POLICY "Users can manage their own family members"
    ON public.family_members FOR ALL
    USING (auth.uid() = user_id);


-- 3. SCANS HISTORY TABLE (Enhanced results)
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    op_id TEXT,
    accounting_status TEXT DEFAULT 'completed',
    product_name TEXT NOT NULL,
    barcode TEXT,
    health_score INTEGER CHECK (health_score IS NULL OR (health_score BETWEEN 0 AND 100)),
    safety_level TEXT NOT NULL CHECK (safety_level IN ('safe', 'moderate', 'danger', 'insufficient_evidence')),
    result_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
DELETE FROM public.scans
WHERE id IN (
    SELECT id FROM ranked_scans WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scans_user_op_id_unique ON public.scans(user_id, op_id) WHERE op_id IS NOT NULL;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own scans" ON public.scans;
CREATE POLICY "Users can manage their own scans"
    ON public.scans FOR ALL
    USING (auth.uid() = user_id);


-- 4. MEAL COMPOSITIONS TABLE
CREATE TABLE IF NOT EXISTS public.meal_compositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    op_id TEXT,
    accounting_status TEXT DEFAULT 'completed',
    name TEXT NOT NULL,
    scans_list UUID[] NOT NULL, -- references scans(id)
    analysis_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
DELETE FROM public.meal_compositions
WHERE id IN (
    SELECT id FROM ranked_meals WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_compositions_user_op_id_unique ON public.meal_compositions(user_id, op_id) WHERE op_id IS NOT NULL;
ALTER TABLE public.meal_compositions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own meals" ON public.meal_compositions;
CREATE POLICY "Users can manage their own meals"
    ON public.meal_compositions FOR ALL
    USING (auth.uid() = user_id);


-- 5. FAVORITES TABLE
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    barcode TEXT,
    product_name TEXT NOT NULL,
    result_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorites;
CREATE POLICY "Users can manage their own favorites"
    ON public.favorites FOR ALL
    USING (auth.uid() = user_id);


-- 6. BLACKLIST INGREDIENTS TABLE
CREATE TABLE IF NOT EXISTS public.blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ingredient TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, ingredient)
);

ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own blacklisted ingredients" ON public.blacklist;
CREATE POLICY "Users can manage their own blacklisted ingredients"
    ON public.blacklist FOR ALL
    USING (auth.uid() = user_id);


-- 7. GLOBAL PRODUCTS CACHE (Trusted server-only writes)
CREATE TABLE IF NOT EXISTS public.products_cache (
    barcode TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    brand TEXT,
    raw_data JSONB NOT NULL,
    schema_version TEXT DEFAULT '2.0',
    source TEXT DEFAULT 'ocr',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read cached products" ON public.products_cache;
CREATE POLICY "Anyone can read cached products"
    ON public.products_cache FOR SELECT
    USING (true);

-- Revoke direct client write privileges on shared product cache
REVOKE INSERT, UPDATE, DELETE ON public.products_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.products_cache TO PUBLIC, anon, authenticated;


-- 8. AUTO PROFILE CREATION TRIGGER ON SIGNUP
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution definition
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
