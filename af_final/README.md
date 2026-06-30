# 💰 Assistente Financeiro

App de controle financeiro pessoal com IA integrada.

## Stack

- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **Backend:** Supabase (Auth, DB, Realtime, Edge Functions)
- **IA:** Google Gemini 1.5 Flash (fallback: Groq LLaMA3)
- **Deploy:** Vercel + Cloudflare (CDN/WAF)
- **Email:** Resend (via Supabase Auth)
- **Monitoramento:** Sentry

---

## ⚡ Setup rápido

### 1. Clone e instale
```bash
git clone git@github.com:yohran1/assistente_financeiro.git
cd assistente_financeiro
npm install
```

### 2. Configure variáveis de ambiente
```bash
cp .env.example .env
# Edite .env com suas chaves do Supabase e Sentry
```

### 3. Configure o Supabase
1. Acesse [app.supabase.com](https://app.supabase.com)
2. Crie um projeto
3. Vá em **SQL Editor** → cole o conteúdo de `supabase/migrations/001_initial_schema.sql`
4. Execute o SQL
5. Vá em **Authentication → Settings**:
   - Email confirmations: **Required**
   - JWT expiry: **3600**
6. Copie a **URL** e **anon key** para seu `.env`

### 4. Configure as Edge Functions
```bash
# Instale o CLI do Supabase
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Configure os secrets (NUNCA commitar!)
supabase secrets set GEMINI_API_KEY=sua_chave
supabase secrets set GROQ_API_KEY=sua_chave
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua_chave
supabase secrets set ALLOWED_ORIGIN=https://www.assistente-financeiro-blue.app,https://assistente-financeiro-blue.app

# Deploy das functions
supabase functions deploy ai-proxy
supabase functions deploy delete-account
```

### 5. Rode localmente
```bash
npm run dev
# Acesse: http://localhost:3000
```

### 6. Deploy na Vercel
```bash
# Instale a CLI da Vercel
npm install -g vercel

# Deploy
vercel

# Configure as variáveis de ambiente na Vercel:
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SENTRY_DSN
```

---

## 🔒 Segurança

| Camada | Tecnologia |
|--------|-----------|
| CDN + WAF + DDoS | Cloudflare Free |
| TLS 1.3 + HSTS | Cloudflare + Vercel |
| Auth + JWT | Supabase Auth |
| Banco isolado | Row Level Security (RLS) |
| Validação | Zod + DOMPurify |
| API Keys | Supabase Edge Functions (server-side) |
| Monitoramento | Sentry |
| LGPD | Exportação + Exclusão de dados |

---

## 📁 Estrutura

```
src/
├── components/
│   ├── ui/          # Button, Input, Modal, CurrencyInput...
│   ├── charts/      # ExpensePieChart, BalanceBarChart
│   ├── chat/        # ChatWidget (IA assistente)
│   └── layout/      # Sidebar, AppLayout
├── pages/
│   ├── Auth/        # Login, Register, Confirm, ForgotPassword
│   ├── Dashboard/   # Painel principal
│   ├── Expenses/    # CRUD de transações e recorrentes
│   ├── Analytics/   # Relatórios e gráficos
│   └── Profile/     # Perfil, senha, LGPD
├── hooks/           # useAuth, useFinances
├── lib/             # supabase.js, ai-router.js
└── services/        # auth.js, finances.js

supabase/
├── migrations/      # SQL do schema (001_initial_schema.sql)
└── functions/
    ├── ai-proxy/    # Proxy Gemini/Groq (server-side)
    └── delete-account/ # Exclusão LGPD
```

---

## 🚀 Funcionalidades

- ✅ Dark mode por padrão (design Apple)
- ✅ Autenticação com confirmação de email
- ✅ Dashboard com saldo, cartão e gráficos em tempo real
- ✅ Gráfico de pizza por categoria
- ✅ Gráfico de barras receitas vs gastos
- ✅ CRUD completo de transações
- ✅ Gastos recorrentes (assinaturas, aluguel etc.)
- ✅ Chat com IA financeira (Gemini + Groq fallback)
- ✅ A IA pode inserir dados por comando de voz/texto
- ✅ Perfil com alteração de senha
- ✅ Exportação de dados (LGPD)
- ✅ Exclusão de conta em cascata (LGPD)
- ✅ Realtime via Supabase WebSocket

---

## ⚠️ NUNCA commitar

- `.env` (apenas `.env.example`)
- `supabase/config.toml` com secrets
- Qualquer arquivo com API keys reais
