-- Fase D: origem do pagamento (conta vs cartão) e assinaturas
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_source TEXT NOT NULL DEFAULT 'account'
    CHECK (payment_source IN ('account', 'credit_card'));

ALTER TABLE public.recurring_expenses
  ADD COLUMN IF NOT EXISTS payment_source TEXT NOT NULL DEFAULT 'account'
    CHECK (payment_source IN ('account', 'credit_card'));

-- Expand purchase_type to include subscription marker on transactions (optional legacy)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_purchase_type_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_purchase_type_check
    CHECK (purchase_type IN ('one_off', 'installment', 'subscription'));

COMMENT ON COLUMN public.transactions.payment_source IS 'account | credit_card — onde o valor é debitado/comprometido';
COMMENT ON COLUMN public.recurring_expenses.payment_source IS 'account | credit_card — conta corrente ou fatura do cartão';
