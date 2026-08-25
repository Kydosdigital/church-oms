-- Correction to 0006: RLS policies evaluate their expressions as the
-- querying role (authenticated), so authenticated must retain direct EXECUTE
-- on every helper function referenced inside a policy — SECURITY DEFINER
-- only changes whose privileges apply *inside* the function body, not who is
-- allowed to call it. Revoking EXECUTE from authenticated on these functions
-- would break every RLS policy that calls them. anon still gets none: no
-- anonymous request should be evaluating these policies at all.

grant execute on function current_church_id() to authenticated;
grant execute on function user_branch_ids(app_role) to authenticated;
grant execute on function has_role(app_role, uuid) to authenticated;
grant execute on function is_administrator() to authenticated;
grant execute on function has_finance_permission(uuid) to authenticated;
