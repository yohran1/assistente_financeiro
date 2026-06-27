# AGENTS.md

## Cursor Cloud specific instructions

### Project layout
- The application lives in `af_final/` (React + Vite + Tailwind frontend, Supabase backend). Run all `npm`/`supabase` commands from `af_final/`.
- Standard scripts are in `af_final/package.json`: `npm run dev` (Vite on port 3000), `npm run build`, `npm run lint`, `npm run test` (Vitest), `npm run test:e2e` (Playwright). Lint/test/build need no backend.

### Cloud Agent environment definition
The cloud environment is defined in-repo via `.cursor/environment.json` (used because the Bitbucket workspace snapshot-save flow may be unavailable). It builds `.cursor/Dockerfile` (Node 22 + Docker + Supabase CLI), runs `install` (`npm install` + creates `af_final/.env` if missing), then `start` (launches `dockerd` and `supabase start`), and a `dev` terminal runs `npm run dev`. If a fresh VM is provisioned from the default image instead (no Docker), follow the manual steps below.

### Backend = local Supabase (requires Docker)
The app cannot do anything beyond rendering auth pages without a Supabase backend (auth + Postgres + RLS). Docker and the Supabase CLI are preinstalled in the VM image. They are NOT started automatically — start them each session:

1. Start the Docker daemon (it does not auto-start): run `sudo dockerd` in a background/tmux session. The `ubuntu` user is already in the `docker` group; if you hit a socket permission error, run `sudo chmod 666 /var/run/docker.sock`.
2. From `af_final/`, run `supabase start` (takes ~1 min; pulls images on first run). It applies `supabase/migrations/*.sql` and then `supabase/seed.sql` automatically.
3. Start the frontend: `npm run dev`, then open http://localhost:3000.

Docker daemon note: the VM kernel needs `fuse-overlayfs` storage driver with the containerd snapshotter disabled (already set in `/etc/docker/daemon.json`). Do not switch the storage driver to `overlay2`.

### Non-obvious gotcha: table grants (`supabase/seed.sql`)
The migration enables RLS but never `GRANT`s table privileges. Hosted Supabase auto-grants `SELECT/INSERT/UPDATE/DELETE` to the `anon`/`authenticated` roles, but the local Postgres image's default privileges only grant `TRUNCATE/REFERENCES/TRIGGER`. Without grants, every authenticated query fails with `permission denied for table ...` (Postgres error `42501`) even though login works. `supabase/seed.sql` (added for local dev) applies the missing grants and runs automatically on `supabase start` / `supabase db reset`. If you ever apply the migration to a DB without running the seed, you must grant the DML privileges manually.

### Frontend env (`af_final/.env`, gitignored)
The frontend reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from `af_final/.env`. For local dev point these at the local stack:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key printed by `supabase start`, or `supabase status`>
```
The local anon key is a fixed demo key (not a secret) and is identical across runs. If `.env` is missing, recreate it from `.env.example` with the values above. The AI chat (Gemini/Groq) and Sentry require real keys and are optional — they are not needed to run/test core flows.

### Auth flow notes
- Local Supabase has email confirmation disabled, so a new signup is immediately usable. The Register page always shows a "Confirme seu email" screen regardless; just go to `/login` and sign in.
- Regular (one-off) transactions are added from the **Dashboard** via the "Nova transação" button. The Gastos/Expenses page only adds *recurring* expenses; it lists one-off transactions but cannot create them.
- Emails (confirmation/reset) are captured locally by Mailpit at http://127.0.0.1:54324.
