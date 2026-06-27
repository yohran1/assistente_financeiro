"""
Fábrica de tarefas para cada tipo de demanda.
As tarefas são criadas dinamicamente com o contexto da demanda atual.
"""
from crewai import Task
import agents as ag

def make_pm_task(demand: str) -> Task:
    return Task(
        description=f"""
        Demanda recebida do usuário:
        "{demand}"

        Sua missão:
        1. Analise se a demanda está clara e completa
        2. Se estiver ambígua, faça UMA pergunta objetiva ao usuário (human_input)
        3. Quando tiver clareza, decomponha em subtarefas técnicas numeradas
        4. Identifique qual(is) agente(s) devem executar: Frontend, Backend, AI/Chat
        5. Descreva o resultado esperado com critérios de aceite claros

        Formato de saída:
        DEMANDA CLARIFICADA: [versão final da demanda]
        AGENTE(S): [Frontend/Backend/AI]
        SUBTAREFAS:
        1. ...
        2. ...
        CRITÉRIOS DE ACEITE:
        - ...
        """,
        expected_output="Plano técnico detalhado com subtarefas e critérios de aceite",
        agent=ag.pm,
        human_input=True,
    )

def make_frontend_task(plan: str) -> Task:
    return Task(
        description=f"""
        Execute o plano técnico abaixo, modificando os arquivos React necessários.

        PLANO:
        {plan}

        REGRAS OBRIGATÓRIAS:
        - Leia SEMPRE os arquivos existentes antes de modificar (use read_file)
        - Siga o design system: dark mode, Tailwind, componentes em src/components/ui/
        - Lazy loading para componentes pesados (charts)
        - Nunca hardcode cores — use classes Tailwind ou variáveis CSS
        - Após escrever, verifique com run_lint se não há erros
        - Ao finalizar, relate EXATAMENTE quais arquivos foram modificados e o que mudou
        """,
        expected_output="Lista de arquivos modificados e descrição das mudanças implementadas",
        agent=ag.frontend,
        context=[],
    )

def make_backend_task(plan: str) -> Task:
    return Task(
        description=f"""
        Execute as modificações de backend necessárias.

        PLANO:
        {plan}

        REGRAS OBRIGATÓRIAS:
        - RLS em qualquer nova tabela ou coluna
        - Validação de tipos no servidor (nunca confie no frontend)
        - Nunca use SELECT * — especifique colunas
        - Nunca exponha service_role key no código frontend
        - Documente cada SQL com comentários explicativos
        """,
        expected_output="Lista de arquivos/migrations modificados com descrição das mudanças",
        agent=ag.backend,
        context=[],
    )

def make_tester_task(changes_description: str) -> Task:
    return Task(
        description=f"""
        Execute os testes para validar as seguintes mudanças:
        {changes_description}

        PASSOS:
        1. Execute run_tests() e analise o resultado
        2. Execute run_build() para confirmar que compila
        3. Se QUALQUER teste falhar, reporte o erro COMPLETO
        4. Se tudo passar, confirme com "✅ APROVADO"

        NÃO tente corrigir falhas — reporte ao agente responsável.
        """,
        expected_output="Resultado completo dos testes: APROVADO ou REPROVADO com erros detalhados",
        agent=ag.tester,
        context=[],
    )

def make_security_task(changes_description: str) -> Task:
    return Task(
        description=f"""
        Revise as seguintes mudanças sob a ótica de segurança:
        {changes_description}

        CHECKLIST OBRIGATÓRIO:
        ☐ Nenhuma API key ou secret hardcoded no código
        ☐ Inputs sanitizados (DOMPurify para HTML, Zod para dados)
        ☐ Queries ao Supabase respeitam RLS
        ☐ CORS configurado apenas para origens autorizadas
        ☐ Nenhum dado sensível em localStorage ou sessionStorage
        ☐ Headers CSP e HSTS presentes no vercel.json
        ☐ Conformidade com LGPD (dados pessoais protegidos)

        Use check_security() em cada arquivo modificado.
        Se encontrar problema, descreva e BLOQUEIE o deploy.
        """,
        expected_output="Relatório de segurança: APROVADO ou BLOQUEADO com descrição dos problemas",
        agent=ag.security,
        context=[],
    )

def make_devops_task(summary: str) -> Task:
    return Task(
        description=f"""
        Faça o deploy das seguintes mudanças APROVADAS por Tester e Security:
        {summary}

        PASSOS:
        1. Verifique git_status() para confirmar arquivos modificados
        2. Crie mensagem de commit no formato Conventional Commits:
           feat: para novas features
           fix: para correções
           perf: para melhorias de performance
           security: para melhorias de segurança
        3. Execute git_commit_push(mensagem)
        4. Se push OK, acione trigger_vercel_deploy()
        5. Reporte ao usuário o commit hash e URL do deploy
        """,
        expected_output="Confirmação de commit, push e deploy acionado com detalhes",
        agent=ag.devops,
        context=[],
    )
