import { describe, it, expect } from 'vitest'
import {
  monthDateRange,
  formatMonthYear,
  formatMonthTotalSubtitle,
  buildMonthSelectOptions,
  isDateInMonth,
  isInstallmentDueInMonth,
  transactionMatchesMonth,
} from '../lib/monthUtils'

describe('monthDateRange', () => {
  it('returns inclusive local dates without UTC shift', () => {
    expect(monthDateRange(2, 2026)).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(monthDateRange(2, 2024)).toEqual({ start: '2024-02-01', end: '2024-02-29' })
    expect(monthDateRange(12, 2025)).toEqual({ start: '2025-12-01', end: '2025-12-31' })
  })
})

describe('formatMonthYear', () => {
  it('formats month and year in pt-BR', () => {
    expect(formatMonthYear(6, 2026)).toMatch(/junho.*2026/i)
  })
})

describe('formatMonthTotalSubtitle', () => {
  it('includes month label for cards', () => {
    expect(formatMonthTotalSubtitle(6, 2026)).toMatch(/total de junho.*2026/i)
  })
})

describe('buildMonthSelectOptions', () => {
  it('includes year boundary months', () => {
    const anchor = new Date(2026, 0, 15) // jan 2026
    const options = buildMonthSelectOptions({ monthsBack: 2, monthsForward: 0, anchor })
    expect(options.map(o => o.value)).toEqual(['2025-11', '2025-12', '2026-1'])
  })
})

describe('isInstallmentDueInMonth', () => {
  const tx = {
    type: 'expense',
    purchase_type: 'installment',
    date: '2026-01-15',
    installments_total: 4,
  }

  it('matches purchase month and following months in schedule', () => {
    expect(isInstallmentDueInMonth(tx, 1, 2026)).toBe(true)
    expect(isInstallmentDueInMonth(tx, 2, 2026)).toBe(true)
    expect(isInstallmentDueInMonth(tx, 4, 2026)).toBe(true)
    expect(isInstallmentDueInMonth(tx, 5, 2026)).toBe(false)
  })

  it('rolls over year boundary', () => {
    const decTx = { ...tx, date: '2025-11-10', installments_total: 3 }
    expect(isInstallmentDueInMonth(decTx, 11, 2025)).toBe(true)
    expect(isInstallmentDueInMonth(decTx, 12, 2025)).toBe(true)
    expect(isInstallmentDueInMonth(decTx, 1, 2026)).toBe(true)
    expect(isInstallmentDueInMonth(decTx, 2, 2026)).toBe(false)
  })
})

describe('transactionMatchesMonth', () => {
  it('uses date for non-installment transactions', () => {
    expect(transactionMatchesMonth({ type: 'income', date: '2026-03-05' }, 3, 2026)).toBe(true)
    expect(transactionMatchesMonth({ type: 'income', date: '2026-03-05' }, 4, 2026)).toBe(false)
  })

  it('uses installment schedule for parceladas', () => {
    const tx = {
      type: 'expense',
      purchase_type: 'installment',
      date: '2026-01-10',
      installments_total: 6,
    }
    expect(transactionMatchesMonth(tx, 3, 2026)).toBe(true)
    expect(transactionMatchesMonth(tx, 7, 2026)).toBe(false)
  })
})

describe('isDateInMonth', () => {
  it('parses YYYY-MM-DD in local noon', () => {
    expect(isDateInMonth('2026-06-30', 6, 2026)).toBe(true)
    expect(isDateInMonth('2026-06-30', 7, 2026)).toBe(false)
  })
})
