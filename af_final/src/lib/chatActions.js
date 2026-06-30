/**
 * Parser e executor de ações do chat financeiro.
 */

/** Remove formatação markdown comum das respostas da IA. */
export function stripMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim()
}

/** Extrai bloco ACTION JSON da resposta da IA. */
export function parseAiAction(text) {
  if (!text) return { content: '', action: null }
  const match = text.match(/ACTION:\s*(\{[\s\S]*?\})/i)
  if (!match) return { content: stripMarkdown(text), action: null }
  try {
    const action = JSON.parse(match[1])
    const content = stripMarkdown(text.replace(match[0], '').trim())
    return { content, action }
  } catch {
    return { content: stripMarkdown(text), action: null }
  }
}

/** Detecta intenção simples no texto do usuário (fallback sem IA). */
export function parseUserIntent(text) {
  const lower = text.toLowerCase().trim()

  const expenseMatch = lower.match(
    /(?:adicion(?:ar|e|a)|registr(?:ar|e|a)|inser(?:ir|e|a)|lanç(?:ar|e|a)|anot(?:ar|e|a))\s+(?:um\s+)?(?:gasto|despesa|compra)(?:\s+de)?\s+(?:r\$\s*)?([\d.,]+)(?:\s+(?:reais?|no|na|em)\s+(.+))?/i,
  )
  if (expenseMatch) {
    const amount = parseFloat(expenseMatch[1].replace(/\./g, '').replace(',', '.'))
    const description = (expenseMatch[2] || 'Gasto via chat').trim()
    if (amount > 0) {
      return {
        type: 'add_expense',
        description: description.charAt(0).toUpperCase() + description.slice(1),
        amount,
        payment_source: 'account',
      }
    }
  }

  const incomeMatch = lower.match(
    /(?:adicion(?:ar|e|a)|registr(?:ar|e|a))\s+(?:uma\s+)?(?:receita|entrada)(?:\s+de)?\s+(?:r\$\s*)?([\d.,]+)(?:\s+(?:reais?|de|por)\s+(.+))?/i,
  )
  if (incomeMatch) {
    const amount = parseFloat(incomeMatch[1].replace(/\./g, '').replace(',', '.'))
    const description = (incomeMatch[2] || 'Receita via chat').trim()
    if (amount > 0) {
      return {
        type: 'add_income',
        description: description.charAt(0).toUpperCase() + description.slice(1),
        amount,
      }
    }
  }

  return null
}

/** Executa ação retornada pela IA ou detectada localmente. */
export async function executeChatAction(action, handlers) {
  if (!action?.type) return null

  const { addTransaction, addPurchase } = handlers
  const amount = parseFloat(action.amount)
  if (isNaN(amount) || amount <= 0) throw new Error('Valor inválido na ação')

  if (action.type === 'add_expense') {
    const tx = await addTransaction({
      description: action.description || 'Gasto via chat',
      amount,
      type: 'expense',
      purchaseType: action.purchase_type === 'credit_card' ? 'one_off' : 'one_off',
      paymentSource: action.payment_source || 'account',
      date: new Date().toISOString().split('T')[0],
    })
    return tx
  }

  if (action.type === 'add_income') {
    const tx = await addTransaction({
      description: action.description || 'Receita via chat',
      amount,
      type: 'income',
      date: new Date().toISOString().split('T')[0],
    })
    return tx
  }

  if (action.type === 'add_purchase') {
    const result = await addPurchase({
      description: action.description || 'Compra via chat',
      amount,
      purchaseType: action.purchase_type || 'one_off',
      paymentSource: action.payment_source || 'account',
      date: new Date().toISOString().split('T')[0],
    })
    return result
  }

  return null
}
