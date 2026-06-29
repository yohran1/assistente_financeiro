/** Impacto de uma transação no saldo em conta (+ entra, − sai). */
export function balanceDeltaForTransaction(tx) {
  if (!tx) return 0
  const type = tx.type
  const amount = Number(tx.amount) || 0
  const installmentAmount = Number(tx.installment_amount) || amount
  const paid = Math.max(0, parseInt(tx.installments_paid, 10) || 0)

  if (type === 'income') return amount
  if (type === 'expense') {
    if (tx.purchase_type === 'installment') {
      if (tx.in_progress && paid > 0) return -(installmentAmount * paid)
      return -installmentAmount
    }
    return -amount
  }
  if (type === 'investment' || type === 'saving') return -amount
  return 0
}

export function formatPurchaseLabel(tx) {
  if (tx?.purchase_type !== 'installment') {
    return tx?.purchase_type === 'one_off' ? 'Avulsa' : ''
  }
  const total = tx.installments_total ?? '?'
  const paid = tx.installments_paid ?? 0
  return `Parcelada ${paid}/${total}`
}

export function purchaseTotalValue(tx) {
  if (tx?.purchase_type !== 'installment') return Number(tx?.amount) || 0
  const per = Number(tx.installment_amount) || Number(tx.amount) || 0
  const n = parseInt(tx.installments_total, 10) || 1
  return per * n
}
