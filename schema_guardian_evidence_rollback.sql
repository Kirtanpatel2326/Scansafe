-- ======================================================================
-- SCANSAFE GUARDIAN AI — EVIDENCE STORE ROLLBACK SCRIPT
-- ======================================================================
DROP POLICY IF EXISTS guardian_cert_evidence_no_user_delete ON public.guardian_certification_evidence;
DROP POLICY IF EXISTS guardian_cert_evidence_no_user_update ON public.guardian_certification_evidence;
DROP POLICY IF EXISTS guardian_cert_evidence_no_user_insert ON public.guardian_certification_evidence;
DROP POLICY IF EXISTS guardian_cert_evidence_no_user_select ON public.guardian_certification_evidence;
DROP POLICY IF EXISTS guardian_cert_evidence_read_auth ON public.guardian_certification_evidence;
DROP FUNCTION IF EXISTS public.guardian_get_public_certification(text, text);
DROP TABLE IF EXISTS public.guardian_certification_evidence CASCADE;

