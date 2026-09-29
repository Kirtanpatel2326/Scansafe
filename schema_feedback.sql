-- 9. SCAN FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS public.scan_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    scan_id UUID REFERENCES public.scans(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.scan_feedback ENABLE ROW LEVEL SECURITY;

-- Drop insecure policies if they exist
DROP POLICY IF EXISTS "Allow anyone to insert feedback" ON public.scan_feedback;
DROP POLICY IF EXISTS "Allow authenticated users to view feedback" ON public.scan_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.scan_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.scan_feedback;

-- Secure Policies:
-- Users can only insert feedback matching their own authenticated user_id
CREATE POLICY "Users can insert own feedback" 
    ON public.scan_feedback FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = user_id
        AND (scan_id IS NULL OR EXISTS (SELECT 1 FROM public.scans s WHERE s.id = scan_id AND s.user_id = auth.uid()))
    );

-- Users can only view their own submitted feedback
CREATE POLICY "Users can view own feedback" 
    ON public.scan_feedback FOR SELECT 
    USING (auth.uid() = user_id);
