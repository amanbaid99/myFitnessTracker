-- Clients may only mark their own insights read. The update policy limits
-- rows to the owner; this limits columns to read_at, so a user cannot
-- rewrite an insight's title, summary or owner. The analysis task writes
-- with the service role, which is unaffected.

revoke update on public.insights from anon, authenticated;
grant update (read_at) on public.insights to authenticated;
