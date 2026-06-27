"""
Gerenciamento de estado dos agentes via Upstash Redis.
Permite failover: reserva lê o estado e continua de onde parou.
"""
import json
import time
import urllib.request
import urllib.error
from config import UPSTASH_URL, UPSTASH_TOKEN

def _redis_request(method: str, path: str, body=None) -> dict:
    """Faz requisição REST ao Upstash Redis."""
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return {}  # Redis não configurado — modo sem persistência
    url = f'{UPSTASH_URL.rstrip("/")}{path}'
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url, data=data,
        headers={
            'Authorization': f'Bearer {UPSTASH_TOKEN}',
            'Content-Type': 'application/json',
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read())
    except Exception:
        return {}

def save_state(agent_id: str, state: dict) -> bool:
    """Salva snapshot do estado do agente no Redis (TTL: 1 hora)."""
    payload = json.dumps({'agent_id': agent_id, 'timestamp': time.time(), **state})
    result = _redis_request('POST', f'/set/agent:{agent_id}', [f'agent:{agent_id}', payload, 'EX', '3600'])
    return bool(result)

def load_state(agent_id: str) -> dict:
    """Carrega último estado salvo de um agente."""
    result = _redis_request('GET', f'/get/agent:{agent_id}')
    raw = result.get('result')
    if raw:
        try: return json.loads(raw)
        except Exception: pass
    return {}

def heartbeat(agent_id: str) -> bool:
    """Atualiza heartbeat do agente (TTL: 15s). Se expirar, Orchestrator detecta falha."""
    result = _redis_request('POST', f'/set/hb:{agent_id}', [f'hb:{agent_id}', '1', 'EX', '15'])
    return bool(result)

def is_alive(agent_id: str) -> bool:
    """Verifica se o agente está vivo pelo heartbeat."""
    result = _redis_request('GET', f'/get/hb:{agent_id}')
    return result.get('result') == '1'

def clear_state(agent_id: str):
    """Remove estado do Redis após conclusão bem-sucedida."""
    _redis_request('DELETE', f'/del/agent:{agent_id}')
