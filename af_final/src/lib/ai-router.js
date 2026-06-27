/**
 * Roteador de IA — chama a Edge Function do Supabase que faz proxy seguro
 * A Edge Function decide internamente entre Gemini e Groq com fallback automático
 * As API keys NUNCA chegam ao frontend
 */

import { supabase } from './supabase'

const AI_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`

/**
 * Envia mensagem para o assistente financeiro via Edge Function segura
 * @param {Array} messages - Histórico de mensagens [{role, content}]
 * @param {Object} financialContext - Contexto financeiro do usuário
 * @returns {Promise<string>} Resposta da IA
 */
export async function sendToAI(messages, financialContext = {}) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('Usuário não autenticado')
  }

  // Rate limiting no cliente: máx 1 req/s
  const now = Date.now()
  if (sendToAI._lastCall && now - sendToAI._lastCall < 1000) {
    throw new Error('Aguarde um momento antes de enviar outra mensagem')
  }
  sendToAI._lastCall = now

  const response = await fetch(AI_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      messages,
      context: financialContext,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Erro ${response.status} ao contatar IA`)
  }

  const data = await response.json()
  return data.content || data.message || 'Sem resposta da IA'
}

/**
 * Formata o contexto financeiro para enviar à IA
 */
export function buildFinancialContext(userData) {
  return {
    accountBalance: userData?.accountBalance ?? 0,
    creditCardBalance: userData?.creditCardBalance ?? 0,
    totalExpenses: userData?.totalExpenses ?? 0,
    totalIncome: userData?.totalIncome ?? 0,
    categories: userData?.categories ?? [],
    recentTransactions: (userData?.recentTransactions ?? []).slice(0, 10),
  }
}
