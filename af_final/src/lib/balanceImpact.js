function purchaseTypeOf(tx) {
  return tx?.purchase_type ?? tx?.purchaseType ?? 'one_off'
}

function paymentSourceOf(tx) {
  return tx?.payment_source ?? tx?.paymentSource ?? 'account'
}

function installmentsTotalOf(tx) {
  return tx?.installments_total ?? tx?.installmentsTotal
}

function installmentsPaidOf(tx) {
  return tx?.installments_paid ?? tx?.installmentsPaid ?? 0
}

/** Impacto de uma transação em conta e cartão (+ entra, − sai / fatura). */
export function balanceImpactForTransaction(tx) {
  if (!tx) return { account: 0, creditCard: 0 }

  const type = tx.type
  const amount = Number(tx.amount) || 0
  const installmentAmount = Number(tx.installment_amount ?? tx.installmentAmount) || amount
  const purchaseType = purchaseTypeOf(tx)
  const paymentSource = paymentSourceOf(tx)

  if (type === 'income') return { account: amount, creditCard: 0 }

  if (type === 'expense') {
    if (purchaseType === 'installment') {
      // Parcelado no cartão: só a parcela atual entra na fatura; conta não muda na compra.
      const creditCardDelta = paymentSource === 'credit_card' ? installmentAmount : 0
      return { account: 0, creditCard: creditCardDelta }
    }
    if (paymentSource === 'credit_card') {
      return { account: 0, creditCard: amount }
    }
    return { account: -amount, creditCard: 0 }
  }

  if (type === 'investment' || type === 'saving') {
    return { account: -amount, creditCard: 0 }
  }

  return { account: 0, creditCard: 0 }
}

/** Compat: delta só em conta (legado). */
export function balanceDeltaForTransaction(tx) {
  return balanceImpactForTransaction(tx).account
}

export function creditCardDeltaForTransaction(tx) {
  return balanceImpactForTransaction(tx).creditCard
}

export function balanceImpactForRecurring(exp) {
  if (!exp) return { account: 0, creditCard: 0 }
  const amount = Number(exp.amount) || 0
  if (paymentSourceOf(exp) === 'credit_card') {
    return { account: 0, creditCard: amount }
  }
  // Assinatura na conta: não debita na criação (só à vista na conta debita imediatamente).
  return { account: 0, creditCard: 0 }
}

function isInMonth(dateStr, month, year) {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T12:00:00')
  return d.getMonth() + 1 === month && d.getFullYear() === year
}

function isActiveInstallment(tx) {
  const paid = parseInt(installmentsPaidOf(tx), 10) || 0
  const total = parseInt(installmentsTotalOf(tx), 10) || 0
  return total > 0 && paid < total
}

/**
 * Itens que descontam da conta no mês (painel + saldo projetado).
 * Fórmula: Saldo Líquido Projetado = Saldo Atual − total destes itens.
 */
export function computeMonthlyAccountDeductions({
  transactions = [],
  activeInstallments = [],
  recurringExpenses = [],
  month,
  year,
}) {
  const items = []
  const seenInstallment = new Set()

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    const pt = purchaseTypeOf(tx)
    const ps = paymentSourceOf(tx)

    if (pt === 'one_off' && ps === 'account' && isInMonth(tx.date, month, year)) {
      items.push({
        id: tx.id,
        description: tx.description,
        store: tx.store,
        amount: Number(tx.amount) || 0,
        kind: 'one_off_account',
        label: 'À vista (conta)',
      })
    }
  }

  for (const tx of activeInstallments) {
    if (!isActiveInstallment(tx)) continue
    if (paymentSourceOf(tx) !== 'credit_card') continue
    if (seenInstallment.has(tx.id)) continue
    seenInstallment.add(tx.id)

    const installmentAmount = Number(tx.installment_amount ?? tx.installmentAmount) || Number(tx.amount) || 0
    items.push({
      id: tx.id,
      description: tx.description,
      store: tx.store,
      amount: installmentAmount,
      kind: 'installment',
      label: `Parcela · ${formatPurchaseLabel(tx)}`,
    })
  }

  for (const r of recurringExpenses) {
    if (r.active === false) continue
    if (paymentSourceOf(r) !== 'account') continue
    items.push({
      id: r.id,
      description: r.description,
      amount: Number(r.amount) || 0,
      kind: 'subscription',
      label: 'Assinatura (conta)',
    })
  }

  const total = items.reduce((sum, i) => sum + i.amount, 0)
  return { items, total }
}

export function formatPurchaseLabel(tx) {
  const purchaseType = purchaseTypeOf(tx)
  if (purchaseType !== 'installment') {
    if (purchaseType === 'one_off') {
      return paymentSourceOf(tx) === 'credit_card' ? 'Cartão à vista' : 'À vista'
    }
    return ''
  }
  const total = installmentsTotalOf(tx) ?? '?'
  const paid = installmentsPaidOf(tx)
  return `Parcelada ${paid}/${total}`
}

/** Status da parcela no ciclo de fatura: (pago) ou (não paga). */
export function formatInstallmentInvoiceStatus(tx, { cardBalance = 0 } = {}) {
  const purchaseType = purchaseTypeOf(tx)
  if (purchaseType !== 'installment') return ''
  const paid = installmentsPaidOf(tx)
  const total = parseInt(installmentsTotalOf(tx), 10) || 0
  if (paid >= total) return '(pago)'
  if (Number(cardBalance) > 0) return '(não paga)'
  return '(pago)'
}

/** Limite comprometido por parcelas ativas no cartão (valor restante das compras). */
export function computeCreditCardLimitUsed(activeInstallments = []) {
  return activeInstallments.reduce((sum, tx) => {
    if (purchaseTypeOf(tx) !== 'installment') return sum
    if (paymentSourceOf(tx) !== 'credit_card') return sum
    const per = Number(tx.installment_amount ?? tx.installmentAmount) || Number(tx.amount) || 0
    const total = parseInt(installmentsTotalOf(tx), 10) || 0
    const paid = installmentsPaidOf(tx)
    const remaining = Math.max(0, total - paid)
    return sum + per * remaining
  }, 0)
}

export function computeAvailableCreditLimit(creditLimit, activeInstallments = []) {
  const limit = Number(creditLimit) || 0
  const used = computeCreditCardLimitUsed(activeInstallments)
  return Math.max(0, limit - used)
}

export function purchaseKindLabel(kind) {
  const labels = {
    one_off_account: 'À vista (saldo em conta)',
    one_off_card: 'Crédito à vista (cartão)',
    installment_card: 'Parcelado no cartão',
    subscription: 'Assinatura / recorrente',
  }
  return labels[kind] ?? kind
}

export function purchaseTotalValue(tx) {
  const purchaseType = purchaseTypeOf(tx)
  if (purchaseType !== 'installment') return Number(tx?.amount) || 0
  const per = Number(tx.installment_amount ?? tx.installmentAmount) || Number(tx.amount) || 0
  const n = parseInt(installmentsTotalOf(tx), 10) || 1
  return per * n
}

/** Lista parcelas 1..N com valor e status pago/pendente. */
export function getInstallmentSchedule(tx) {
  const total = parseInt(installmentsTotalOf(tx), 10) || 0
  if (total <= 0) return []
  const paid = parseInt(installmentsPaidOf(tx), 10) || 0
  const amount = Number(tx?.installment_amount ?? tx?.installmentAmount) || 0
  return Array.from({ length: total }, (_, i) => {
    const number = i + 1
    return {
      number,
      amount,
      paid: paid >= number,
    }
  })
}
