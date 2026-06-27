-- ============================================================
-- ASSISTENTE FINANCEIRO — Schema inicial
-- Execute no painel do Supabase: SQL Editor > New Query
-- ============================================================

-- Extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tabela: profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL DEFAULT '',
  account_balance      NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit_card_balance  NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit_card_limit    NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabela: categories ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#3d6fff',
  icon       TEXT NOT NULL DEFAULT 'tag',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabela: transactions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  type        TEXT NOT NULL CHECK (type IN ('income','expense','investment','saving')),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabela: recurring_expenses ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  amount       NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  category_id  UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabela: audit_log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  action     TEXT NOT NULL,
  record_id  UUID,
  old_data   JSONB,
  new_data   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES — performance no RLS
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id      ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date         ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type         ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_categories_user_id        ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user_id         ON public.recurring_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id             ON public.audit_log(user_id);

-- ============================================================
-- ROW LEVEL SECURITY — habilitar em TODAS as tabelas
-- ============================================================
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log          ENABLE ROW LEVEL SECURITY;

-- ── Policies: profiles ──────────────────────────────────────
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- ── Policies: categories ────────────────────────────────────
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "categories_delete" ON public.categories
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ── Policies: transactions ──────────────────────────────────
CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "transactions_delete" ON public.transactions
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ── Policies: recurring_expenses ────────────────────────────
CREATE POLICY "recurring_select" ON public.recurring_expenses
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "recurring_insert" ON public.recurring_expenses
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "recurring_update" ON public.recurring_expenses
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "recurring_delete" ON public.recurring_expenses
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ── Policies: audit_log (somente leitura) ───────────────────
CREATE POLICY "audit_select" ON public.audit_log
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- TRIGGER: cria profile automaticamente ao cadastrar
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: audit log em transactions
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log(user_id, table_name, action, record_id, old_data)
    VALUES (OLD.user_id, 'transactions', 'DELETE', OLD.id, row_to_json(OLD)::jsonb);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log(user_id, table_name, action, record_id, old_data, new_data)
    VALUES (NEW.user_id, 'transactions', 'UPDATE', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log(user_id, table_name, action, record_id, new_data)
    VALUES (NEW.user_id, 'transactions', 'INSERT', NEW.id, row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS audit_transactions_trigger ON public.transactions;
CREATE TRIGGER audit_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_transactions();

-- ============================================================
-- CATEGORIAS PADRÃO (inseridas via trigger ao criar usuário)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, color, icon) VALUES
    (NEW.id, 'Alimentação',    '#f97316', 'utensils'),
    (NEW.id, 'Moradia',        '#8b5cf6', 'home'),
    (NEW.id, 'Transporte',     '#06b6d4', 'car'),
    (NEW.id, 'Saúde',          '#10b981', 'heart'),
    (NEW.id, 'Lazer',          '#f59e0b', 'gamepad'),
    (NEW.id, 'Educação',       '#3b82f6', 'book'),
    (NEW.id, 'Vestuário',      '#ec4899', 'shirt'),
    (NEW.id, 'Assinaturas',    '#6366f1', 'repeat'),
    (NEW.id, 'Outros',         '#6b7280', 'tag');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_categories();
