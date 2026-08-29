-- Church OMS
-- Migration 0033: enforce tenant-safe reference scope on join and finance rows.
--
-- Closes three integrity gaps:
-- 1) programme_guest_ministers must reference an active minister in the
--    programme creator's church;
-- 2) offering-category/service-type mappings must stay inside one church; and
-- 3) revenue entries must use an active offering category belonging to the
--    same church and applicable to the programme's service type.
--
-- Delete policies stay permissive enough for authorised staff to clean up an
-- old invalid row. Update checks preserve historic rows if a category is later
-- deactivated, while still preventing the row from being moved across scope.

drop policy if exists category_service_types_insert
  on public.offering_category_service_types;

create policy category_service_types_insert
on public.offering_category_service_types
for insert
to authenticated
with check (
  private.is_administrator()
  and category_id in (
    select c.id
    from public.offering_categories c
    where c.church_id = private.current_church_id()
  )
  and service_type_id in (
    select s.id
    from public.service_types s
    where s.church_id = private.current_church_id()
      and s.active = true
  )
);

drop policy if exists category_service_types_update
  on public.offering_category_service_types;

create policy category_service_types_update
on public.offering_category_service_types
for update
to authenticated
using (
  private.is_administrator()
  and category_id in (
    select c.id
    from public.offering_categories c
    where c.church_id = private.current_church_id()
  )
)
with check (
  private.is_administrator()
  and category_id in (
    select c.id
    from public.offering_categories c
    where c.church_id = private.current_church_id()
  )
  and service_type_id in (
    select s.id
    from public.service_types s
    where s.church_id = private.current_church_id()
      and s.active = true
  )
);

drop policy if exists programme_guest_ministers_insert
  on public.programme_guest_ministers;

create policy programme_guest_ministers_insert
on public.programme_guest_ministers
for insert
to authenticated
with check (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.branch_id in (
      select private.user_branch_ids('usher'::public.app_role)
    )
      and p.created_by = (select auth.uid())
  )
  and minister_id in (
    select m.id
    from public.ministers m
    where m.church_id = private.current_church_id()
      and m.active = true
  )
);

drop policy if exists programme_guest_ministers_update
  on public.programme_guest_ministers;

create policy programme_guest_ministers_update
on public.programme_guest_ministers
for update
to authenticated
using (
  programme_id in (
    select p.id
    from public.programme_occurrences p
    where p.branch_id in (
      select private.user_branch_ids('usher'::public.app_role)
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
      select private.user_branch_ids('usher'::public.app_role)
    )
      and p.created_by = (select auth.uid())
  )
  and minister_id in (
    select m.id
    from public.ministers m
    where m.church_id = private.current_church_id()
      and m.active = true
  )
);

drop policy if exists revenue_insert on public.revenue_entries;

create policy revenue_insert
on public.revenue_entries
for insert
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
      and p.church_id = private.current_church_id()
      and p.branch_id in (select private.user_branch_ids())
      and p.finance_state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and private.has_finance_permission(p.branch_id)
      and (
        private.has_role('treasurer'::public.app_role, p.branch_id)
        or private.is_administrator()
      )
      and exists (
        select 1
        from public.offering_categories c
        where c.id = revenue_entries.category_id
          and c.church_id = p.church_id
          and c.active = true
          and (
            c.applies_to_all_service_types = true
            or exists (
              select 1
              from public.offering_category_service_types cs
              where cs.category_id = c.id
                and cs.service_type_id = p.service_type_id
            )
          )
      )
  )
);

drop policy if exists revenue_update on public.revenue_entries;

create policy revenue_update
on public.revenue_entries
for update
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
      and p.church_id = private.current_church_id()
      and p.branch_id in (select private.user_branch_ids())
      and p.finance_state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and private.has_finance_permission(p.branch_id)
      and (
        private.has_role('treasurer'::public.app_role, p.branch_id)
        or private.is_administrator()
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
      and p.church_id = private.current_church_id()
      and p.branch_id in (select private.user_branch_ids())
      and p.finance_state in (
        'draft'::public.record_state,
        'returned'::public.record_state,
        'reopened'::public.record_state
      )
      and private.has_finance_permission(p.branch_id)
      and (
        private.has_role('treasurer'::public.app_role, p.branch_id)
        or private.is_administrator()
      )
      and exists (
        select 1
        from public.offering_categories c
        where c.id = revenue_entries.category_id
          and c.church_id = p.church_id
          and (
            c.applies_to_all_service_types = true
            or exists (
              select 1
              from public.offering_category_service_types cs
              where cs.category_id = c.id
                and cs.service_type_id = p.service_type_id
            )
          )
      )
  )
);
