/** Intervalo inclusivo YYYY-MM-DD para consultas (sem conversão UTC). */
export function monthDateRange(month, year) {
  const m = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  return {
    start: `${year}-${m}-01`,
    end: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function formatMonthYear(month, year) {
  return new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
}

export function formatMonthTotalSubtitle(month, year) {
  return `Total de ${formatMonthYear(month, year)}`
}

/** Opções rolantes para o seletor (ex.: últimos 24 meses + mês atual). */
export function buildMonthSelectOptions({ monthsBack = 23, monthsForward = 0, anchor = new Date() } = {}) {
  const options = []
  const start = new Date(anchor.getFullYear(), anchor.getMonth() - monthsBack, 1)
  const total = monthsBack + monthsForward + 1
  for (let i = 0; i < total; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    const month = d.getMonth() + 1
    const y = d.getFullYear()
    options.push({
      value: `${y}-${month}`,
      label: d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
    })
  }
  return options
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null
  return new Date(`${dateStr}T12:00:00`)
}

export function isDateInMonth(dateStr, month, year) {
  const d = parseLocalDate(dateStr)
  if (!d) return false
  return d.getMonth() + 1 === month && d.getFullYear() === year
}

/** Parcela N vence no mês da compra + (N − 1). */
export function isInstallmentDueInMonth(tx, month, year) {
  const purchaseType = tx?.purchase_type ?? tx?.purchaseType
  if (purchaseType !== 'installment') return false
  const purchase = parseLocalDate(tx?.date)
  if (!purchase) return false
  const total = parseInt(tx?.installments_total ?? tx?.installmentsTotal ?? 0, 10) || 0
  if (total <= 0) return false

  let m = purchase.getMonth() + 1
  let y = purchase.getFullYear()
  for (let i = 0; i < total; i++) {
    if (m === month && y === year) return true
    m++
    if (m > 12) { m = 1; y++ }
  }
  return false
}

export function transactionMatchesMonth(tx, month, year) {
  if (tx?.type === 'expense' && (tx?.purchase_type ?? tx?.purchaseType) === 'installment') {
    return isInstallmentDueInMonth(tx, month, year)
  }
  return isDateInMonth(tx?.date, month, year)
}
