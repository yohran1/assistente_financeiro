-- Fase C: compras avulsas e parceladas
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS store TEXT,
  ADD COLUMN IF NOT EXISTS purchase_type TEXT NOT NULL DEFAULT 'one_off'
    CHECK (purchase_type IN ('one_off', 'installment')),
  ADD COLUMN IF NOT EXISTS installments_total INTEGER
    CHECK (installments_total IS NULL OR installments_total >= 1),
  ADD COLUMN IF NOT EXISTS installments_paid INTEGER NOT NULL DEFAULT 0
    CHECK (installments_paid >= 0),
  ADD COLUMN IF NOT EXISTS installment_amount NUMERIC(14,2)
    CHECK (installment_amount IS NULL OR installment_amount > 0),
  ADD COLUMN IF NOT EXISTS in_progress BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.transactions.purchase_type IS 'one_off | installment';
COMMENT ON COLUMN public.transactions.installments_paid IS 'Parcelas já pagas (ex.: 3 de 5)';
