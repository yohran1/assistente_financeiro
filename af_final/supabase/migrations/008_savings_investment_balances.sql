-- Saldo acumulado de poupança e investimentos (além das transações mensais)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS savings_balance     NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS investment_balance  NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Recalcula saldos a partir do histórico (corrige perfis afetados antes da migration)
UPDATE public.profiles p
SET
  savings_balance = COALESCE(src.savings, 0),
  investment_balance = COALESCE(src.investment, 0)
FROM (
  SELECT
    user_id,
    SUM(CASE WHEN type = 'saving' THEN amount ELSE 0 END) AS savings,
    SUM(CASE WHEN type = 'investment' THEN amount ELSE 0 END) AS investment
  FROM public.transactions
  GROUP BY user_id
) src
WHERE p.id = src.user_id;
