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

-- Create Policies
CREATE POLICY "Allow anyone to insert feedback" 
    ON public.scan_feedback FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view feedback" 
    ON public.scan_feedback FOR SELECT 
    USING (auth.role() = 'authenticated');
