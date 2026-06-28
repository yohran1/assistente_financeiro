-- Fase A: datas de fechamento e vencimento da fatura do cartão
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credit_card_closing_day INTEGER
    CHECK (credit_card_closing_day IS NULL OR credit_card_closing_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS credit_card_due_day INTEGER
    CHECK (credit_card_due_day IS NULL OR credit_card_due_day BETWEEN 1 AND 31);

COMMENT ON COLUMN public.profiles.credit_card_closing_day IS 'Dia do mês em que a fatura fecha (1-31)';
COMMENT ON COLUMN public.profiles.credit_card_due_day IS 'Dia do mês em que a fatura vence (1-31)';
