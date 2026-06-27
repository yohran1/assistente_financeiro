"""
Orquestrador principal: monta a Crew com os agentes certos
e gerencia failover automático via Redis heartbeat.
"""
import time
import threading
from crewai import Crew, Process
from rich.console import Console
from rich.panel import Panel
import agents as ag
import tasks as tk
from state import save_state, load_state, heartbeat, is_alive, clear_state

console = Console()

# ── Heartbeat em background ───────────────────────────────────
def _heartbeat_loop(agent_id: str, stop_event: threading.Event):
    """Envia heartbeat a cada 10s enquanto o agente está rodando."""
    while not stop_event.is_set():
        heartbeat(agent_id)
        time.sleep(10)

def _start_heartbeat(agent_id: str) -> threading.Event:
    stop = threading.Event()
    t = threading.Thread(target=_heartbeat_loop, args=(agent_id, stop), daemon=True)
    t.start()
    return stop

# ── Seletor de agente com failover ───────────────────────────
AGENT_PAIRS = {
    'pm':           (ag.pm,           ag.pm_r),
    'orchestrator': (ag.orchestrator,  ag.orchestrator_r),
    'frontend':     (ag.frontend,      ag.frontend_r),
    'backend':      (ag.backend,       ag.backend_r),
    'ai_agent':     (ag.ai_agent,      ag.ai_agent_r),
    'tester':       (ag.tester,        ag.tester_r),
    'security':     (ag.security,      ag.security_r),
    'devops':       (ag.devops,        ag.devops_r),
}

def get_agent(name: str, force_fallback: bool = False):
    """Retorna agente principal ou reserva conforme disponibilidade."""
    principal, reserva = AGENT_PAIRS[name]
    if force_fallback:
        console.print(f"[yellow]⚡ Usando agente reserva: {name}_r[/yellow]")
        return reserva
    return principal

# ── Crew principal ────────────────────────────────────────────
def run_demand(demand: str, agent_type: str = 'auto') -> str:
    """
    Executa uma demanda completa do usuário.

    Fluxo: PM → Agente técnico → Tester → Security → DevOps

    Args:
        demand: Texto da demanda do usuário
        agent_type: 'frontend', 'backend', 'ai', ou 'auto' para o PM decidir

    Returns:
        Resultado final do fluxo completo
    """
    console.print(Panel(f"[bold blue]🚀 Nova demanda recebida[/bold blue]\n{demand}"))

    # Salva estado inicial
    save_state('orchestrator', {'demand': demand, 'status': 'iniciando', 'step': 'pm'})

    # Etapa 1: PM clarifica e planeja
    console.print("\n[bold]📋 Etapa 1/5: Product Manager[/bold]")
    pm_task    = tk.make_pm_task(demand)
    pm_crew    = Crew(agents=[get_agent('pm')], tasks=[pm_task], process=Process.sequential, verbose=True)
    stop_hb    = _start_heartbeat('pm')
    pm_result  = pm_crew.kickoff()
    stop_hb.set()

    plan = str(pm_result)
    save_state('orchestrator', {'demand': demand, 'status': 'pm_concluido', 'plan': plan, 'step': 'technical'})

    # Etapa 2: Agente técnico executa
    console.print("\n[bold]⚙️ Etapa 2/5: Agente técnico[/bold]")
    if agent_type == 'backend':
        tech_task = tk.make_backend_task(plan)
        tech_crew = Crew(agents=[get_agent('backend')], tasks=[tech_task], process=Process.sequential, verbose=True)
    elif agent_type == 'ai':
        tech_task = tk.make_frontend_task(plan)  # AI agent usa as mesmas tools do frontend
        tech_crew = Crew(agents=[get_agent('ai_agent')], tasks=[tech_task], process=Process.sequential, verbose=True)
    else:
        tech_task = tk.make_frontend_task(plan)
        tech_crew = Crew(agents=[get_agent('frontend')], tasks=[tech_task], process=Process.sequential, verbose=True)

    stop_hb   = _start_heartbeat('technical')
    tech_result = tech_crew.kickoff()
    stop_hb.set()

    changes = str(tech_result)
    save_state('orchestrator', {'demand': demand, 'status': 'tech_concluido', 'changes': changes, 'step': 'tester'})

    # Etapa 3: Tester valida
    console.print("\n[bold]🧪 Etapa 3/5: Tester[/bold]")
    test_task  = tk.make_tester_task(changes)
    test_crew  = Crew(agents=[get_agent('tester')], tasks=[test_task], process=Process.sequential, verbose=True)
    stop_hb    = _start_heartbeat('tester')
    test_result = test_crew.kickoff()
    stop_hb.set()

    test_output = str(test_result)
    if 'REPROVADO' in test_output or 'FALHOU' in test_output:
        console.print("[red]❌ Testes reprovados. Retornando ao agente técnico...[/red]")
        console.print(test_output)
        return f"❌ Deploy bloqueado — testes falharam:\n{test_output}"

    save_state('orchestrator', {'demand': demand, 'status': 'testes_ok', 'step': 'security'})

    # Etapa 4: Security revisa
    console.print("\n[bold]🔒 Etapa 4/5: Security[/bold]")
    sec_task   = tk.make_security_task(changes)
    sec_crew   = Crew(agents=[get_agent('security')], tasks=[sec_task], process=Process.sequential, verbose=True)
    stop_hb    = _start_heartbeat('security')
    sec_result = sec_crew.kickoff()
    stop_hb.set()

    sec_output = str(sec_result)
    if 'BLOQUEADO' in sec_output:
        console.print("[red]🚫 Deploy bloqueado por Security.[/red]")
        return f"🚫 Deploy bloqueado — problema de segurança:\n{sec_output}"

    save_state('orchestrator', {'demand': demand, 'status': 'security_ok', 'step': 'devops'})

    # Etapa 5: DevOps faz deploy
    console.print("\n[bold]🚀 Etapa 5/5: DevOps — commit e deploy[/bold]")
    devops_task  = tk.make_devops_task(f"Demanda: {demand}\nMudanças: {changes}")
    devops_crew  = Crew(agents=[get_agent('devops')], tasks=[devops_task], process=Process.sequential, verbose=True)
    stop_hb      = _start_heartbeat('devops')
    devops_result = devops_crew.kickoff()
    stop_hb.set()

    # Limpa estado — fluxo concluído com sucesso
    clear_state('orchestrator')

    final = str(devops_result)
    console.print(Panel(f"[bold green]✅ Fluxo completo![/bold green]\n{final}"))
    return final
