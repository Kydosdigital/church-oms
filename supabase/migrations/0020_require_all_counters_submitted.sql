-- Church OMS
-- Migration 0020: do not close a live counter while an usher is still counting.

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
  v_counting integer;
  v_submitted integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select s.* into v_session
  from public.attendance_counter_sessions s
  join public.app_users u on u.id = v_user_id
  where s.id = p_session_id
    and u.active = true
    and u.church_id = s.church_id;

  if not found then
    raise exception 'Counter session is not available';
  end if;

  if not (
    public.has_role('attendance_verifier'::public.app_role, v_session.branch_id)
    or public.is_administrator()
  ) then
    raise exception 'Only an attendance verifier or administrator can close the counter';
  end if;

  select
    count(*) filter (where e.status = 'counting'),
    count(*) filter (where e.status = 'submitted')
  into v_counting, v_submitted
  from public.attendance_counter_entries e
  where e.session_id = p_session_id;

  if v_counting > 0 then
    raise exception '% usher counter(s) are still counting. Ask them to submit before closing.', v_counting;
  end if;

  if v_submitted = 0 then
    raise exception 'No usher counts have been submitted yet';
  end if;

  update public.attendance_counter_sessions
  set status = 'closed',
      closed_by = v_user_id,
      closed_at = now(),
      updated_at = now()
  where id = p_session_id;

  select coalesce(sum(e.count), 0)::integer into v_total
  from public.attendance_counter_entries e
  where e.session_id = p_session_id
    and e.status = 'submitted';

  return v_total;
end;
$$;

revoke all on function public.close_attendance_counter(uuid) from public, anon;
grant execute on function public.close_attendance_counter(uuid) to authenticated;
