#!/usr/bin/env python3
"""
Ponto de entrada dos agentes do Assistente Financeiro.
Execute: python agents/main.py
"""
import sys
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt, Confirm

import config
from crew import run_demand

console = Console()

BANNER = """
╔═══════════════════════════════════════════════╗
║   🤖 Assistente Financeiro — Agentes IA       ║
║   8 agentes · failover automático · CrewAI    ║
╚═══════════════════════════════════════════════╝
"""

EXAMPLES = [
    "Adicionar um gráfico de linha no dashboard mostrando evolução do saldo nos últimos 6 meses",
    "Corrigir o layout mobile da página de Gastos — botões estão cortados em telas pequenas",
    "Melhorar o prompt do assistente de IA para dar conselhos mais específicos sobre economia",
    "Adicionar campo de 'Investimentos' separado de 'Poupança' no dashboard",
    "Criar botão de exportação CSV diretamente na página de Gastos",
]

def main():
    console.print(BANNER, style="bold blue")

    # Valida configuração
    if not config.validate():
        sys.exit(1)

    console.print("[green]✅ Configuração OK[/green]")
    console.print(f"[dim]Projeto: {config.PROJECT_PATH}[/dim]")
    console.print(f"[dim]Redis: {'✅ configurado' if config.UPSTASH_URL else '⚠️  não configurado (sem failover)'}[/dim]\n")

    # Mostra exemplos
    console.print("[bold]Exemplos de demandas:[/bold]")
    for i, ex in enumerate(EXAMPLES, 1):
        console.print(f"  {i}. {ex}", style="dim")

    console.print()

    while True:
        console.print("[bold cyan]O que você quer que os agentes façam?[/bold cyan]")
        console.print("[dim](Digite 'sair' para encerrar, ou um número para usar um exemplo)[/dim]")

        demand = Prompt.ask("\n🎯 Demanda").strip()

        if demand.lower() in ('sair', 'exit', 'quit', 'q'):
            console.print("\n👋 Até logo!")
            break

        # Atalho para exemplos
        if demand.isdigit() and 1 <= int(demand) <= len(EXAMPLES):
            demand = EXAMPLES[int(demand) - 1]
            console.print(f"\n[dim]Usando exemplo: {demand}[/dim]")

        if not demand:
            continue

        # Pergunta o tipo de agente
        console.print("\n[bold]Qual área da demanda?[/bold]")
        console.print("  1. Frontend (UI, componentes, páginas)")
        console.print("  2. Backend (banco, Edge Functions, serviços)")
        console.print("  3. IA/Chat (assistente, prompts, roteador)")
        console.print("  4. Auto (PM Agent decide)")

        agent_choice = Prompt.ask("Tipo", choices=['1','2','3','4'], default='4')
        agent_map    = {'1': 'frontend', '2': 'backend', '3': 'ai', '4': 'auto'}
        agent_type   = agent_map[agent_choice]

        # Confirmação
        console.print(Panel(
            f"[bold]Demanda:[/bold] {demand}\n[bold]Tipo:[/bold] {agent_type}",
            title="Confirmar"
        ))

        if not Confirm.ask("Executar?", default=True):
            continue

        try:
            result = run_demand(demand, agent_type)
            console.print(f"\n[bold green]Resultado final:[/bold green]\n{result}")
        except KeyboardInterrupt:
            console.print("\n\n[yellow]⚠️ Interrompido pelo usuário[/yellow]")
        except Exception as e:
            console.print(f"\n[red]❌ Erro inesperado: {e}[/red]")
            import traceback
            traceback.print_exc()

        console.print("\n" + "─" * 50 + "\n")

if __name__ == '__main__':
    main()
