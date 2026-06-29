-- Fase E: pagamento de fatura do cartão
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credit_card_invoice_paid_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.credit_card_invoice_paid_at IS 'Data/hora do último pagamento da fatura do cartão';
