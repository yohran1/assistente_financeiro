-- Fase B: sub-carteiras (ex.: multibenefício)
CREATE TABLE IF NOT EXISTS public.wallets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  balance          NUMERIC(14,2) NOT NULL DEFAULT 0,
  include_in_total BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY wallets_select ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY wallets_insert ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY wallets_update ON public.wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY wallets_delete ON public.wallets FOR DELETE USING (auth.uid() = user_id);
