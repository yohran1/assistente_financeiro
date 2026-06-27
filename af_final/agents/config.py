"""
Configuração central dos agentes — carrega variáveis de ambiente
e valida que tudo necessário está presente antes de iniciar.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Carrega .env.agents da pasta agents/
_agents_dir = Path(__file__).parent
load_dotenv(_agents_dir / '.env.agents')

# ── Caminhos ──────────────────────────────────────────────────
PROJECT_PATH = Path(os.getenv('PROJECT_PATH', str(_agents_dir.parent)))

# ── IAs ───────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GROQ_API_KEY   = os.getenv('GROQ_API_KEY', '')

# ── Upstash Redis ─────────────────────────────────────────────
UPSTASH_URL   = os.getenv('UPSTASH_REDIS_REST_URL', '')
UPSTASH_TOKEN = os.getenv('UPSTASH_REDIS_REST_TOKEN', '')

# ── GitHub ────────────────────────────────────────────────────
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN', '')
GITHUB_REPO  = os.getenv('GITHUB_REPO', 'yohran1/assistente_financeiro')

# ── Vercel ────────────────────────────────────────────────────
VERCEL_DEPLOY_HOOK = os.getenv('VERCEL_DEPLOY_HOOK', '')

# ── Sentry ────────────────────────────────────────────────────
SENTRY_AUTH_TOKEN = os.getenv('SENTRY_AUTH_TOKEN', '')
SENTRY_ORG        = os.getenv('SENTRY_ORG', 'financas-assistente')
SENTRY_PROJECT    = os.getenv('SENTRY_PROJECT', 'assistente-financeiro')

def validate():
    """Valida que as credenciais mínimas estão configuradas."""
    errors = []
    if not GEMINI_API_KEY and not GROQ_API_KEY:
        errors.append('GEMINI_API_KEY ou GROQ_API_KEY obrigatório')
    if not PROJECT_PATH.exists():
        errors.append(f'PROJECT_PATH não existe: {PROJECT_PATH}')
    if errors:
        print('\n❌ ERROS DE CONFIGURAÇÃO:')
        for e in errors: print(f'  - {e}')
        print('\nEdite agents/.env.agents e tente novamente.\n')
        return False
    return True
