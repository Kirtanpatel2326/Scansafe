-- SCANSAFE ULTRA Database Schema Definition
-- Run this in your Supabase SQL Editor to provision tables, triggers, and RLS policies.

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
    plan_type TEXT DEFAULT 'free',
    plan_expires_at TIMESTAMP WITH TIME ZONE,
    scans_today INTEGER DEFAULT 0,
    scans_reset_at DATE DEFAULT CURRENT_DATE,
    dietary_profile JSONB DEFAULT '{"age": null, "weight": null, "allergies": [], "conditions": [], "goals": []}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Policies
CREATE POLICY "Allow users to read their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Allow service role or auth trigger to insert profiles" 
    ON public.profiles FOR INSERT 
    WITH CHECK (true);


-- 1.5 PENDING PAYMENTS (For manual UPI verification)
CREATE TABLE IF NOT EXISTS public.pending_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    utr TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own pending payments"
    ON public.pending_payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own pending payments"
    ON public.pending_payments FOR SELECT
    USING (auth.uid() = user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Allow users to read their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Allow service role or auth trigger to insert profiles" 
    ON public.profiles FOR INSERT 
    WITH CHECK (true);


-- 2. FAMILY MEMBERS TABLE (Multi-profile mode)
CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dietary_profile JSONB DEFAULT '{"age": null, "weight": null, "allergies": [], "conditions": [], "goals": []}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own family members"
    ON public.family_members FOR ALL
    USING (auth.uid() = user_id);


-- 3. SCANS HISTORY TABLE (Enhanced results)
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    barcode TEXT,
    health_score INTEGER NOT NULL CHECK (health_score BETWEEN 0 AND 100),
    safety_level TEXT NOT NULL CHECK (safety_level IN ('safe', 'moderate', 'danger')),
    result_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scans"
    ON public.scans FOR ALL
    USING (auth.uid() = user_id);


-- 4. MEAL COMPOSITIONS TABLE
CREATE TABLE IF NOT EXISTS public.meal_compositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scans_list UUID[] NOT NULL, -- references scans(id)
    analysis_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.meal_compositions ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can manage their own blacklisted ingredients"
    ON public.blacklist FOR ALL
    USING (auth.uid() = user_id);


-- 7. GLOBAL PRODUCTS CACHE
CREATE TABLE IF NOT EXISTS public.products_cache (
    barcode TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    brand TEXT,
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached products"
    ON public.products_cache FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can cache products"
    ON public.products_cache FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');


-- 8. AUTO PROFILE CREATION TRIGGER ON SIGNUP
-- Creates a profile row automatically when a new user registers in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, plan)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        'free'
    ) ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution definition
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
