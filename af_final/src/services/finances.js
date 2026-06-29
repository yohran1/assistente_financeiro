import { supabase } from '../lib/supabase'
import DOMPurify from 'dompurify'
import { balanceDeltaForTransaction } from '../lib/balanceImpact'

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

const PROFILE_BASE_FIELDS =
  'id, name, account_balance, credit_card_balance, credit_card_limit, updated_at'
const PROFILE_EXTENDED_FIELDS =
  `${PROFILE_BASE_FIELDS}, credit_card_closing_day, credit_card_due_day`

function isMissingBillingColumnsError(error) {
  const msg = error?.message ?? ''
  return msg.includes('credit_card_closing_day') || msg.includes('credit_card_due_day')
}

function normalizeProfile(data) {
  return {
    ...data,
    account_balance: parseNumeric(data?.account_balance),
    credit_card_balance: parseNumeric(data?.credit_card_balance),
    credit_card_limit: parseNumeric(data?.credit_card_limit),
    credit_card_closing_day: data?.credit_card_closing_day ?? null,
    credit_card_due_day: data?.credit_card_due_day ?? null,
  }
}

export async function getProfile() {
  let { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_EXTENDED_FIELDS)
    .single()

  if (error && isMissingBillingColumnsError(error)) {
    ;({ data, error } = await supabase.from('profiles').select(PROFILE_BASE_FIELDS).single())
  }
  if (error) throw error

  return normalizeProfile(data)
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

function parseDayOfMonth(value, label) {
  if (value === undefined || value === null || value === '') return undefined
  const day = parseInt(value, 10)
  if (isNaN(day) || day < 1 || day > 31) throw new Error(`${label} inválido (1-31)`)
  return day
}

export async function updateCreditCard({ balance, limit, closingDay, dueDay }) {
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
  const closing = parseDayOfMonth(closingDay, 'Dia de fechamento')
  if (closing !== undefined) updates.credit_card_closing_day = closing
  const due = parseDayOfMonth(dueDay, 'Dia de vencimento')
  if (due !== undefined) updates.credit_card_due_day = due
  updates.updated_at = new Date().toISOString()

  const userId = await getCurrentUserId()
  let { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error && isMissingBillingColumnsError(error)) {
    delete updates.credit_card_closing_day
    delete updates.credit_card_due_day
    ;({ data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single())
    if (!error && (closing !== undefined || due !== undefined)) {
      throw new Error('Migration 002 pendente no Supabase — execute 002_credit_card_billing.sql para salvar fechamento/vencimento')
    }
  }
  if (error) throw error
  return normalizeProfile(data)
}

// ── Transações ───────────────────────────────────────────────────────────────

const TX_BASE_FIELDS =
  'id, description, amount, type, category_id, date, created_at'
const TX_EXTENDED_FIELDS =
  `${TX_BASE_FIELDS}, store, purchase_type, installments_total, installments_paid, installment_amount, in_progress`

function isMissingPurchaseColumnsError(error) {
  const msg = error?.message ?? ''
  return msg.includes('purchase_type') || msg.includes('installment_amount') || msg.includes('store')
}

function normalizeTransaction(row) {
  if (!row) return row
  return {
    ...row,
    amount: parseNumeric(row.amount),
    installment_amount: row.installment_amount != null ? parseNumeric(row.installment_amount) : null,
    purchase_type: row.purchase_type ?? 'one_off',
    installments_paid: row.installments_paid ?? 0,
    in_progress: !!row.in_progress,
  }
}

async function applyBalanceDelta(delta) {
  if (!delta || delta === 0) return null
  const profile = await getProfile()
  const next = parseNumeric(profile.account_balance) + delta
  return updateAccountBalance(next)
}

async function fetchTransactionById(id) {
  let { data, error } = await supabase.from('transactions').select(TX_EXTENDED_FIELDS).eq('id', id).single()
  if (error && isMissingPurchaseColumnsError(error)) {
    ;({ data, error } = await supabase.from('transactions').select(TX_BASE_FIELDS).eq('id', id).single())
  }
  if (error) throw error
  return normalizeTransaction(data)
}

function buildTransactionInsert(userId, fields) {
  const {
    description, amount, type, categoryId, date,
    store, purchaseType, installmentsTotal, installmentsPaid,
    installmentAmount, inProgress,
  } = fields

  const row = {
    user_id: userId,
    description: DOMPurify.sanitize(description.trim()),
    amount: parseFloat(amount),
    type,
    category_id: categoryId || null,
    date: date || new Date().toISOString().split('T')[0],
  }

  if (store) row.store = DOMPurify.sanitize(store.trim())
  if (purchaseType) row.purchase_type = purchaseType
  if (installmentsTotal != null) row.installments_total = parseInt(installmentsTotal, 10)
  if (installmentsPaid != null) row.installments_paid = parseInt(installmentsPaid, 10)
  if (installmentAmount != null) row.installment_amount = parseFloat(installmentAmount)
  if (inProgress != null) row.in_progress = !!inProgress

  return row
}

export async function getTransactions({ limit = 50, offset = 0, month, year, purchaseType } = {}) {
  let query = supabase
    .from('transactions')
    .select(`${TX_EXTENDED_FIELDS}, categories(name, color, icon)`)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (month && year) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    query = query.gte('date', start).lte('date', end)
  }
  if (purchaseType) query = query.eq('purchase_type', purchaseType)

  let { data, error } = await query
  if (error && isMissingPurchaseColumnsError(error)) {
    let q2 = supabase
      .from('transactions')
      .select(`${TX_BASE_FIELDS}, categories(name, color, icon)`)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)
    if (month && year) {
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]
      q2 = q2.gte('date', start).lte('date', end)
    }
    ;({ data, error } = await q2)
  }
  if (error) throw error
  return (data || []).map(normalizeTransaction)
}

export async function addTransaction(fields) {
  const amt = parseFloat(fields.amount)
  if (!fields.description?.trim()) throw new Error('Descrição obrigatória')
  if (isNaN(amt) || amt <= 0) throw new Error('Valor deve ser positivo')
  if (!['income', 'expense', 'investment', 'saving'].includes(fields.type)) throw new Error('Tipo inválido')

  const userId = await getCurrentUserId()
  const insertRow = buildTransactionInsert(userId, fields)

  let { data, error } = await supabase.from('transactions').insert(insertRow).select().single()
  if (error && isMissingPurchaseColumnsError(error)) {
    const basic = {
      user_id: userId,
      description: insertRow.description,
      amount: insertRow.amount,
      type: insertRow.type,
      category_id: insertRow.category_id,
      date: insertRow.date,
    }
    ;({ data, error } = await supabase.from('transactions').insert(basic).select().single())
  }
  if (error) throw error

  const tx = normalizeTransaction(data)
  await applyBalanceDelta(balanceDeltaForTransaction(tx))
  return tx
}

export async function updateTransaction(id, updates) {
  const oldTx = await fetchTransactionById(id)

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
  if (updates.store !== undefined) clean.store = updates.store ? DOMPurify.sanitize(updates.store.trim()) : null
  if (updates.purchaseType) clean.purchase_type = updates.purchaseType
  if (updates.installmentsTotal !== undefined) clean.installments_total = parseInt(updates.installmentsTotal, 10)
  if (updates.installmentsPaid !== undefined) clean.installments_paid = parseInt(updates.installmentsPaid, 10)
  if (updates.installmentAmount !== undefined) clean.installment_amount = parseFloat(updates.installmentAmount)
  if (updates.inProgress !== undefined) clean.in_progress = !!updates.inProgress
  clean.updated_at = new Date().toISOString()

  let { data, error } = await supabase.from('transactions').update(clean).eq('id', id).select().single()
  if (error && isMissingPurchaseColumnsError(error)) {
    const basic = { ...clean }
    delete basic.store
    delete basic.purchase_type
    delete basic.installments_total
    delete basic.installments_paid
    delete basic.installment_amount
    delete basic.in_progress
    ;({ data, error } = await supabase.from('transactions').update(basic).eq('id', id).select().single())
  }
  if (error) throw error

  const newTx = normalizeTransaction(data)
  const delta = balanceDeltaForTransaction(newTx) - balanceDeltaForTransaction(oldTx)
  await applyBalanceDelta(delta)
  return newTx
}

export async function deleteTransaction(id) {
  const oldTx = await fetchTransactionById(id)
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
  await applyBalanceDelta(-balanceDeltaForTransaction(oldTx))
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
    .select(`${TX_EXTENDED_FIELDS}, categories(name, color)`)
    .gte('date', start)
    .lte('date', end)

  if (error && isMissingPurchaseColumnsError(error)) {
    const fallback = await supabase
      .from('transactions')
      .select(`${TX_BASE_FIELDS}, categories(name, color)`)
      .gte('date', start)
      .lte('date', end)
    if (fallback.error) throw fallback.error
    return buildSummaryFromRows(fallback.data || [])
  }
  if (error) throw error
  return buildSummaryFromRows(data || [])
}

function expenseAmountForSummary(t) {
  if (t.type !== 'expense') return parseNumeric(t.amount)
  if (t.purchase_type === 'installment') {
    return parseNumeric(t.installment_amount) || parseNumeric(t.amount)
  }
  return parseNumeric(t.amount)
}

function buildSummaryFromRows(rows) {
  const summary = {
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    totalSavings: 0,
    byCategory: {},
    items: [],
  }

  for (const t of rows) {
    const amount = parseNumeric(t.amount)
    const expenseAmt = expenseAmountForSummary(t)

    if (t.type === 'income') summary.totalIncome += amount
    else if (t.type === 'expense') summary.totalExpenses += expenseAmt
    else if (t.type === 'investment') summary.totalInvestments += amount
    else if (t.type === 'saving') summary.totalSavings += amount

    if (t.type === 'expense') {
      summary.items.push({
        id: t.id,
        description: t.description,
        store: t.store,
        purchaseType: t.purchase_type ?? 'one_off',
        amount,
        installmentAmount: t.installment_amount,
        installmentsTotal: t.installments_total,
        installmentsPaid: t.installments_paid ?? 0,
        date: t.date,
      })
    }

    if (t.type === 'expense' && t.category_id) {
      const catName = t.categories?.name || 'Outros'
      const catColor = t.categories?.color || '#888'
      if (!summary.byCategory[catName]) {
        summary.byCategory[catName] = { total: 0, color: catColor }
      }
      summary.byCategory[catName].total += expenseAmt
    }
  }

  return summary
}

// ── Carteiras (Fase B) ───────────────────────────────────────────────────────

export async function getWallets() {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .order('created_at')
  if (error?.message?.includes('wallets')) return []
  if (error) throw error
  return (data || []).map(w => ({ ...w, balance: parseNumeric(w.balance) }))
}

export async function addWallet({ name, balance, includeInTotal }) {
  const cleanName = DOMPurify.sanitize(name.trim())
  if (!cleanName) throw new Error('Nome obrigatório')
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('wallets')
    .insert({
      user_id: userId,
      name: cleanName,
      balance: parseFloat(balance) || 0,
      include_in_total: includeInTotal !== false,
    })
    .select()
    .single()
  if (error) throw error
  return { ...data, balance: parseNumeric(data.balance) }
}

export async function updateWallet(id, { name, balance, includeInTotal }) {
  const updates = { updated_at: new Date().toISOString() }
  if (name !== undefined) updates.name = DOMPurify.sanitize(name.trim())
  if (balance !== undefined) updates.balance = parseFloat(balance) || 0
  if (includeInTotal !== undefined) updates.include_in_total = !!includeInTotal
  const { data, error } = await supabase.from('wallets').update(updates).eq('id', id).select().single()
  if (error) throw error
  return { ...data, balance: parseNumeric(data.balance) }
}

export async function deleteWallet(id) {
  const { error } = await supabase.from('wallets').delete().eq('id', id)
  if (error) throw error
}
