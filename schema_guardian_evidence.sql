-- ======================================================================
-- SCANSAFE GUARDIAN AI — PROTECTED CERTIFICATION EVIDENCE STORE
-- ======================================================================
-- Persistent database-backed evidence store for independently verified certifications.
-- Only authorized server-side workflows (service_role) may insert or update.
-- Ordinary users and external providers have zero write access.

create table if not exists public.guardian_certification_evidence (
  id uuid primary key default gen_random_uuid(),
  certificate_id text not null,
  associated_product_id text not null,
  issuing_authority text not null,
  standard text not null,
  evidence_url text not null,
  brand text,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  revocation_status text not null check (revocation_status in ('ACTIVE', 'REVOKED', 'EXPIRED')) default 'ACTIVE',
  revocation_checked_at timestamptz not null default now(),
  verification_method text not null check (verification_method in ('REGISTRY_LOOKUP_AUTHENTICATED', 'EXTERNAL_STANDARDS_VERIFIER')),
  authoritative_source text not null,
  operation_id text not null unique,
  verified_at timestamptz not null default now(),
  audit_record_hash text not null,
  audit_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Efficient indexing for fast verification lookups
create index if not exists guardian_cert_evidence_lookup_idx 
  on public.guardian_certification_evidence(upper(trim(certificate_id)), trim(associated_product_id));
create index if not exists guardian_cert_evidence_cert_idx 
  on public.guardian_certification_evidence(upper(trim(certificate_id)));
create index if not exists guardian_cert_evidence_product_idx 
  on public.guardian_certification_evidence(trim(associated_product_id));

-- Enable Row Level Security (RLS)
alter table public.guardian_certification_evidence enable row level security;

-- Revoke all permissions from public, anon, and authenticated users
revoke all on public.guardian_certification_evidence from public, anon, authenticated;

-- Strictly deny direct SELECT permissions on internal evidence table to standard users and anonymous clients.
-- Internal cryptographic audit hashes and operational history must never be exposed via raw table select.
drop policy if exists guardian_cert_evidence_read_auth on public.guardian_certification_evidence;
drop policy if exists guardian_cert_evidence_no_user_select on public.guardian_certification_evidence;
create policy guardian_cert_evidence_no_user_select on public.guardian_certification_evidence 
  for select to authenticated, anon using (false);

drop policy if exists guardian_cert_evidence_no_user_insert on public.guardian_certification_evidence;
create policy guardian_cert_evidence_no_user_insert on public.guardian_certification_evidence 
  for insert to authenticated, anon with check (false);

drop policy if exists guardian_cert_evidence_no_user_update on public.guardian_certification_evidence;
create policy guardian_cert_evidence_no_user_update on public.guardian_certification_evidence 
  for update to authenticated, anon using (false);

drop policy if exists guardian_cert_evidence_no_user_delete on public.guardian_certification_evidence;
create policy guardian_cert_evidence_no_user_delete on public.guardian_certification_evidence 
  for delete to authenticated, anon using (false);

-- ======================================================================
-- CONTROLLED PUBLIC VERIFICATION FUNCTION (SAFE FIELDS ONLY)
-- ======================================================================
-- Exposes only safe, deliberately public verification fields without leaking
-- audit_record_hash, audit_history, operation_id, or database UUIDs.
create or replace function public.guardian_get_public_certification(
  p_certificate_id text,
  p_product_id text default null
)
returns table (
  certificate_id text,
  associated_product_id text,
  issuing_authority text,
  standard text,
  evidence_url text,
  brand text,
  valid_from timestamptz,
  valid_until timestamptz,
  revocation_status text,
  revocation_checked_at timestamptz,
  verification_method text,
  verified_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Enforce bounded inputs: max 128 characters, reject empty strings
  if p_certificate_id is null or length(trim(p_certificate_id)) = 0 or length(p_certificate_id) > 128 then
    return;
  end if;
  if p_product_id is not null and length(p_product_id) > 128 then
    return;
  end if;

  return query
  select 
    e.certificate_id,
    e.associated_product_id,
    e.issuing_authority,
    e.standard,
    e.evidence_url,
    e.brand,
    e.valid_from,
    e.valid_until,
    e.revocation_status,
    e.revocation_checked_at,
    e.verification_method,
    e.verified_at
  from public.guardian_certification_evidence e
  where upper(trim(e.certificate_id)) = upper(trim(p_certificate_id))
    and (p_product_id is null or trim(e.associated_product_id) = trim(p_product_id))
    and e.revocation_status = 'ACTIVE'
    and e.valid_until > clock_timestamp()
  limit 1;
end;
$$;

revoke all on function public.guardian_get_public_certification(text, text) from public, anon;
grant execute on function public.guardian_get_public_certification(text, text) to authenticated, service_role;
