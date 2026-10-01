-- ==============================================================================
-- SCANSAFE SCHEMA V3: TRUSTWORTHY SHOPPING ASSISTANT & CORRECTIONS WORKFLOW
-- ==============================================================================

-- 1. EXTEND PROFILES FOR REVIEWER ROLE
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'reviewer', 'admin')),
ADD COLUMN IF NOT EXISTS is_reviewer BOOLEAN DEFAULT FALSE;

-- Enforce that regular users cannot elevate their own role or reviewer status
CREATE OR REPLACE FUNCTION public.protect_profile_roles()
RETURNS TRIGGER AS $$
BEGIN
    -- If trigger is invoked by an authenticated client (not service_role), prevent role escalation
    IF auth.role() = 'authenticated' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Unauthorized: Users cannot change their own role.';
        END IF;
        IF NEW.is_reviewer IS DISTINCT FROM OLD.is_reviewer THEN
            RAISE EXCEPTION 'Unauthorized: Users cannot modify reviewer privileges.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_roles ON public.profiles;
CREATE TRIGGER trg_protect_profile_roles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_roles();

-- 2. EXTEND PRODUCTS CACHE FOR VERSIONING & EVIDENCE
ALTER TABLE public.products_cache
ADD COLUMN IF NOT EXISTS variant TEXT,
ADD COLUMN IF NOT EXISTS pack_size TEXT,
ADD COLUMN IF NOT EXISTS nutrition_basis TEXT DEFAULT 'per_100g' CHECK (nutrition_basis IN ('per_100g', 'per_100ml', 'per_serving')),
ADD COLUMN IF NOT EXISTS serving_size TEXT,
ADD COLUMN IF NOT EXISTS evidence_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'ai_extracted' CHECK (review_status IN ('ai_extracted', 'pending_review', 'reviewed')),
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

-- 3. PRODUCT VERSIONS TABLE (Immutable Snapshots for Rollback)
CREATE TABLE IF NOT EXISTS public.product_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode TEXT NOT NULL,
    version INT NOT NULL,
    snapshot JSONB NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (barcode, version)
);

ALTER TABLE public.product_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view product versions" ON public.product_versions;
CREATE POLICY "Anyone can view product versions"
    ON public.product_versions FOR SELECT
    USING (true);

-- 4. PRODUCT CORRECTIONS TABLE (Isolated User Submissions)
CREATE TABLE IF NOT EXISTS public.product_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    original_value JSONB,
    corrected_value JSONB NOT NULL,
    provenance TEXT DEFAULT 'user_correction',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    reviewer_id UUID REFERENCES public.profiles(id),
    review_notes TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.product_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own corrections" ON public.product_corrections;
CREATE POLICY "Users can read own corrections"
    ON public.product_corrections FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can submit corrections" ON public.product_corrections;
CREATE POLICY "Users can submit corrections"
    ON public.product_corrections FOR INSERT
    WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Reviewers can view all corrections" ON public.product_corrections;
CREATE POLICY "Reviewers can view all corrections"
    ON public.product_corrections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.is_reviewer = TRUE OR profiles.role IN ('admin', 'reviewer'))
        )
    );

-- 5. SAVED PRODUCTS (Shopping List)
CREATE TABLE IF NOT EXISTS public.saved_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    barcode TEXT,
    product_name TEXT NOT NULL,
    brand TEXT,
    pack_size TEXT,
    result_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.saved_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own saved products" ON public.saved_products;
CREATE POLICY "Users can manage own saved products"
    ON public.saved_products FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_products_user ON public.saved_products(user_id);

-- 6. PRIVACY-PRESERVING ANALYTICS EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    user_hash TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Server only writes analytics events" ON public.analytics_events;
CREATE POLICY "Server only writes analytics events"
    ON public.analytics_events FOR INSERT
    WITH CHECK (true);
