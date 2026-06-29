-- Saldo acumulado de poupança e investimentos (além das transações mensais)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS savings_balance     NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS investment_balance  NUMERIC(14,2) NOT NULL DEFAULT 0;
