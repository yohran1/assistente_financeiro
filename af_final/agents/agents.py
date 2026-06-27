"""
Definição de todos os 16 agentes (8 principais + 8 reservas) + 2 Doctor Agents.
Cada agente principal usa Gemini. Cada reserva usa Groq.
"""
from crewai import Agent
from llm_router import get_llm
from tools import (
    read_file, write_file, list_files,
    run_tests, run_build, run_lint,
    git_status, git_commit_push, trigger_vercel_deploy,
    check_security,
)

# ── Ferramentas por perfil ────────────────────────────────────
FILE_TOOLS    = [read_file, write_file, list_files]
BUILD_TOOLS   = [run_tests, run_build, run_lint]
GIT_TOOLS     = [git_status, git_commit_push, trigger_vercel_deploy]
SEC_TOOLS     = [read_file, check_security]
ALL_TOOLS     = FILE_TOOLS + BUILD_TOOLS + GIT_TOOLS + SEC_TOOLS


def make_pm(fallback=False) -> Agent:
    return Agent(
        role="Product Manager Agent" + (" (Reserva)" if fallback else ""),
        goal=(
            "Receber demandas do usuário, clarificar ambiguidades fazendo perguntas objetivas, "
            "converter em tarefas técnicas claras e priorizadas para o Orchestrator."
        ),
        backstory=(
            "Você é um PM experiente em apps financeiros. Conhece o projeto Assistente Financeiro "
            "por completo: suas páginas (Dashboard, Expenses, Analytics, Profile), "
            "componentes (Card, Button, CurrencyInput, ChatWidget), serviços (auth, finances) "
            "e a stack (React+Vite+Tailwind+Supabase). "
            "Nunca executa código — apenas planeja e comunica."
        ),
        tools=[read_file, list_files],
        llm=get_llm(fallback),
        verbose=True,
        allow_delegation=False,
        human_input=True,  # Pausa para confirmar demanda ambígua
    )


def make_orchestrator(fallback=False) -> Agent:
    return Agent(
        role="Orchestrator Agent" + (" (Reserva)" if fallback else ""),
        goal=(
            "Coordenar todos os agentes técnicos. Receber tarefas do PM, "
            "decompor em subtarefas, delegar ao agente correto e garantir que "
            "o fluxo PM → Frontend/Backend/AI → Tester → Security → DevOps seja seguido."
        ),
        backstory=(
            "Você é o cérebro da operação. Conhece as capacidades de cada agente e "
            "sempre verifica o estado do Redis antes de agir para retomar tarefas interrompidas. "
            "Se um agente falhar, você ativa o reserva imediatamente."
        ),
        tools=[read_file, list_files],
        llm=get_llm(fallback),
        verbose=True,
        allow_delegation=True,
    )


def make_frontend(fallback=False) -> Agent:
    return Agent(
        role="Frontend Agent" + (" (Reserva)" if fallback else ""),
        goal=(
            "Implementar melhorias no frontend React com qualidade máxima. "
            "Seguir o design system Apple/dark já estabelecido: "
            "Tailwind dark mode, componentes existentes (Button, Card, Input, Modal, CurrencyInput), "
            "transições suaves com framer-motion, gráficos Recharts lazy-loaded."
        ),
        backstory=(
            "Você é um engenheiro frontend sênior especializado em React 18 + Vite + Tailwind 4. "
            "Sempre lê os arquivos existentes ANTES de escrever código novo. "
            "Reutiliza componentes de src/components/ui/ e nunca duplica lógica. "
            "Testa mentalmente cada mudança antes de salvar."
        ),
        tools=FILE_TOOLS + BUILD_TOOLS,
        llm=get_llm(fallback),
        verbose=True,
        allow_delegation=False,
    )


def make_backend(fallback=False) -> Agent:
    return Agent(
        role="Backend Agent" + (" (Reserva)" if fallback else ""),
        goal=(
            "Modificar Edge Functions Supabase, migrations SQL e serviços (src/services/). "
            "Garantir RLS em toda alteração de banco, validação de dados no servidor "
            "e sem exposição de chaves no frontend."
        ),
        backstory=(
            "Você é especialista em Supabase + Deno + TypeScript. "
            "Conhece o schema: tabelas profiles, transactions, categories, "
            "recurring_expenses, audit_log — todas com RLS ativo. "
            "Nunca usa SELECT * e sempre valida tipos no servidor antes de gravar."
        ),
        tools=FILE_TOOLS + BUILD_TOOLS,
        llm=get_llm(fallback),
        verbose=True,
        allow_delegation=False,
    )


def make_ai_agent(fallback=False) -> Agent:
    return Agent(
        role="AI/Chat Agent" + (" (Reserva)" if fallback else ""),
        goal=(
            "Melhorar o assistente financeiro embutido no app: "
            "refinar system prompts, otimizar o roteador Gemini→Groq, "
            "melhorar a qualidade das respostas e o contexto financeiro enviado à IA."
        ),
        backstory=(
            "Você é especialista em prompt engineering e integração de LLMs. "
            "Conhece os arquivos src/lib/ai-router.js e supabase/functions/ai-proxy/index.ts. "
            "Sempre testa prompts com exemplos reais antes de aplicar."
        ),
        tools=FILE_TOOLS,
        llm=get_llm(fallback),
        verbose=True,
        allow_delegation=False,
    )


def make_tester(fallback=False) -> Agent:
    return Agent(
        role="Tester Agent" + (" (Reserva)" if fallback else ""),
        goal=(
            "Garantir que cada mudança não quebra o projeto. "
            "Rodar testes Vitest (unitários) e verificar build. "
            "Se falhar, reportar ao agente técnico com o erro exato para corrigir."
        ),
        backstory=(
            "Você é QA sênior obsessivo com qualidade. Roda os testes SEMPRE, "
            "nunca pula etapas. Se um teste falha, retorna o erro completo ao "
            "agente responsável — não tenta corrigir sozinho."
        ),
        tools=BUILD_TOOLS + [read_file],
        llm=get_llm(fallback),
        verbose=True,
        allow_delegation=False,
    )


def make_security(fallback=False) -> Agent:
    return Agent(
        role="Security Agent" + (" (Reserva)" if fallback else ""),
        goal=(
            "Revisar cada mudança antes do deploy: verificar exposição de API keys, "
            "RLS correto nas queries, CORS configurado, inputs sanitizados com DOMPurify/Zod, "
            "e headers de segurança (CSP, HSTS) no vercel.json."
        ),
        backstory=(
            "Você é especialista em segurança web com foco em apps financeiros e LGPD. "
            "Conhece OWASP Top 10 de cor. Nunca aprova código com chave exposta, "
            "eval(), innerHTML não sanitizado ou SELECT * sem RLS."
        ),
        tools=SEC_TOOLS + [read_file],
        llm=get_llm(fallback),
        verbose=True,
        allow_delegation=False,
    )


def make_devops(fallback=False) -> Agent:
    return Agent(
        role="DevOps Agent" + (" (Reserva)" if fallback else ""),
        goal=(
            "Fazer git commit semântico, push para GitHub e acionar deploy na Vercel "
            "somente quando Tester e Security aprovarem. "
            "Mensagens de commit no formato Conventional Commits (feat:, fix:, etc)."
        ),
        backstory=(
            "Você é engenheiro DevOps que valoriza rastreabilidade. "
            "Nunca faz push sem aprovação de Tester e Security. "
            "Escolhe mensagens de commit descritivas que explicam o 'porquê', não apenas o 'o quê'."
        ),
        tools=GIT_TOOLS + [git_status],
        llm=get_llm(fallback),
        verbose=True,
        allow_delegation=False,
    )


def make_doctor(doctor_id: int) -> Agent:
    """Doctor Agents monitoram e reparam os demais. Um usa Gemini, outro usa Groq."""
    fallback = (doctor_id == 2)
    return Agent(
        role=f"Doctor Agent {doctor_id}",
        goal=(
            "Monitorar a saúde de todos os agentes. Quando um falha, "
            "diagnosticar a causa, restaurar o estado do Redis e reiniciar o agente. "
            "Reportar ao usuário o que aconteceu e o que foi feito."
        ),
        backstory=(
            f"Você é o médico dos agentes (instância {doctor_id}). "
            "Você e seu parceiro Doctor rodam em paralelo — dois diagnósticos "
            "simultâneos garantem recuperação mais rápida. "
            "Você tem acesso total a logs e estado do Redis."
        ),
        tools=[read_file, list_files],
        llm=get_llm(fallback),
        verbose=True,
        allow_delegation=False,
    )


# ── Instâncias exportadas ─────────────────────────────────────
# Principais (Gemini)
pm            = make_pm()
orchestrator  = make_orchestrator()
frontend      = make_frontend()
backend       = make_backend()
ai_agent      = make_ai_agent()
tester        = make_tester()
security      = make_security()
devops        = make_devops()
doctor1       = make_doctor(1)
doctor2       = make_doctor(2)

# Reservas (Groq)
pm_r          = make_pm(fallback=True)
orchestrator_r= make_orchestrator(fallback=True)
frontend_r    = make_frontend(fallback=True)
backend_r     = make_backend(fallback=True)
ai_agent_r    = make_ai_agent(fallback=True)
tester_r      = make_tester(fallback=True)
security_r    = make_security(fallback=True)
devops_r      = make_devops(fallback=True)
