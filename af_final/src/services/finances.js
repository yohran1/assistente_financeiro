import { supabase } from '../lib/supabase'
import DOMPurify from 'dompurify'
import {
  balanceImpactForTransaction,
  balanceImpactForRecurring,
} from '../lib/balanceImpact'
import { payCreditCardInvoicePlan } from '../lib/creditCardBilling'
import { monthDateRange, isInstallmentDueInMonth } from '../lib/monthUtils'

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
  `${PROFILE_BASE_FIELDS}, credit_card_closing_day, credit_card_due_day, credit_card_invoice_paid_at, savings_balance, investment_balance`

function isMissingBillingColumnsError(error) {
  const msg = error?.message ?? ''
  return msg.includes('credit_card_closing_day') || msg.includes('credit_card_due_day')
}

function isMissingInvoicePaidAtError(error) {
  const msg = error?.message ?? ''
  return msg.includes('credit_card_invoice_paid_at')
}

function isMissingSavingsColumnsError(error) {
  const msg = error?.message ?? ''
  return msg.includes('savings_balance') || msg.includes('investment_balance')
}

function normalizeProfile(data) {
  return {
    ...data,
    account_balance: parseNumeric(data?.account_balance),
    credit_card_balance: parseNumeric(data?.credit_card_balance),
    credit_card_limit: parseNumeric(data?.credit_card_limit),
    savings_balance: parseNumeric(data?.savings_balance),
    investment_balance: parseNumeric(data?.investment_balance),
    credit_card_closing_day: data?.credit_card_closing_day ?? null,
    credit_card_due_day: data?.credit_card_due_day ?? null,
    credit_card_invoice_paid_at: data?.credit_card_invoice_paid_at ?? null,
  }
}

export async function getProfile() {
  let { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_EXTENDED_FIELDS)
    .single()

  if (error && (isMissingBillingColumnsError(error) || isMissingSavingsColumnsError(error))) {
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

/** Paga a fatura atual do cartão: debita conta, zera fatura e avança parcelas. */
export async function payCreditCardInvoice() {
  const profile = await getProfile()
  const activeInstallments = await getActiveInstallments()

  const plan = payCreditCardInvoicePlan({
    accountBalance: profile.account_balance,
    creditCardBalance: profile.credit_card_balance,
    activeInstallments,
  })
  if (!plan.ok) throw new Error(plan.error)

  const userId = await getCurrentUserId()
  const now = new Date().toISOString()
  const updates = {
    account_balance: plan.newAccountBalance,
    credit_card_balance: plan.newCreditCardBalance,
    credit_card_invoice_paid_at: now,
    updated_at: now,
  }

  let { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error && isMissingInvoicePaidAtError(error)) {
    delete updates.credit_card_invoice_paid_at
    ;({ data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single())
  }
  if (error) throw error

  for (const upd of plan.installmentUpdates) {
    const { error: txErr } = await supabase
      .from('transactions')
      .update({ installments_paid: upd.installments_paid, updated_at: now })
      .eq('id', upd.id)
    if (txErr) throw txErr
  }

  return {
    profile: normalizeProfile(data),
    amount: plan.amount,
    installmentUpdates: plan.installmentUpdates,
  }
}

// ── Transações ───────────────────────────────────────────────────────────────

const TX_BASE_FIELDS =
  'id, description, amount, type, category_id, date, created_at'
const TX_EXTENDED_FIELDS =
  `${TX_BASE_FIELDS}, store, purchase_type, payment_source, installments_total, installments_paid, installment_amount, in_progress`

function isMissingPurchaseColumnsError(error) {
  const msg = error?.message ?? ''
  return msg.includes('purchase_type') || msg.includes('installment_amount') || msg.includes('store')
}

function isMissingPaymentSourceError(error) {
  const msg = error?.message ?? ''
  return msg.includes('payment_source')
}

function normalizeTransaction(row) {
  if (!row) return row
  return {
    ...row,
    amount: parseNumeric(row.amount),
    installment_amount: row.installment_amount != null ? parseNumeric(row.installment_amount) : null,
    purchase_type: row.purchase_type ?? 'one_off',
    payment_source: row.payment_source ?? 'account',
    installments_paid: row.installments_paid ?? 0,
    in_progress: !!row.in_progress,
  }
}

async function applyBalanceImpacts({ account = 0, creditCard = 0, savings = 0, investment = 0 } = {}) {
  if (!account && !creditCard && !savings && !investment) return null
  const profile = await getProfile()
  const updates = { updated_at: new Date().toISOString() }
  if (account) updates.account_balance = parseNumeric(profile.account_balance) + account
  if (creditCard) updates.credit_card_balance = parseNumeric(profile.credit_card_balance) + creditCard
  if (savings) updates.savings_balance = parseNumeric(profile.savings_balance) + savings
  if (investment) updates.investment_balance = parseNumeric(profile.investment_balance) + investment

  const userId = await getCurrentUserId()
  let { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error && isMissingSavingsColumnsError(error) && (savings || investment)) {
    throw new Error(
      'Colunas de poupança/investimento indisponíveis. Aplique a migration 008 no banco de produção.',
    )
  }
  if (error && (isMissingBillingColumnsError(error) || isMissingSavingsColumnsError(error))) {
    delete updates.savings_balance
    delete updates.investment_balance
    delete updates.credit_card_closing_day
    delete updates.credit_card_due_day
    ;({ data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single())
  }
  if (error) throw error
  return normalizeProfile(data)
}

function diffBalanceImpact(before, after) {
  return {
    account: after.account - before.account,
    creditCard: after.creditCard - before.creditCard,
    savings: (after.savings ?? 0) - (before.savings ?? 0),
    investment: (after.investment ?? 0) - (before.investment ?? 0),
  }
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
    store, purchaseType, paymentSource, installmentsTotal, installmentsPaid,
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
  if (paymentSource) row.payment_source = paymentSource
  if (installmentsTotal != null) row.installments_total = parseInt(installmentsTotal, 10)
  if (installmentsPaid != null) row.installments_paid = parseInt(installmentsPaid, 10)
  if (installmentAmount != null) row.installment_amount = parseFloat(installmentAmount)
  if (inProgress != null) row.in_progress = !!inProgress

  return row
}

async function fetchInstallmentTransactions({ withCategories = false } = {}) {
  const fields = withCategories
    ? `${TX_EXTENDED_FIELDS}, categories(name, color, icon)`
    : TX_EXTENDED_FIELDS
  let { data, error } = await supabase
    .from('transactions')
    .select(fields)
    .eq('type', 'expense')
    .eq('purchase_type', 'installment')

  if (error && isMissingPurchaseColumnsError(error)) return []
  if (error) throw error
  return (data || []).map(normalizeTransaction)
}

async function queryTransactionsByDateRange({ start, end, purchaseType, withCategories = true, limit, offset }) {
  const fields = withCategories
    ? `${TX_EXTENDED_FIELDS}, categories(name, color, icon)`
    : `${TX_BASE_FIELDS}, categories(name, color, icon)`

  let query = supabase
    .from('transactions')
    .select(fields)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })

  if (purchaseType) query = query.eq('purchase_type', purchaseType)
  if (limit != null) query = query.range(offset ?? 0, (offset ?? 0) + limit - 1)

  let { data, error } = await query
  if (error && isMissingPurchaseColumnsError(error)) {
    let q2 = supabase
      .from('transactions')
      .select(`${TX_BASE_FIELDS}, categories(name, color, icon)`)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
    if (purchaseType) q2 = q2.eq('purchase_type', purchaseType)
    if (limit != null) q2 = q2.range(offset ?? 0, (offset ?? 0) + limit - 1)
    ;({ data, error } = await q2)
  }
  if (error) throw error
  return (data || []).map(normalizeTransaction)
}

function mergeMonthTransactions(ranged, installments, month, year) {
  const rangedIds = new Set(ranged.map(t => t.id))
  const extra = installments.filter(
    t => !rangedIds.has(t.id) && isInstallmentDueInMonth(t, month, year),
  )
  return [...ranged, ...extra].sort((a, b) => b.date.localeCompare(a.date))
}

export async function getTransactions({ limit = 50, offset = 0, month, year, purchaseType } = {}) {
  if (month && year) {
    const { start, end } = monthDateRange(month, year)
    const [ranged, installments] = await Promise.all([
      queryTransactionsByDateRange({ start, end, purchaseType, limit: null }),
      purchaseType && purchaseType !== 'installment'
        ? Promise.resolve([])
        : fetchInstallmentTransactions({ withCategories: true }),
    ])
    const merged = mergeMonthTransactions(ranged, installments, month, year)
    return merged.slice(offset, offset + limit)
  }

  let query = supabase
    .from('transactions')
    .select(`${TX_EXTENDED_FIELDS}, categories(name, color, icon)`)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (purchaseType) query = query.eq('purchase_type', purchaseType)

  let { data, error } = await query
  if (error && isMissingPurchaseColumnsError(error)) {
    let q2 = supabase
      .from('transactions')
      .select(`${TX_BASE_FIELDS}, categories(name, color, icon)`)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)
    if (purchaseType) q2 = q2.eq('purchase_type', purchaseType)
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
  const impact = balanceImpactForTransaction(tx)
  await applyBalanceImpacts(impact)
  return tx
}

/** Fluxo unificado de compra (à vista, cartão, parcelado, assinatura). */
export async function addPurchase(fields) {
  if (fields.isSubscription) {
    return addRecurringExpense({
      description: fields.description,
      amount: fields.amount,
      categoryId: fields.categoryId,
      dayOfMonth: fields.dayOfMonth,
      paymentSource: fields.paymentSource || 'account',
    })
  }
  return addTransaction({
    description: fields.description,
    amount: fields.amount,
    type: 'expense',
    categoryId: fields.categoryId,
    date: fields.date,
    store: fields.store,
    purchaseType: fields.purchaseType,
    paymentSource: fields.paymentSource,
    installmentsTotal: fields.installmentsTotal,
    installmentsPaid: fields.installmentsPaid,
    installmentAmount: fields.installmentAmount,
    inProgress: fields.inProgress,
  })
}

export async function getActiveInstallments() {
  let { data, error } = await supabase
    .from('transactions')
    .select(TX_EXTENDED_FIELDS)
    .eq('type', 'expense')
    .eq('purchase_type', 'installment')

  if (error && isMissingPurchaseColumnsError(error)) return []
  if (error) throw error

  return (data || [])
    .map(normalizeTransaction)
    .filter(tx => {
      const paid = tx.installments_paid ?? 0
      const total = tx.installments_total ?? 0
      return total > 0 && paid < total
    })
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
  if (updates.paymentSource) clean.payment_source = updates.paymentSource
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
  const delta = diffBalanceImpact(
    balanceImpactForTransaction(oldTx),
    balanceImpactForTransaction(newTx),
  )
  await applyBalanceImpacts(delta)
  return newTx
}

export async function deleteTransaction(id) {
  const oldTx = await fetchTransactionById(id)
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
  const impact = balanceImpactForTransaction(oldTx)
  await applyBalanceImpacts({
    account: -impact.account,
    creditCard: -impact.creditCard,
    savings: -(impact.savings ?? 0),
    investment: -(impact.investment ?? 0),
  })
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

export async function addRecurringExpense({ description, amount, categoryId, dayOfMonth, paymentSource = 'account' }) {
  const cleanDesc = DOMPurify.sanitize(description.trim())
  const amt = parseFloat(amount)
  const day = parseInt(dayOfMonth)

  if (!cleanDesc) throw new Error('Descrição obrigatória')
  if (isNaN(amt) || amt <= 0) throw new Error('Valor deve ser positivo')
  if (isNaN(day) || day < 1 || day > 31) throw new Error('Dia inválido (1-31)')
  if (!['account', 'credit_card'].includes(paymentSource)) throw new Error('Origem de pagamento inválida')

  const userId = await getCurrentUserId()
  const insertRow = {
    user_id: userId,
    description: cleanDesc,
    amount: amt,
    category_id: categoryId || null,
    day_of_month: day,
    payment_source: paymentSource,
  }

  let { data, error } = await supabase.from('recurring_expenses').insert(insertRow).select().single()
  if (error && isMissingPaymentSourceError(error)) {
    delete insertRow.payment_source
    ;({ data, error } = await supabase.from('recurring_expenses').insert(insertRow).select().single())
  }
  if (error) throw error

  const normalized = { ...data, payment_source: data.payment_source ?? paymentSource }
  await applyBalanceImpacts(balanceImpactForRecurring(normalized))
  return normalized
}

export async function deleteRecurringExpense(id) {
  const { data: existing, error: fetchErr } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchErr) throw fetchErr

  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
  if (error) throw error

  const impact = balanceImpactForRecurring(existing)
  await applyBalanceImpacts({ account: -impact.account, creditCard: -impact.creditCard })
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
  const { start, end } = monthDateRange(month, year)

  const [rangedResult, installments] = await Promise.all([
    supabase
      .from('transactions')
      .select(`${TX_EXTENDED_FIELDS}, categories(name, color)`)
      .gte('date', start)
      .lte('date', end),
    fetchInstallmentTransactions({ withCategories: true }),
  ])

  let { data, error } = rangedResult
  if (error && isMissingPurchaseColumnsError(error)) {
    const fallback = await supabase
      .from('transactions')
      .select(`${TX_BASE_FIELDS}, categories(name, color)`)
      .gte('date', start)
      .lte('date', end)
    if (fallback.error) throw fallback.error
    data = fallback.data
    error = null
  }
  if (error) throw error

  const ranged = (data || []).map(normalizeTransaction)
  const installmentRows = installments.map(tx => ({
    ...tx,
    categories: tx.categories ?? null,
  }))
  const rows = mergeMonthTransactions(ranged, installmentRows, month, year)
  return buildSummaryFromRows(rows)
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
        paymentSource: t.payment_source ?? 'account',
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

// ── Poupança, investimentos e receitas do mês ────────────────────────────────

export async function depositToSavings(amount, description = 'Depósito na poupança') {
  const amt = parseFloat(amount)
  if (isNaN(amt) || amt <= 0) throw new Error('Valor deve ser positivo')
  const profile = await getProfile()
  if (parseNumeric(profile.account_balance) < amt) {
    throw new Error('Saldo em conta insuficiente')
  }
  return addTransaction({
    description,
    amount: amt,
    type: 'saving',
    date: new Date().toISOString().split('T')[0],
  })
}

export async function withdrawFromSavings(amount, description = 'Resgate da poupança') {
  const amt = parseFloat(amount)
  if (isNaN(amt) || amt <= 0) throw new Error('Valor deve ser positivo')
  const profile = await getProfile()
  const savings = parseNumeric(profile.savings_balance)
  if (savings < amt) throw new Error('Saldo na poupança insuficiente')
  await applyBalanceImpacts({ account: amt, savings: -amt })
  return { amount: amt, description, savingsBalance: savings - amt }
}

export async function transferInvestmentToIncome(amount, description = 'Resgate de investimento') {
  const amt = parseFloat(amount)
  if (isNaN(amt) || amt <= 0) throw new Error('Valor deve ser positivo')
  const profile = await getProfile()
  const invested = parseNumeric(profile.investment_balance)
  if (invested < amt) throw new Error('Saldo em investimentos insuficiente')
  await applyBalanceImpacts({ investment: -amt })
  return addTransaction({
    description,
    amount: amt,
    type: 'income',
    date: new Date().toISOString().split('T')[0],
  }).catch(async (err) => {
    await applyBalanceImpacts({ investment: amt })
    throw err
  })
}

export async function deleteMonthIncome(month, year) {
  const { start, end } = monthDateRange(month, year)
  const { data, error } = await supabase
    .from('transactions')
    .select(TX_EXTENDED_FIELDS)
    .eq('type', 'income')
    .gte('date', start)
    .lte('date', end)
  if (error) throw error

  for (const tx of data || []) {
    await deleteTransaction(tx.id)
  }
  return (data || []).length
}
