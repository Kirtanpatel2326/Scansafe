-- ==========================================================
-- SCANSAFE V2 DATABASE ROLLBACK SCRIPT
-- ==========================================================

-- 1. Drop credit ledger policies and table
DROP POLICY IF EXISTS "Users can view their own credit ledger" ON public.credit_ledger;
DROP TABLE IF EXISTS public.credit_ledger;

-- 2. Restore standard profile update privileges
GRANT UPDATE (plan, plan_type, scan_credits, scans_today, scans_reset_at, razorpay_subscription_id) 
    ON public.profiles TO authenticated;

-- 3. Restore standard profile update policy
DROP POLICY IF EXISTS "Allow users to update non-sensitive fields in their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);
