function purchaseTypeOf(tx) {
  return tx?.purchase_type ?? tx?.purchaseType ?? 'one_off'
}

function installmentsTotalOf(tx) {
  return tx?.installments_total ?? tx?.installmentsTotal
}

function installmentsPaidOf(tx) {
  return tx?.installments_paid ?? tx?.installmentsPaid ?? 0
}

/** Impacto de uma transação no saldo em conta (+ entra, − sai). */
export function balanceDeltaForTransaction(tx) {
  if (!tx) return 0
  const type = tx.type
  const amount = Number(tx.amount) || 0
  const installmentAmount = Number(tx.installment_amount ?? tx.installmentAmount) || amount
  const paid = Math.max(0, parseInt(installmentsPaidOf(tx), 10) || 0)
  const purchaseType = purchaseTypeOf(tx)

  if (type === 'income') return amount
  if (type === 'expense') {
    if (purchaseType === 'installment') {
      if (tx.in_progress && paid > 0) return -(installmentAmount * paid)
      return -installmentAmount
    }
    return -amount
  }
  if (type === 'investment' || type === 'saving') return -amount
  return 0
}

export function formatPurchaseLabel(tx) {
  const purchaseType = purchaseTypeOf(tx)
  if (purchaseType !== 'installment') {
    return purchaseType === 'one_off' ? 'Avulsa' : ''
  }
  const total = installmentsTotalOf(tx) ?? '?'
  const paid = installmentsPaidOf(tx)
  return `Parcelada ${paid}/${total}`
}

export function purchaseTotalValue(tx) {
  const purchaseType = purchaseTypeOf(tx)
  if (purchaseType !== 'installment') return Number(tx?.amount) || 0
  const per = Number(tx.installment_amount ?? tx.installmentAmount) || Number(tx.amount) || 0
  const n = parseInt(installmentsTotalOf(tx), 10) || 1
  return per * n
}
