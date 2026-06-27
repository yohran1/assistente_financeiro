-- ============================================================
-- LOCAL DEV SEED — runs automatically after migrations on
-- `supabase start` / `supabase db reset`.
--
-- Hosted Supabase grants the API roles (anon/authenticated)
-- SELECT/INSERT/UPDATE/DELETE on public tables by default. The
-- local Postgres image's default privileges only grant
-- TRUNCATE/REFERENCES/TRIGGER, so RLS-protected tables created
-- by the migration return "permission denied" (42501) until the
-- DML grants are added. This restores parity for local dev only.
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
  TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES
  TO anon, authenticated, service_role;
