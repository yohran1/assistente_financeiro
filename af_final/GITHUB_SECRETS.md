# 🔑 Secrets do GitHub — configure antes do primeiro push

Acesse: github.com → seu repositório → Settings → Secrets and variables → Actions → New repository secret

## Secrets obrigatórios

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | URL pública do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | anon public key completa |
| `VITE_SENTRY_DSN` | DSN público do projeto Sentry |
| `SENTRY_AUTH_TOKEN` | token Sentry completo |
| `SENTRY_ORG` | `financas-assistente` |
| `SENTRY_PROJECT` | `assistente-financeiro` |
| `UPSTASH_REDIS_REST_URL` | URL REST do Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | token REST completo do Upstash |

## Secrets para deploy automático na Vercel

Estes 3 você pega após conectar o projeto na Vercel:

| Nome | Onde pegar |
|------|-----------|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | vercel.com → seu projeto → Settings → General → Team ID |
| `VERCEL_PROJECT_ID` | vercel.com → seu projeto → Settings → General → Project ID |

## Como adicionar cada secret

1. Vá em: `github.com/yohran1/assistente_financeiro/settings/secrets/actions`
2. Clique **"New repository secret"**
3. Cole o Nome e o Valor
4. Clique **"Add secret"**
5. Repita para cada linha da tabela acima
