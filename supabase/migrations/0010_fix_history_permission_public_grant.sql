-- Fix for 0009: Postgres grants EXECUTE to PUBLIC automatically on every new
-- function unless revoked explicitly. 0009 revoked from anon and authenticated
-- but not PUBLIC itself, so has_finance_history_permission was still callable
-- by anyone (PUBLIC includes anon) via /rest/v1/rpc — caught by the Supabase
-- security advisor immediately after applying 0009. The other helper
-- functions don't have this problem because 0005 already revoked their
-- PUBLIC grant; this migration does the same for the new one and, going
-- forward, for every future function in this schema.

revoke execute on function has_finance_history_permission(uuid) from public;

alter default privileges in schema public revoke execute on functions from public;
