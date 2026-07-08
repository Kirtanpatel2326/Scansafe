-- SCANSAFE - Analytics Update

-- 1. PAGE VIEWS TABLE (For tracking visitors)
CREATE TABLE IF NOT EXISTS public.page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path TEXT NOT NULL,
    ip_hash TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (so website visitors can be logged)
CREATE POLICY "Allow anonymous to insert page views"
    ON public.page_views FOR INSERT
    WITH CHECK (true);

-- Allow authenticated users to view page views (or restrict to service role / admin)
CREATE POLICY "Allow authenticated to view page views"
    ON public.page_views FOR SELECT
    USING (auth.role() = 'authenticated');
