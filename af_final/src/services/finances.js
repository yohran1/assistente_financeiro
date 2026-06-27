import { supabase } from '../lib/supabase'
import DOMPurify from 'dompurify'

async function getCurrentUserId() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!session?.user?.id) throw new Error('Usuário não autenticado')
  return session.user.id
}

function parseNumeric(value) {
  if (value === undefined || value === null || value === '') return 0
  return typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.')) || 0
}

// ── Saldo e Cartão ──────────────────────────────────────────────────────────

export async function getProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, account_balance, credit_card_balance, credit_card_limit, updated_at')
    .single()
  if (error) throw error

  return {
    ...data,
    account_balance: parseNumeric(data?.account_balance),
    credit_card_balance: parseNumeric(data?.credit_card_balance),
    credit_card_limit: parseNumeric(data?.credit_card_limit),
  }
}

export async function updateAccountBalance(value) {
  const amount = parseFloat(value)
  if (isNaN(amount) || amount < -999999999 || amount > 999999999) {
    throw new Error('Valor inválido')
  }
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('profiles')
    .update({ account_balance: amount, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCreditCard({ balance, limit }) {
  const updates = {}
  if (balance !== undefined) {
    const v = parseFloat(balance)
    if (isNaN(v)) throw new Error('Valor inválido')
    updates.credit_card_balance = v
  }
  if (limit !== undefined) {
    const v = parseFloat(limit)
    if (isNaN(v)) throw new Error('Limite inválido')
    updates.credit_card_limit = v
  }
  updates.updated_at = new Date().toISOString()

  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Transações ───────────────────────────────────────────────────────────────

export async function getTransactions({ limit = 50, offset = 0, month, year } = {}) {
  let query = supabase
    .from('transactions')
    .select('id, description, amount, type, category_id, date, created_at, categories(name, color, icon)')
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (month && year) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    query = query.gte('date', start).lte('date', end)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function addTransaction({ description, amount, type, categoryId, date }) {
  const cleanDesc = DOMPurify.sanitize(description.trim())
  const amt = parseFloat(amount)

  if (!cleanDesc) throw new Error('Descrição obrigatória')
  if (isNaN(amt) || amt <= 0) throw new Error('Valor deve ser positivo')
  if (!['income', 'expense', 'investment', 'saving'].includes(type)) throw new Error('Tipo inválido')

  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      description: cleanDesc,
      amount: amt,
      type,
      category_id: categoryId || null,
      date: date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTransaction(id, updates) {
  const clean = {}
  if (updates.description) clean.description = DOMPurify.sanitize(updates.description.trim())
  if (updates.amount !== undefined) {
    const amt = parseFloat(updates.amount)
    if (isNaN(amt) || amt <= 0) throw new Error('Valor inválido')
    clean.amount = amt
  }
  if (updates.type) clean.type = updates.type
  if (updates.categoryId !== undefined) clean.category_id = updates.categoryId
  if (updates.date) clean.date = updates.date
  clean.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('transactions')
    .update(clean)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

// ── Gastos Recorrentes ───────────────────────────────────────────────────────

export async function getRecurringExpenses() {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*, categories(name, color, icon)')
    .order('day_of_month')
  if (error) throw error
  return data
}

export async function addRecurringExpense({ description, amount, categoryId, dayOfMonth }) {
  const cleanDesc = DOMPurify.sanitize(description.trim())
  const amt = parseFloat(amount)
  const day = parseInt(dayOfMonth)

  if (!cleanDesc) throw new Error('Descrição obrigatória')
  if (isNaN(amt) || amt <= 0) throw new Error('Valor deve ser positivo')
  if (isNaN(day) || day < 1 || day > 31) throw new Error('Dia inválido (1-31)')

  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({
      user_id: userId,
      description: cleanDesc,
      amount: amt,
      category_id: categoryId || null,
      day_of_month: day,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRecurringExpense(id) {
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
  if (error) throw error
}

// ── Categorias ───────────────────────────────────────────────────────────────

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function addCategory({ name, color, icon }) {
  const cleanName = DOMPurify.sanitize(name.trim())
  if (!cleanName) throw new Error('Nome obrigatório')

  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: cleanName,
      color: color || '#3d6fff',
      icon: icon || 'tag',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Resumo financeiro ────────────────────────────────────────────────────────

export async function getFinancialSummary(month, year) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = new Date(year, month, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type, category_id, categories(name, color)')
    .gte('date', start)
    .lte('date', end)

  if (error) throw error

  const summary = {
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    totalSavings: 0,
    byCategory: {},
  }

  for (const t of data || []) {
    const amount = parseNumeric(t.amount)

    if (t.type === 'income') summary.totalIncome += amount
    else if (t.type === 'expense') summary.totalExpenses += amount
    else if (t.type === 'investment') summary.totalInvestments += amount
    else if (t.type === 'saving') summary.totalSavings += amount

    if (t.type === 'expense' && t.category_id) {
      const catName = t.categories?.name || 'Outros'
      const catColor = t.categories?.color || '#888'
      if (!summary.byCategory[catName]) {
        summary.byCategory[catName] = { total: 0, color: catColor }
      }
      summary.byCategory[catName].total += amount
    }
  }

  return summary
}
