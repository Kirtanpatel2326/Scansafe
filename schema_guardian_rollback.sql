-- Rollback Script for Guardian Saved Tasks Migration
-- Use only if rolling back Guardian AI Phase 2 database schema.
-- WARNING: This will drop the guardian_saved_tasks table and its associated indexes/policies.

DROP POLICY IF EXISTS guardian_saved_tasks_own_insert ON public.guardian_saved_tasks;
DROP POLICY IF EXISTS guardian_saved_tasks_own_select ON public.guardian_saved_tasks;
DROP INDEX IF EXISTS public.guardian_saved_tasks_user_idx;
DROP TABLE IF EXISTS public.guardian_saved_tasks CASCADE;
DROP INDEX IF EXISTS public.guardian_leases_client_idx;
DROP TABLE IF EXISTS public.guardian_concurrency_leases CASCADE;
DROP TABLE IF EXISTS public.guardian_rate_limits CASCADE;

-- Drop RPC functions
DROP FUNCTION IF EXISTS public.guardian_consume_rate_limit(text, integer, integer);
DROP FUNCTION IF EXISTS public.guardian_acquire_concurrency_lease(text, integer, integer);
DROP FUNCTION IF EXISTS public.guardian_release_concurrency_lease(uuid);

-- Drop Evidence Store
DROP POLICY IF EXISTS guardian_cert_evidence_no_user_delete ON public.guardian_certification_evidence;
DROP POLICY IF EXISTS guardian_cert_evidence_no_user_update ON public.guardian_certification_evidence;
DROP POLICY IF EXISTS guardian_cert_evidence_no_user_insert ON public.guardian_certification_evidence;
DROP POLICY IF EXISTS guardian_cert_evidence_no_user_select ON public.guardian_certification_evidence;
DROP POLICY IF EXISTS guardian_cert_evidence_read_auth ON public.guardian_certification_evidence;
DROP FUNCTION IF EXISTS public.guardian_get_public_certification(text, text);
DROP TABLE IF EXISTS public.guardian_certification_evidence CASCADE;



