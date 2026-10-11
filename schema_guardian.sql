-- Execute in Supabase SQL editor. Only owner can read/write saved tasks.
create table if not exists public.guardian_saved_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null unique,
  goal text not null,
  shortlist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists guardian_saved_tasks_user_idx on public.guardian_saved_tasks(user_id,created_at desc);
alter table public.guardian_saved_tasks enable row level security;
drop policy if exists guardian_saved_tasks_own_select on public.guardian_saved_tasks;
create policy guardian_saved_tasks_own_select on public.guardian_saved_tasks for select to authenticated using (auth.uid()=user_id);
drop policy if exists guardian_saved_tasks_own_insert on public.guardian_saved_tasks;
create policy guardian_saved_tasks_own_insert on public.guardian_saved_tasks for insert to authenticated with check (auth.uid()=user_id);

-- Shared, atomic concurrency leases for Guardian AI on serverless Vercel runtimes
create table if not exists public.guardian_concurrency_leases (
  id uuid primary key default gen_random_uuid(),
  client_key text not null,
  expires_at timestamptz not null default (now() + interval '30 seconds'),
  created_at timestamptz not null default now()
);
create index if not exists guardian_leases_client_idx on public.guardian_concurrency_leases(client_key, expires_at);
alter table public.guardian_concurrency_leases enable row level security;

-- Shared, atomic rate limit counters for Guardian AI routes
create table if not exists public.guardian_rate_limits (
  key text primary key,
  count integer not null default 1,
  reset_at timestamptz not null
);
alter table public.guardian_rate_limits enable row level security;

-- ======================================================================
-- ATOMIC PRODUCTION RPC FUNCTIONS (Single Transaction Guarantees)
-- ======================================================================

-- 1. Atomic Rate Limit Consumption Function
-- Performs quota checks and increments in one transaction with row-level locks
create or replace function public.guardian_consume_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  current_count integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_reset_at timestamptz;
  v_count integer;
  v_allowed boolean;
begin
  -- Input Parameter Validation (Defense-in-depth)
  if p_key is null or length(trim(p_key)) < 1 or length(p_key) > 500 then
    raise exception 'INVALID_PARAMETER: key must be between 1 and 500 characters';
  end if;
  if p_max_requests is null or p_max_requests <= 0 or p_max_requests > 10000 then
    raise exception 'INVALID_PARAMETER: max_requests must be between 1 and 10000';
  end if;
  if p_window_seconds is null or p_window_seconds <= 0 or p_window_seconds > 86400 then
    raise exception 'INVALID_PARAMETER: window_seconds must be between 1 and 86400';
  end if;

  insert into public.guardian_rate_limits (key, count, reset_at)
  values (p_key, 1, v_now + (p_window_seconds || ' seconds')::interval)
  on conflict (key) do update
  set
    count = case
      when public.guardian_rate_limits.reset_at < v_now then 1
      else public.guardian_rate_limits.count + 1
    end,
    reset_at = case
      when public.guardian_rate_limits.reset_at < v_now then v_now + (p_window_seconds || ' seconds')::interval
      else public.guardian_rate_limits.reset_at
    end
  returning guardian_rate_limits.count, guardian_rate_limits.reset_at
  into v_count, v_reset_at;

  if v_count <= p_max_requests then
    v_allowed := true;
  else
    v_allowed := false;
  end if;

  return query select
    v_allowed,
    v_count,
    greatest(0, p_max_requests - v_count),
    v_reset_at;
end;
$$;

-- 2. Atomic Concurrency Lease Acquisition Function
-- Enforces serialized atomic evaluation using transactional advisory lock
create or replace function public.guardian_acquire_concurrency_lease(
  p_client_key text,
  p_max_concurrent integer,
  p_ttl_seconds integer
)
returns table (
  acquired boolean,
  lease_id uuid,
  active_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_active integer;
  v_new_id uuid;
begin
  -- Input Parameter Validation (Defense-in-depth)
  if p_client_key is null or length(trim(p_client_key)) < 1 or length(p_client_key) > 500 then
    raise exception 'INVALID_PARAMETER: client_key must be between 1 and 500 characters';
  end if;
  if p_max_concurrent is null or p_max_concurrent <= 0 or p_max_concurrent > 100 then
    raise exception 'INVALID_PARAMETER: max_concurrent must be between 1 and 100';
  end if;
  if p_ttl_seconds is null or p_ttl_seconds <= 0 or p_ttl_seconds > 3600 then
    raise exception 'INVALID_PARAMETER: ttl_seconds must be between 1 and 3600';
  end if;

  -- Serialize lease acquisition per client key using transactional advisory lock
  perform pg_advisory_xact_lock(hashtext('guardian_lease:' || p_client_key));

  -- Clean up expired leases
  delete from public.guardian_concurrency_leases
  where expires_at < v_now;

  -- Count unexpired active leases for this client
  select count(*) into v_active
  from public.guardian_concurrency_leases
  where client_key = p_client_key
    and expires_at >= v_now;

  -- Enforce concurrency ceiling
  if v_active >= p_max_concurrent then
    return query select false, null::uuid, v_active;
    return;
  end if;

  -- Atomically insert new lease with TTL
  insert into public.guardian_concurrency_leases (id, client_key, expires_at)
  values (
    gen_random_uuid(),
    p_client_key,
    v_now + (p_ttl_seconds || ' seconds')::interval
  )
  returning id into v_new_id;

  return query select true, v_new_id, (v_active + 1);
end;
$$;

-- 3. Idempotent Concurrency Lease Release Function
create or replace function public.guardian_release_concurrency_lease(
  p_lease_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  if p_lease_id is null then
    return false;
  end if;

  delete from public.guardian_concurrency_leases
  where id = p_lease_id;
  get diagnostics v_deleted = row_count;

  -- Idempotent: returns true regardless of whether 1 row was removed or already expired
  return true;
end;
$$;

-- Revoke execute permissions from PUBLIC, anon, and authenticated clients
revoke all on function public.guardian_consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.guardian_acquire_concurrency_lease(text, integer, integer) from public, anon, authenticated;
revoke all on function public.guardian_release_concurrency_lease(uuid) from public, anon, authenticated;

-- Grant execute permissions strictly and exclusively to service_role (server backend)
grant execute on function public.guardian_consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.guardian_acquire_concurrency_lease(text, integer, integer) to service_role;
grant execute on function public.guardian_release_concurrency_lease(uuid) to service_role;


