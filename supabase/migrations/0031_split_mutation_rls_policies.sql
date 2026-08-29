-- Church OMS
-- Migration 0031: split mutation RLS policies by command.
--
-- Supabase reports multiple permissive policies when a SELECT policy overlaps
-- a write policy declared FOR ALL. This migration removes that accidental
-- SELECT participation while preserving the existing authorization union.
--
-- Revenue is the one policy set where the write predicate intentionally
-- contributed draft visibility for current finance editors. That visibility is
-- folded into revenue_select before revenue_write is split.

drop policy if exists app_users_admin_write on public.app_users;
drop policy if exists app_users_update_self on public.app_users;

create policy app_users_admin_insert
on public.app_users for insert
with check (
  church_id = public.current_church_id()
  and public.is_administrator()
);

create policy app_users_update
on public.app_users for update
using (
  id = (select auth.uid())
  or (
    church_id = public.current_church_id()
    and public.is_administrator()
  )
)
with check (
  id = (select auth.uid())
  or (
    church_id = public.current_church_id()
    and public.is_administrator()
  )
);

create policy app_users_admin_delete
on public.app_users for delete
using (
  church_id = public.current_church_id()
  and public.is_administrator()
);

drop policy if exists attendance_write on public.attendance_records;

create policy attendance_insert
on public.attendance_records for insert
to authenticated
with check (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.church_id = public.current_church_id()
      and p.created_by = (select auth.uid())
      and p.state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and (
        p.branch_id in (
          select public.user_branch_ids('usher'::public.app_role)
        )
        or public.is_administrator()
      )
  )
);

create policy attendance_update
on public.attendance_records for update
to authenticated
using (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.church_id = public.current_church_id()
      and p.created_by = (select auth.uid())
      and p.state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and (
        p.branch_id in (
          select public.user_branch_ids('usher'::public.app_role)
        )
        or public.is_administrator()
      )
  )
)
with check (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.church_id = public.current_church_id()
      and p.created_by = (select auth.uid())
      and p.state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and (
        p.branch_id in (
          select public.user_branch_ids('usher'::public.app_role)
        )
        or public.is_administrator()
      )
  )
);

create policy attendance_delete
on public.attendance_records for delete
to authenticated
using (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.church_id = public.current_church_id()
      and p.created_by = (select auth.uid())
      and p.state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and (
        p.branch_id in (
          select public.user_branch_ids('usher'::public.app_role)
        )
        or public.is_administrator()
      )
  )
);

drop policy if exists branches_write on public.branches;

create policy branches_insert
on public.branches for insert
with check (
  church_id = public.current_church_id()
  and public.is_administrator()
);

create policy branches_update
on public.branches for update
using (
  church_id = public.current_church_id()
  and public.is_administrator()
)
with check (
  church_id = public.current_church_id()
  and public.is_administrator()
);

create policy branches_delete
on public.branches for delete
using (
  church_id = public.current_church_id()
  and public.is_administrator()
);

drop policy if exists projects_write on public.fundraising_projects;

create policy projects_insert
on public.fundraising_projects for insert
with check (
  category_id in (
    select id
    from public.offering_categories
    where church_id = public.current_church_id()
  )
  and public.is_administrator()
);

create policy projects_update
on public.fundraising_projects for update
using (
  category_id in (
    select id
    from public.offering_categories
    where church_id = public.current_church_id()
  )
  and public.is_administrator()
)
with check (
  category_id in (
    select id
    from public.offering_categories
    where church_id = public.current_church_id()
  )
  and public.is_administrator()
);

create policy projects_delete
on public.fundraising_projects for delete
using (
  category_id in (
    select id
    from public.offering_categories
    where church_id = public.current_church_id()
  )
  and public.is_administrator()
);

drop policy if exists ministers_write on public.ministers;

create policy ministers_insert
on public.ministers for insert
with check (
  church_id = public.current_church_id()
  and (
    public.is_administrator()
    or public.has_role('usher'::public.app_role)
  )
);

create policy ministers_update
on public.ministers for update
using (
  church_id = public.current_church_id()
  and (
    public.is_administrator()
    or public.has_role('usher'::public.app_role)
  )
)
with check (
  church_id = public.current_church_id()
  and (
    public.is_administrator()
    or public.has_role('usher'::public.app_role)
  )
);

create policy ministers_delete
on public.ministers for delete
using (
  church_id = public.current_church_id()
  and (
    public.is_administrator()
    or public.has_role('usher'::public.app_role)
  )
);

drop policy if exists categories_write on public.offering_categories;

create policy categories_insert
on public.offering_categories for insert
with check (
  church_id = public.current_church_id()
  and public.is_administrator()
);

create policy categories_update
on public.offering_categories for update
using (
  church_id = public.current_church_id()
  and public.is_administrator()
)
with check (
  church_id = public.current_church_id()
  and public.is_administrator()
);

create policy categories_delete
on public.offering_categories for delete
using (
  church_id = public.current_church_id()
  and public.is_administrator()
);

drop policy if exists category_service_types_write
on public.offering_category_service_types;

create policy category_service_types_insert
on public.offering_category_service_types for insert
with check (
  category_id in (
    select id
    from public.offering_categories
    where church_id = public.current_church_id()
  )
  and public.is_administrator()
);

create policy category_service_types_update
on public.offering_category_service_types for update
using (
  category_id in (
    select id
    from public.offering_categories
    where church_id = public.current_church_id()
  )
  and public.is_administrator()
)
with check (
  category_id in (
    select id
    from public.offering_categories
    where church_id = public.current_church_id()
  )
  and public.is_administrator()
);

create policy category_service_types_delete
on public.offering_category_service_types for delete
using (
  category_id in (
    select id
    from public.offering_categories
    where church_id = public.current_church_id()
  )
  and public.is_administrator()
);

drop policy if exists programme_guest_ministers_write
on public.programme_guest_ministers;

create policy programme_guest_ministers_insert
on public.programme_guest_ministers for insert
with check (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.branch_id in (
      select public.user_branch_ids('usher'::public.app_role)
    )
      and p.created_by = (select auth.uid())
  )
);

create policy programme_guest_ministers_update
on public.programme_guest_ministers for update
using (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.branch_id in (
      select public.user_branch_ids('usher'::public.app_role)
    )
      and p.state in (
        'draft'::public.record_state,
        'returned'::public.record_state
      )
      and p.created_by = (select auth.uid())
  )
)
with check (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.branch_id in (
      select public.user_branch_ids('usher'::public.app_role)
    )
      and p.created_by = (select auth.uid())
  )
);

create policy programme_guest_ministers_delete
on public.programme_guest_ministers for delete
using (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.branch_id in (
      select public.user_branch_ids('usher'::public.app_role)
    )
      and p.state in (
        'draft'::public.record_state,
        'returned'::public.record_state
      )
      and p.created_by = (select auth.uid())
  )
);

drop policy if exists revenue_select on public.revenue_entries;

create policy revenue_select
on public.revenue_entries for select
to authenticated
using (
  exists (
    select 1
    from public.programme_occurrences p
    where p.id = revenue_entries.programme_id
      and p.church_id = public.current_church_id()
      and p.branch_id in (
        select public.user_branch_ids()
      )
      and public.has_finance_permission(p.branch_id)
      and (
        public.has_finance_history_permission(p.branch_id)
        or (
          revenue_entries.created_by = (select auth.uid())
          and revenue_entries.state <> 'verified'::public.record_state
        )
        or (
          public.has_role(
            'finance_verifier'::public.app_role,
            p.branch_id
          )
          and revenue_entries.state = 'submitted'::public.record_state
        )
        or (
          revenue_entries.state in (
            'draft'::public.record_state,
            'returned'::public.record_state,
            'reopened'::public.record_state
          )
          and p.finance_state in (
            'draft'::public.record_state,
            'returned'::public.record_state,
            'reopened'::public.record_state
          )
          and (
            public.has_role(
              'treasurer'::public.app_role,
              p.branch_id
            )
            or public.is_administrator()
          )
        )
      )
  )
);

drop policy if exists revenue_write on public.revenue_entries;

create policy revenue_insert
on public.revenue_entries for insert
to authenticated
with check (
  state in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  )
  and exists (
    select 1
    from public.programme_occurrences p
    where p.id = revenue_entries.programme_id
      and p.church_id = public.current_church_id()
      and p.branch_id in (
        select public.user_branch_ids()
      )
      and p.finance_state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and public.has_finance_permission(p.branch_id)
      and (
        public.has_role(
          'treasurer'::public.app_role,
          p.branch_id
        )
        or public.is_administrator()
      )
  )
);

create policy revenue_update
on public.revenue_entries for update
to authenticated
using (
  state in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  )
  and exists (
    select 1
    from public.programme_occurrences p
    where p.id = revenue_entries.programme_id
      and p.church_id = public.current_church_id()
      and p.branch_id in (
        select public.user_branch_ids()
      )
      and p.finance_state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and public.has_finance_permission(p.branch_id)
      and (
        public.has_role(
          'treasurer'::public.app_role,
          p.branch_id
        )
        or public.is_administrator()
      )
  )
)
with check (
  state in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  )
  and exists (
    select 1
    from public.programme_occurrences p
    where p.id = revenue_entries.programme_id
      and p.church_id = public.current_church_id()
      and p.branch_id in (
        select public.user_branch_ids()
      )
      and p.finance_state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and public.has_finance_permission(p.branch_id)
      and (
        public.has_role(
          'treasurer'::public.app_role,
          p.branch_id
        )
        or public.is_administrator()
      )
  )
);

create policy revenue_delete
on public.revenue_entries for delete
to authenticated
using (
  state in (
    'draft'::public.record_state,
    'returned'::public.record_state,
    'reopened'::public.record_state
  )
  and exists (
    select 1
    from public.programme_occurrences p
    where p.id = revenue_entries.programme_id
      and p.church_id = public.current_church_id()
      and p.branch_id in (
        select public.user_branch_ids()
      )
      and p.finance_state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and public.has_finance_permission(p.branch_id)
      and (
        public.has_role(
          'treasurer'::public.app_role,
          p.branch_id
        )
        or public.is_administrator()
      )
  )
);

drop policy if exists service_types_write on public.service_types;

create policy service_types_insert
on public.service_types for insert
with check (
  church_id = public.current_church_id()
  and public.is_administrator()
);

create policy service_types_update
on public.service_types for update
using (
  church_id = public.current_church_id()
  and public.is_administrator()
)
with check (
  church_id = public.current_church_id()
  and public.is_administrator()
);

create policy service_types_delete
on public.service_types for delete
using (
  church_id = public.current_church_id()
  and public.is_administrator()
);

drop policy if exists user_roles_admin_write on public.user_roles;

create policy user_roles_admin_insert
on public.user_roles for insert
with check (
  exists (
    select 1
    from public.app_users u
    where u.id = user_roles.user_id
      and u.church_id = public.current_church_id()
  )
  and (
    public.is_super_admin()
    or (
      public.has_role('administrator'::public.app_role)
      and role <> 'super_admin'::public.app_role
    )
  )
);

create policy user_roles_admin_update
on public.user_roles for update
using (
  exists (
    select 1
    from public.app_users u
    where u.id = user_roles.user_id
      and u.church_id = public.current_church_id()
  )
  and (
    public.is_super_admin()
    or (
      public.has_role('administrator'::public.app_role)
      and role <> 'super_admin'::public.app_role
    )
  )
)
with check (
  exists (
    select 1
    from public.app_users u
    where u.id = user_roles.user_id
      and u.church_id = public.current_church_id()
  )
  and (
    public.is_super_admin()
    or (
      public.has_role('administrator'::public.app_role)
      and role <> 'super_admin'::public.app_role
    )
  )
);

create policy user_roles_admin_delete
on public.user_roles for delete
using (
  exists (
    select 1
    from public.app_users u
    where u.id = user_roles.user_id
      and u.church_id = public.current_church_id()
  )
  and (
    public.is_super_admin()
    or (
      public.has_role('administrator'::public.app_role)
      and role <> 'super_admin'::public.app_role
    )
  )
);

drop policy if exists venues_write on public.venues;

create policy venues_insert
on public.venues for insert
with check (
  branch_id in (
    select id
    from public.branches
    where church_id = public.current_church_id()
  )
  and public.is_administrator()
);

create policy venues_update
on public.venues for update
using (
  branch_id in (
    select id
    from public.branches
    where church_id = public.current_church_id()
  )
  and public.is_administrator()
)
with check (
  branch_id in (
    select id
    from public.branches
    where church_id = public.current_church_id()
  )
  and public.is_administrator()
);

create policy venues_delete
on public.venues for delete
using (
  branch_id in (
    select id
    from public.branches
    where church_id = public.current_church_id()
  )
  and public.is_administrator()
);
