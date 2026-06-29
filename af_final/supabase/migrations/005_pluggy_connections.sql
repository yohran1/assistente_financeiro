-- Fase E: conexões Open Finance (Pluggy) — tokens sensíveis via Vault no futuro
CREATE TABLE IF NOT EXISTS public.pluggy_connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
  last_sync_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_pluggy_connections_user_id ON public.pluggy_connections(user_id);

ALTER TABLE public.pluggy_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY pluggy_connections_select ON public.pluggy_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY pluggy_connections_insert ON public.pluggy_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY pluggy_connections_update ON public.pluggy_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY pluggy_connections_delete ON public.pluggy_connections FOR DELETE USING (auth.uid() = user_id);
