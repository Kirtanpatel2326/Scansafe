-- ==========================================================
-- SCANSAFE V2 NON-DESTRUCTIVE RECOVERY & FORWARD-MIGRATION PLAN
-- ==========================================================
-- SAFETY NOTICE:
-- Financial audit records (credit_ledger), user balances (profiles.scan_credits),
-- and reservation histories are preserved. DO NOT DROP LEDGER TABLES.

-- 1. BACKUP STEP (Execute in Postgres CLI / Supabase before running any maintenance)
-- pg_dump -h <host> -U postgres -d postgres -t public.profiles -t public.credit_ledger -t public.credit_reservations -t public.payment_orders > scansafe_financial_backup_$(date +%Y%m%d_%H%M%S).sql

-- 2. RECONCILE PROFILE BALANCES FROM LEDGER (Forward Recovery)
-- In the event of any discrepancies, recalculate balances directly from ledger history:
/*
WITH calculated_balances AS (
    SELECT user_id, SUM(amount) AS total_ledger_credits
    FROM public.credit_ledger
    GROUP BY user_id
)
UPDATE public.profiles p
SET scan_credits = GREATEST(0, cb.total_ledger_credits)
FROM calculated_balances cb
WHERE p.id = cb.user_id;
*/

-- 3. EXPIRED RESERVATION RECOVERY
-- Safely release all stale/abandoned reservations without modifying active balances:
SELECT public.cleanup_expired_reservations();

-- 4. FUNCTION REMEDIATION (If rolling back to previous function signatures)
-- DROP FUNCTION IF EXISTS public.reserve_credits(UUID, INT, TEXT, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS public.finalize_reservation(UUID, TEXT);
-- DROP FUNCTION IF EXISTS public.release_reservation(UUID, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS public.fulfill_purchase(UUID, TEXT, INT, TEXT, NUMERIC, TEXT);
-- DROP FUNCTION IF EXISTS public.refund_credits(UUID, INT, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS public.approve_manual_payment(UUID, UUID, INT);
-- DROP FUNCTION IF EXISTS public.cleanup_expired_reservations();
