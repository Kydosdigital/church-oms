-- Church OMS
-- Migration 0019: realtime usher attendance counter.
--
-- Each programme can have one live counter session. Every usher keeps an
-- individual count, which is aggregated for the live total and preserved for
-- audit/reconciliation. This deliberately does not overwrite the demographic
-- attendance breakdown in attendance_records.

create table if not exists public.attendance_counter_sessions (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null unique references public.programme_occurrences(id) on delete cascade,
  church_id uuid not null references public.churches(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_by uuid not null references public.app_users(id),
  opened_at timestamptz not null default now(),
  closed_by uuid references public.app_users(id),
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_counter_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_counter_sessions(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  count integer not null default 0 check (count >= 0),
  status text not null default 'counting' check (status in ('counting', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create index if not exists idx_attendance_counter_sessions_church
  on public.attendance_counter_sessions(church_id, status);
create index if not exists idx_attendance_counter_entries_session
  on public.attendance_counter_entries(session_id);

alter table public.attendance_counter_sessions enable row level security;
alter table public.attendance_counter_entries enable row level security;

revoke all on table public.attendance_counter_sessions from anon, authenticated;
revoke all on table public.attendance_counter_entries from anon, authenticated;
grant select on table public.attendance_counter_sessions to authenticated;
grant select on table public.attendance_counter_entries to authenticated;

-- Users involved in attendance/leadership for the branch may observe the live
-- session. Ushers can see all counter rows so Supabase Realtime can deliver an
-- accurate aggregate total; the UI only exposes the detailed breakdown to
-- verifier/leadership roles.
drop policy if exists attendance_counter_sessions_select on public.attendance_counter_sessions;
create policy attendance_counter_sessions_select on public.attendance_counter_sessions
for select
using (
  church_id = public.current_church_id()
  and (
    public.has_role('usher'::public.app_role, branch_id)
    or public.has_role('attendance_verifier'::public.app_role, branch_id)
    or public.has_role('pastor'::public.app_role)
    or public.is_administrator()
  )
);

drop policy if exists attendance_counter_entries_select on public.attendance_counter_entries;
create policy attendance_counter_entries_select on public.attendance_counter_entries
for select
using (
  exists (
    select 1
    from public.attendance_counter_sessions s
    where s.id = attendance_counter_entries.session_id
      and s.church_id = public.current_church_id()
      and (
        public.has_role('usher'::public.app_role, s.branch_id)
        or public.has_role('attendance_verifier'::public.app_role, s.branch_id)
        or public.has_role('pastor'::public.app_role)
        or public.is_administrator()
      )
  )
);

create or replace function public.open_attendance_counter(p_programme_id uuid)
returns public.attendance_counter_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_programme public.programme_occurrences%rowtype;
  v_session public.attendance_counter_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select p.* into v_programme
  from public.programme_occurrences p
  join public.app_users u on u.id = v_user_id
  where p.id = p_programme_id
    and u.active = true
    and u.church_id = p.church_id;

  if not found then
    raise exception 'Programme is not available';
  end if;

  if not (
    public.has_role('usher'::public.app_role, v_programme.branch_id)
    or public.has_role('attendance_verifier'::public.app_role, v_programme.branch_id)
    or public.is_administrator()
  ) then
    raise exception 'You do not have permission to open this counter';
  end if;

  insert into public.attendance_counter_sessions (
    programme_id, church_id, branch_id, status, opened_by, opened_at, closed_by, closed_at, updated_at
  ) values (
    v_programme.id, v_programme.church_id, v_programme.branch_id, 'open', v_user_id, now(), null, null, now()
  )
  on conflict (programme_id) do update
    set status = 'open',
        closed_by = null,
        closed_at = null,
        updated_at = now()
  returning * into v_session;

  return v_session;
end;
$$;

create or replace function public.increment_attendance_counter(
  p_session_id uuid,
  p_delta integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.attendance_counter_sessions%rowtype;
  v_existing_status text;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_delta = 0 or p_delta < -25 or p_delta > 25 then
    raise exception 'Counter adjustment is outside the allowed range';
  end if;

  select s.* into v_session
  from public.attendance_counter_sessions s
  join public.app_users u on u.id = v_user_id
  where s.id = p_session_id
    and s.status = 'open'
    and u.active = true
    and u.church_id = s.church_id;

  if not found then
    raise exception 'Counter session is not open';
  end if;

  if not (
    public.has_role('usher'::public.app_role, v_session.branch_id)
    or public.is_administrator()
  ) then
    raise exception 'Only ushers assigned to this branch can count';
  end if;

  select e.status into v_existing_status
  from public.attendance_counter_entries e
  where e.session_id = p_session_id and e.user_id = v_user_id;

  if v_existing_status = 'submitted' then
    raise exception 'Your count has already been submitted. Resume it before changing the count.';
  end if;

  insert into public.attendance_counter_entries (
    session_id, user_id, count, status, submitted_at, updated_at
  ) values (
    p_session_id, v_user_id, greatest(0, p_delta), 'counting', null, now()
  )
  on conflict (session_id, user_id) do update
    set count = greatest(0, attendance_counter_entries.count + p_delta),
        updated_at = now()
  returning count into v_count;

  return v_count;
end;
$$;

create or replace function public.submit_attendance_counter(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.attendance_counter_sessions%rowtype;
  v_count integer;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select s.* into v_session
  from public.attendance_counter_sessions s
  join public.app_users u on u.id = v_user_id
  where s.id = p_session_id
    and s.status = 'open'
    and u.active = true
    and u.church_id = s.church_id;

  if not found then raise exception 'Counter session is not open'; end if;
  if not (
    public.has_role('usher'::public.app_role, v_session.branch_id)
    or public.is_administrator()
  ) then
    raise exception 'Only ushers assigned to this branch can submit a count';
  end if;

  insert into public.attendance_counter_entries (session_id, user_id, count, status, submitted_at, updated_at)
  values (p_session_id, v_user_id, 0, 'submitted', now(), now())
  on conflict (session_id, user_id) do update
    set status = 'submitted', submitted_at = now(), updated_at = now()
  returning count into v_count;

  return v_count;
end;
$$;

create or replace function public.resume_attendance_counter(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.attendance_counter_sessions%rowtype;
  v_count integer;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select s.* into v_session
  from public.attendance_counter_sessions s
  join public.app_users u on u.id = v_user_id
  where s.id = p_session_id
    and s.status = 'open'
    and u.active = true
    and u.church_id = s.church_id;

  if not found then raise exception 'Counter session is not open'; end if;
  if not (
    public.has_role('usher'::public.app_role, v_session.branch_id)
    or public.is_administrator()
  ) then
    raise exception 'Only ushers assigned to this branch can resume a count';
  end if;

  update public.attendance_counter_entries
  set status = 'counting', submitted_at = null, updated_at = now()
  where session_id = p_session_id and user_id = v_user_id
  returning count into v_count;

  if not found then
    raise exception 'No counter entry exists yet';
  end if;

  return v_count;
end;
$$;

create or replace function public.close_attendance_counter(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.attendance_counter_sessions%rowtype;
  v_total integer;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select s.* into v_session
  from public.attendance_counter_sessions s
  join public.app_users u on u.id = v_user_id
  where s.id = p_session_id
    and u.active = true
    and u.church_id = s.church_id;

  if not found then raise exception 'Counter session is not available'; end if;
  if not (
    public.has_role('attendance_verifier'::public.app_role, v_session.branch_id)
    or public.is_administrator()
  ) then
    raise exception 'Only an attendance verifier or administrator can close the counter';
  end if;

  update public.attendance_counter_sessions
  set status = 'closed', closed_by = v_user_id, closed_at = now(), updated_at = now()
  where id = p_session_id;

  select coalesce(sum(e.count), 0)::integer into v_total
  from public.attendance_counter_entries e
  where e.session_id = p_session_id and e.status = 'submitted';

  return v_total;
end;
$$;

revoke all on function public.open_attendance_counter(uuid) from public, anon;
revoke all on function public.increment_attendance_counter(uuid, integer) from public, anon;
revoke all on function public.submit_attendance_counter(uuid) from public, anon;
revoke all on function public.resume_attendance_counter(uuid) from public, anon;
revoke all on function public.close_attendance_counter(uuid) from public, anon;
grant execute on function public.open_attendance_counter(uuid) to authenticated;
grant execute on function public.increment_attendance_counter(uuid, integer) to authenticated;
grant execute on function public.submit_attendance_counter(uuid) to authenticated;
grant execute on function public.resume_attendance_counter(uuid) to authenticated;
grant execute on function public.close_attendance_counter(uuid) to authenticated;

-- Publish counter changes for Supabase Realtime. The DO blocks make the
-- migration idempotent if the table has already been added to the publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'attendance_counter_sessions'
     ) then
    alter publication supabase_realtime add table public.attendance_counter_sessions;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'attendance_counter_entries'
     ) then
    alter publication supabase_realtime add table public.attendance_counter_entries;
  end if;
end $$;
