# 🤖 Agentes IA — Assistente Financeiro

## Setup em 3 passos

### 1. Instalar Python e dependências
```bash
# No terminal, na pasta raiz do projeto
pip install -r agents/requirements.txt
```

### 2. Configurar credenciais
```bash
# Copie o template
copy agents\.env.agents agents\.env.agents.local

# Edite agents/.env.agents e preencha:
# - UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN (upstash.com → grátis)
# - GITHUB_TOKEN (github.com → Settings → Developer settings → Tokens)
# - VERCEL_DEPLOY_HOOK (vercel.com → seu projeto → Settings → Git → Deploy Hooks)
# O resto já está preenchido com suas chaves
```

### 3. Rodar os agentes
```bash
python agents/main.py
```

---

## Como funciona o fluxo

```
Você digita → PM Agent (clarifica) → Agente técnico (implementa)
→ Tester (testa) → Security (revisa) → DevOps (commit + deploy)
```

### Failover automático
- Cada agente principal (Gemini) tem um reserva (Groq)
- Se o principal travar: reserva assume em <5s lendo o estado do Redis
- 2 Doctor Agents monitoram todos e reparam falhas em paralelo

---

## Exemplos de demandas

```
"Adicionar gráfico de linha no dashboard com evolução do saldo"
"Corrigir layout mobile da página de Gastos"
"Melhorar resposta da IA no chat financeiro"
"Adicionar campo de notas nas transações"
"Criar filtro por data na página de Gastos"
```

---

## Estrutura dos arquivos

```
agents/
├── main.py          ← Ponto de entrada (python agents/main.py)
├── crew.py          ← Orquestrador com failover
├── agents.py        ← Definição dos 16 agentes + 2 doctors
├── tasks.py         ← Fábrica de tarefas por tipo
├── tools.py         ← Ferramentas (arquivo, git, build, security)
├── llm_router.py    ← Gemini/Groq router
├── state.py         ← Estado Redis para failover
├── config.py        ← Configuração central
├── .env.agents      ← Suas credenciais (não commitar)
├── requirements.txt ← Dependências Python
└── README_AGENTES.md
```
