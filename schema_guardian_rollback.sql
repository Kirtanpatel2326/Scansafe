-- Rollback Script for Guardian Saved Tasks Migration
-- Use only if rolling back Guardian AI Phase 2 database schema.
-- WARNING: This will drop the guardian_saved_tasks table and its associated indexes/policies.

DROP POLICY IF EXISTS guardian_saved_tasks_own_insert ON public.guardian_saved_tasks;
DROP POLICY IF EXISTS guardian_saved_tasks_own_select ON public.guardian_saved_tasks;
DROP INDEX IF EXISTS public.guardian_saved_tasks_user_idx;
DROP TABLE IF EXISTS public.guardian_saved_tasks CASCADE;
