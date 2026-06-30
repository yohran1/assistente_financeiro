# ✅ CHECKLIST COMPLETO — Do zero ao deploy com agentes

## ETAPA 1 — Projeto React (já feito ✅)
- [x] Código do app gerado
- [x] .env preenchido com Supabase + Sentry
- [x] SQL executado no Supabase
- [x] Secrets setados no Supabase CLI (GEMINI, GROQ, SB_SERVICE_ROLE_KEY, ALLOWED_ORIGIN)

## ETAPA 2 — Edge Functions (pendente)

Execute no terminal na pasta do projeto:
```bash
supabase functions deploy ai-proxy
supabase functions deploy delete-account
```
Retorno esperado: `Finished supabase functions deploy.`

Teste: abra http://localhost:3000, crie conta, confirme email, teste o chat IA.

## ETAPA 3 — GitHub (fazer agora)

```bash
cd C:\Users\Yohran\Downloads\assistente_financeiro_v4_AUDITADO\af_final

git init
git add .
git commit -m "feat: assistente financeiro completo com agentes IA"
git branch -M main
git remote add origin https://github.com/yohran1/assistente_financeiro.git
git push -u origin main
```

Não coloque token na URL do remote. Faça login com `gh auth login` ou use o gerenciador de credenciais local.

Depois configure os Secrets do GitHub conforme GITHUB_SECRETS.md

## ETAPA 4 — Vercel

```bash
npm install -g vercel
vercel login
vercel
```
Após o deploy, adicione as variáveis de ambiente:
- vercel.com → seu projeto → Settings → Environment Variables
- Adicione as mesmas 4 do .env

Pegue o Project ID e Org ID e adicione como secrets no GitHub.

Atualize o Site URL no Supabase:
- app.supabase.com → Authentication → Settings → Site URL → `https://assistente-financeiro.app`
- Redirect URLs: `https://assistente-financeiro.app/**`, `https://www.assistente-financeiro.app/**`

Atualize ALLOWED_ORIGIN na Edge Function:
```bash
supabase secrets set ALLOWED_ORIGIN=https://assistente-financeiro.app,https://www.assistente-financeiro.app
supabase functions deploy ai-proxy
supabase functions deploy pluggy
supabase functions deploy delete-account
```

## ETAPA 5 — Agentes IA (após Python instalado)

```bash
# Instalar Python 3.11+ se não tiver: python.org/downloads

# Instalar dependências dos agentes
pip install -r agents/requirements.txt
pip install playwright && playwright install chromium

# Rodar os agentes
python agents/main.py
```

Ao rodar, você verá o menu interativo. Digite uma demanda e os agentes:
1. PM clarifica → 2. Frontend/Backend implementa → 3. Tester valida
4. Security revisa → 5. DevOps faz commit + push + deploy automático

## ETAPA 6 — Vercel Deploy Hook (para agentes deployarem)

1. vercel.com → seu projeto → Settings → Git → Deploy Hooks
2. Clique "Create Hook" → nome: "AgentesIA" → branch: main
3. Copie a URL gerada
4. Edite agents/.env.agents → VERCEL_DEPLOY_HOOK=URL_COPIADA

---

## Status das credenciais

| Serviço | Status |
|---------|--------|
| Supabase URL + Anon Key | ✅ configurado |
| Supabase service_role | ✅ no Supabase CLI |
| Gemini API | ✅ no .env.agents |
| Groq API | ✅ no .env.agents |
| Redis Upstash | ✅ no .env.agents |
| GitHub Token | ✅ no .env.agents |
| Sentry DSN | ✅ no .env |
| Vercel Token | ⏳ após criar na Vercel |
| Vercel Deploy Hook | ⏳ após criar na Vercel |
