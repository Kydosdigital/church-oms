-- Church OMS
-- Migration 0018: platform-owner administration layer.
--
-- Platform admins are deliberately separate from church-level Super Admins.
-- This table does NOT grant browser-side access across church tenants. The app
-- checks membership here first, then performs cross-tenant analytics through
-- the server-only service-role client.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin', 'support')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

revoke all on table public.platform_admins from anon, authenticated;
grant select on table public.platform_admins to authenticated;

drop policy if exists platform_admins_self_select on public.platform_admins;
create policy platform_admins_self_select on public.platform_admins
for select
using (user_id = auth.uid() and active = true);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
      and pa.active = true
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
