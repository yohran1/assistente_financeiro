"""
Ferramentas que os agentes usam para interagir com o projeto real.
Cada tool lê/escreve arquivos no PROJECT_PATH e executa comandos git.
"""
import os
import subprocess
import urllib.request
import json
import tempfile
from pathlib import Path
from crewai.tools import tool
from config import PROJECT_PATH, GITHUB_TOKEN, GITHUB_REPO, VERCEL_DEPLOY_HOOK

# ── Ferramentas de arquivo ────────────────────────────────────

@tool("Ler arquivo do projeto")
def read_file(relative_path: str) -> str:
    """Lê o conteúdo de um arquivo do projeto React. Passe o caminho relativo (ex: src/App.jsx)."""
    full_path = PROJECT_PATH / relative_path
    if not full_path.exists():
        return f"ERRO: arquivo não encontrado: {relative_path}"
    try:
        return full_path.read_text(encoding='utf-8')
    except Exception as e:
        return f"ERRO ao ler {relative_path}: {e}"

@tool("Escrever arquivo no projeto")
def write_file(relative_path: str, content: str) -> str:
    """Escreve/sobrescreve um arquivo no projeto React. Cria diretórios intermediários se necessário."""
    full_path = PROJECT_PATH / relative_path
    try:
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding='utf-8')
        return f"✅ Arquivo salvo: {relative_path}"
    except Exception as e:
        return f"ERRO ao escrever {relative_path}: {e}"

@tool("Listar arquivos do projeto")
def list_files(directory: str = "src") -> str:
    """Lista arquivos de um diretório do projeto. Útil para entender a estrutura antes de editar."""
    full_path = PROJECT_PATH / directory
    if not full_path.exists():
        return f"Diretório não encontrado: {directory}"
    files = []
    for f in sorted(full_path.rglob('*')):
        if f.is_file() and 'node_modules' not in str(f) and '.git' not in str(f):
            files.append(str(f.relative_to(PROJECT_PATH)))
    return '\n'.join(files) if files else "Nenhum arquivo encontrado"

# ── Ferramentas de build/teste ────────────────────────────────

@tool("Executar testes Vitest")
def run_tests() -> str:
    """Roda os testes unitários com Vitest. Retorna resultado completo."""
    result = subprocess.run(
        ['npm', 'run', 'test', '--', '--reporter=verbose'],
        cwd=PROJECT_PATH, capture_output=True, text=True, timeout=120
    )
    output = result.stdout + result.stderr
    return f"{'✅ PASSOU' if result.returncode == 0 else '❌ FALHOU'}\n\n{output}"

@tool("Build de produção")
def run_build() -> str:
    """Roda npm run build. Retorna sucesso ou erros de compilação."""
    result = subprocess.run(
        ['npm', 'run', 'build'],
        cwd=PROJECT_PATH, capture_output=True, text=True, timeout=180
    )
    output = result.stdout + result.stderr
    return f"{'✅ BUILD OK' if result.returncode == 0 else '❌ BUILD FALHOU'}\n\n{output[-3000:]}"

@tool("Verificar lint")
def run_lint() -> str:
    """Roda ESLint no código. Retorna avisos e erros."""
    result = subprocess.run(
        ['npm', 'run', 'lint'],
        cwd=PROJECT_PATH, capture_output=True, text=True, timeout=60
    )
    return result.stdout + result.stderr

# ── Ferramentas Git ───────────────────────────────────────────

@tool("Git status")
def git_status() -> str:
    """Mostra o status atual do repositório git (arquivos modificados, novos, etc)."""
    result = subprocess.run(['git', 'status', '--short'], cwd=PROJECT_PATH, capture_output=True, text=True)
    return result.stdout or "Nada para commitar"

@tool("Git commit e push")
def git_commit_push(message: str) -> str:
    """Faz git add, commit e push para o GitHub. Use mensagem no formato convencional (feat:, fix:, etc)."""
    askpass_path = None
    try:
        subprocess.run(['git', 'add', '-A'], cwd=PROJECT_PATH, check=True, capture_output=True)
        result_commit = subprocess.run(
            ['git', 'commit', '-m', message],
            cwd=PROJECT_PATH, capture_output=True, text=True
        )
        if result_commit.returncode != 0:
            if 'nothing to commit' in result_commit.stdout:
                return "ℹ️ Nada para commitar"
            return f"❌ Erro no commit: {result_commit.stderr}"

        env = os.environ.copy()
        if GITHUB_TOKEN:
            # Autentica sem gravar o token no remote nem expor em argumento do processo.
            repo_url = f"https://github.com/{GITHUB_REPO}.git"
            subprocess.run(['git', 'remote', 'set-url', 'origin', repo_url],
                         cwd=PROJECT_PATH, capture_output=True)
            fd, askpass_path = tempfile.mkstemp(prefix='git-askpass-', suffix='.cmd', text=True)
            with os.fdopen(fd, 'w', encoding='utf-8') as askpass:
                askpass.write('@echo off\n')
                askpass.write('set "prompt=%~1"\n')
                askpass.write('echo %prompt% | findstr /I "Username" >nul\n')
                askpass.write('if %errorlevel%==0 (echo x-access-token) else (echo %GITHUB_TOKEN%)\n')
            env['GIT_ASKPASS'] = askpass_path
            env['GIT_TERMINAL_PROMPT'] = '0'

        result_push = subprocess.run(
            ['git', 'push', 'origin', 'main'],
            cwd=PROJECT_PATH, capture_output=True, text=True, env=env
        )
        if result_push.returncode == 0:
            return f"✅ Commit e push realizados: {message}"
        return f"✅ Commit ok, ❌ push falhou: {result_push.stderr}"
    except Exception as e:
        return f"❌ Erro: {e}"
    finally:
        if askpass_path:
            try:
                Path(askpass_path).unlink(missing_ok=True)
            except Exception:
                pass

@tool("Acionar deploy na Vercel")
def trigger_vercel_deploy() -> str:
    """Dispara um deploy na Vercel via deploy hook. Use após o push ser aprovado."""
    if not VERCEL_DEPLOY_HOOK:
        return "⚠️ VERCEL_DEPLOY_HOOK não configurado em agents/.env.agents"
    try:
        req = urllib.request.Request(VERCEL_DEPLOY_HOOK, method='POST', data=b'')
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            return f"✅ Deploy acionado! Job: {data.get('job', {}).get('id', 'ok')}"
    except Exception as e:
        return f"❌ Erro ao acionar deploy: {e}"

# ── Ferramenta de segurança ───────────────────────────────────

@tool("Verificar segurança do código")
def check_security(file_content: str) -> str:
    """
    Analisa um trecho de código em busca de problemas de segurança comuns:
    chaves expostas, eval(), innerHTML, localStorage com dados sensíveis, etc.
    Retorna lista de problemas encontrados ou 'OK' se nenhum for encontrado.
    """
    issues = []
    danger_patterns = [
        ('API_KEY', 'Possível API key hardcoded'),
        ('SECRET', 'Possível secret hardcoded'),
        ('PASSWORD', 'Possível senha hardcoded'),
        ('eval(', 'Uso de eval() — risco de XSS'),
        ('innerHTML', 'innerHTML sem sanitização — risco de XSS'),
        ('dangerouslySetInnerHTML', 'dangerouslySetInnerHTML detectado — verificar sanitização'),
        ('localStorage.setItem.*token', 'Token armazenado em localStorage — usar httpOnly cookie'),
        ('service_role', 'service_role key no frontend — mover para Edge Function'),
        ('SELECT *', 'SELECT * detectado — especificar colunas'),
    ]
    content_upper = file_content.upper()
    for pattern, desc in danger_patterns:
        if pattern.upper() in content_upper:
            # Ignora .env.example e comentários
            lines = [l for l in file_content.split('\n')
                    if pattern.upper() in l.upper()
                    and not l.strip().startswith('#')
                    and not l.strip().startswith('//')]
            if lines:
                issues.append(f"⚠️ {desc}")
    return '\n'.join(issues) if issues else '✅ Nenhum problema de segurança detectado'
