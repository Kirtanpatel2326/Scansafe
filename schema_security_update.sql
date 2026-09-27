-- Revoke direct UPDATE permissions on sensitive billing/credit columns from authenticated users
-- This prevents hackers from upgrading their own plan to 'pro' via client-side Supabase JS.

-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

-- Second, revoke global UPDATE privileges on those specific columns from the authenticated role
REVOKE UPDATE (plan, plan_type, scan_credits, scans_today, scans_reset_at) ON public.profiles FROM authenticated;

-- Finally, recreate the UPDATE policy so users can still update non-sensitive fields (like dietary_profile)
CREATE POLICY "Allow users to update non-sensitive fields in their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- (The service_role key used by the backend API bypasses RLS and Column Privileges, so billing webhooks will still work perfectly)
