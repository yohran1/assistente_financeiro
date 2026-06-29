/** @param {number} year @param {number} month 1-12 @param {number} dayOfMonth */
export function dateForDay(year, month, dayOfMonth) {
  const lastDay = new Date(year, month, 0).getDate()
  return new Date(year, month - 1, Math.min(dayOfMonth, lastDay))
}

/** @param {Date} a @param {Date} b */
export function daysBetween(a, b) {
  const ms = 86400000
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ub - ua) / ms)
}

/** @param {number} closingDay @param {Date} [today] */
export function getLastClosingDate(closingDay, today = new Date()) {
  const y = today.getFullYear()
  const m = today.getMonth() + 1
  const thisMonthClosing = dateForDay(y, m, closingDay)
  if (today >= thisMonthClosing) return thisMonthClosing
  const prevM = m === 1 ? 12 : m - 1
  const prevY = m === 1 ? y - 1 : y
  return dateForDay(prevY, prevM, closingDay)
}

/** @param {number} closingDay @param {Date} [today] */
export function getNextClosingDate(closingDay, today = new Date()) {
  const last = getLastClosingDate(closingDay, today)
  let nextM = last.getMonth() + 2
  let nextY = last.getFullYear()
  if (nextM > 12) { nextM = 1; nextY++ }
  return dateForDay(nextY, nextM, closingDay)
}

/** @param {number} closingDay @param {number} dueDay @param {Date} closingDate */
export function getDueDateForClosing(closingDay, dueDay, closingDate) {
  let y = closingDate.getFullYear()
  let m = closingDate.getMonth() + 1
  if (dueDay <= closingDay) {
    m++
    if (m > 12) { m = 1; y++ }
  }
  return dateForDay(y, m, dueDay)
}

/**
 * @param {{ closingDay?: number|null, dueDay?: number|null, today?: Date }} opts
 * @returns {{ closing: object|null, due: object|null }}
 */
export function getCreditCardBillingStatus({ closingDay, dueDay, today = new Date() }) {
  if (!closingDay || !dueDay) return { closing: null, due: null }

  const lastClosing = getLastClosingDate(closingDay, today)
  const nextClosing = getNextClosingDate(closingDay, today)
  const cycleDays = Math.max(daysBetween(lastClosing, nextClosing), 1)
  const daysSinceClosing = daysBetween(lastClosing, today)
  const daysUntilClosing = daysBetween(today, nextClosing)

  const closingPct = Math.min(100, Math.max(0, (daysSinceClosing / cycleDays) * 100))

  let closingLabel
  if (daysUntilClosing === 0) closingLabel = 'Fatura fecha hoje'
  else if (daysUntilClosing === 1) closingLabel = 'Fatura fecha amanhã'
  else closingLabel = `Fecha fatura em ${daysUntilClosing} dias`

  const dueDate = getDueDateForClosing(closingDay, dueDay, lastClosing)
  const paymentWindow = Math.max(daysBetween(lastClosing, dueDate), 1)
  const daysUntilDue = daysBetween(today, dueDate)
  const daysIntoPayment = daysBetween(lastClosing, today)

  let duePct
  let dueLabel
  if (daysUntilDue < 0) {
    duePct = 100
    dueLabel = `Venceu há ${Math.abs(daysUntilDue)} dia${Math.abs(daysUntilDue) === 1 ? '' : 's'}`
  } else if (daysUntilDue === 0) {
    duePct = 100
    dueLabel = 'Vence hoje'
  } else if (daysUntilDue === 1) {
    duePct = Math.min(100, (daysIntoPayment / paymentWindow) * 100)
    dueLabel = 'Vence amanhã'
  } else {
    duePct = Math.min(100, Math.max(0, (daysIntoPayment / paymentWindow) * 100))
    dueLabel = `Prazo final em ${daysUntilDue} dias`
  }

  return {
    closing: { pct: closingPct, label: closingLabel },
    due: { pct: duePct, label: dueLabel, overdue: daysUntilDue < 0 },
  }
}

function paymentSourceOf(obj) {
  return obj?.payment_source ?? obj?.paymentSource ?? 'account'
}

function installmentsPaidOf(tx) {
  return parseInt(tx?.installments_paid ?? tx?.installmentsPaid ?? 0, 10) || 0
}

function installmentsTotalOf(tx) {
  return parseInt(tx?.installments_total ?? tx?.installmentsTotal ?? 0, 10) || 0
}

function isActiveInstallment(tx) {
  const total = installmentsTotalOf(tx)
  return total > 0 && installmentsPaidOf(tx) < total
}

/** @param {string} dateStr @param {Date} start inclusive @param {Date} end exclusive */
export function isDateInBillingRange(dateStr, start, end) {
  if (!dateStr) return false
  const d = new Date(`${dateStr}T12:00:00`)
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  return d >= s && d < e
}

/** Período da fatura em aberto (último fechamento → próximo fechamento). */
export function getCurrentBillingCycleRange(closingDay, today = new Date()) {
  return {
    start: getLastClosingDate(closingDay, today),
    end: getNextClosingDate(closingDay, today),
  }
}

/** Parcelas ativas no cartão que entram na fatura sendo paga. */
export function getInstallmentsDueOnInvoice(activeInstallments = []) {
  return activeInstallments.filter((tx) => {
    const pt = tx?.purchase_type ?? tx?.purchaseType
    if (pt !== 'installment') return false
    if (paymentSourceOf(tx) !== 'credit_card') return false
    return isActiveInstallment(tx)
  })
}

/**
 * Plano de pagamento da fatura atual (função pura — testável).
 * @returns {{ ok: true, amount: number, newAccountBalance: number, newCreditCardBalance: number, installmentUpdates: Array<{id: string, installments_paid: number}> } | { ok: false, error: string, amount?: number, accountBalance?: number }}
 */
export function payCreditCardInvoicePlan({
  accountBalance,
  creditCardBalance,
  activeInstallments = [],
}) {
  const amount = Number(creditCardBalance) || 0
  if (amount <= 0) {
    return { ok: false, error: 'A fatura atual já está zerada.' }
  }

  const account = Number(accountBalance) || 0
  if (account < amount) {
    return {
      ok: false,
      error: 'Saldo insuficiente na conta para pagar a fatura.',
      amount,
      accountBalance: account,
    }
  }

  const installmentUpdates = getInstallmentsDueOnInvoice(activeInstallments).map((tx) => ({
    id: tx.id,
    installments_paid: installmentsPaidOf(tx) + 1,
  }))

  return {
    ok: true,
    amount,
    newAccountBalance: account - amount,
    newCreditCardBalance: 0,
    installmentUpdates,
  }
}

/**
 * Previsão da próxima fatura (após pagamento ou ciclo em aberto).
 * Inclui assinaturas no cartão, parcelas mensais e compras à vista no ciclo atual.
 */
export function computeProjectedCreditCardInvoice({
  transactions = [],
  activeInstallments = [],
  recurringExpenses = [],
  closingDay,
  today = new Date(),
  baseBalance = 0,
}) {
  const items = []
  let total = Number(baseBalance) || 0

  for (const r of recurringExpenses) {
    if (r.active === false) continue
    if (paymentSourceOf(r) !== 'credit_card') continue
    const amount = Number(r.amount) || 0
    items.push({
      id: r.id,
      description: r.description,
      amount,
      kind: 'subscription',
      label: 'Assinatura no cartão',
    })
    total += amount
  }

  for (const tx of activeInstallments) {
    if (!isActiveInstallment(tx)) continue
    if (paymentSourceOf(tx) !== 'credit_card') continue
    const installmentAmount = Number(tx.installment_amount ?? tx.installmentAmount) || Number(tx.amount) || 0
    const paid = installmentsPaidOf(tx)
    const instTotal = installmentsTotalOf(tx)
    items.push({
      id: tx.id,
      description: tx.description,
      store: tx.store,
      amount: installmentAmount,
      kind: 'installment',
      label: `Parcela ${paid + 1}/${instTotal}`,
    })
    total += installmentAmount
  }

  if (closingDay) {
    const { start, end } = getCurrentBillingCycleRange(closingDay, today)
    const seen = new Set()
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue
      const pt = tx.purchase_type ?? tx.purchaseType ?? 'one_off'
      if (pt !== 'one_off') continue
      if (paymentSourceOf(tx) !== 'credit_card') continue
      if (!isDateInBillingRange(tx.date, start, end)) continue
      if (seen.has(tx.id)) continue
      seen.add(tx.id)
      const amount = Number(tx.amount) || 0
      items.push({
        id: tx.id,
        description: tx.description,
        store: tx.store,
        amount,
        kind: 'one_off_card',
        label: 'Cartão à vista',
      })
      total += amount
    }
  }

  return { items, total }
}
