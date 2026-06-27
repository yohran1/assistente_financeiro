"""
Roteador de LLMs: Gemini (principal) → Groq (reserva).
Uma única chave de cada serve para todos os agentes.
"""
from crewai import LLM
from config import GEMINI_API_KEY, GROQ_API_KEY

def get_primary_llm() -> LLM:
    """LLM principal: Gemini 1.5 Flash via Google AI."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY não configurada em agents/.env.agents")
    return LLM(
        model="gemini/gemini-1.5-flash",
        api_key=GEMINI_API_KEY,
        temperature=0.2,   # Baixo para código — mais determinístico
        max_tokens=4096,
    )

def get_fallback_llm() -> LLM:
    """LLM reserva: Groq LLaMA3 — ultra rápido e gratuito."""
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY não configurada em agents/.env.agents")
    return LLM(
        model="groq/llama3-8b-8192",
        api_key=GROQ_API_KEY,
        temperature=0.2,
        max_tokens=4096,
    )

def get_llm(use_fallback: bool = False) -> LLM:
    """Retorna LLM principal ou reserva."""
    try:
        if use_fallback:
            return get_fallback_llm()
        return get_primary_llm()
    except ValueError:
        # Se principal não configurado, tenta reserva
        return get_fallback_llm()
