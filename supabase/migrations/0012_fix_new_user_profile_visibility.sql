-- Church Operations Management System
-- Migration 0012: allow a signed-in user to read their own app_users row
-- before church onboarding has assigned church_id.
--
-- Without this, a freshly-created auth user has app_users.church_id = NULL,
-- while app_users_select only allows rows whose church_id matches
-- current_church_id(). PostgreSQL NULL = NULL is not true, so the user's own
-- profile is hidden by RLS. The app then treats the user as missing and
-- redirects /dashboard -> /login while auth middleware redirects the signed-in
-- user /login -> /dashboard, creating a redirect loop.

begin;

-- Replace the original church-directory-only SELECT policy with one that also
-- guarantees self-visibility. Church directory visibility remains unchanged.
drop policy if exists app_users_select on public.app_users;

create policy app_users_select
on public.app_users
for select
to authenticated
using (
  id = (select auth.uid())
  or (
    church_id is not null
    and church_id = public.current_church_id()
  )
);

commit;
