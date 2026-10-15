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

-- Grant SELECT to authenticated users (read-only verification proofs)
grant select on public.guardian_certification_evidence to authenticated;

-- Grant ALL strictly and exclusively to service_role (server verification engine)
grant all on public.guardian_certification_evidence to service_role;

-- Defense-in-depth RLS Policies: Ordinary users have zero write permissions
drop policy if exists guardian_cert_evidence_read_auth on public.guardian_certification_evidence;
create policy guardian_cert_evidence_read_auth on public.guardian_certification_evidence 
  for select to authenticated using (true);

drop policy if exists guardian_cert_evidence_no_user_insert on public.guardian_certification_evidence;
create policy guardian_cert_evidence_no_user_insert on public.guardian_certification_evidence 
  for insert to authenticated with check (false);

drop policy if exists guardian_cert_evidence_no_user_update on public.guardian_certification_evidence;
create policy guardian_cert_evidence_no_user_update on public.guardian_certification_evidence 
  for update to authenticated using (false);

drop policy if exists guardian_cert_evidence_no_user_delete on public.guardian_certification_evidence;
create policy guardian_cert_evidence_no_user_delete on public.guardian_certification_evidence 
  for delete to authenticated using (false);
