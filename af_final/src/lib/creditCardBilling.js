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
