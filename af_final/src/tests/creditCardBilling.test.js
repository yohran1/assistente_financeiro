import { describe, it, expect } from 'vitest'
import {
  getCreditCardBillingStatus,
  getLastClosingDate,
  getDueDateForClosing,
} from '../lib/creditCardBilling'

describe('creditCardBilling', () => {
  it('calcula fechamento e vencimento no mesmo mês', () => {
    const today = new Date(2026, 5, 28) // 28/jun
    const status = getCreditCardBillingStatus({ closingDay: 5, dueDay: 12, today })

    expect(status.closing.label).toBe('Fecha fatura em 7 dias')
    expect(status.closing.pct).toBeGreaterThan(70)
    expect(status.due.overdue).toBe(true)
    expect(status.due.label).toMatch(/Venceu há/)
  })

  it('calcula prazo final antes do vencimento', () => {
    const today = new Date(2026, 5, 8) // 8/jun
    const status = getCreditCardBillingStatus({ closingDay: 5, dueDay: 12, today })

    expect(status.due.overdue).toBe(false)
    expect(status.due.label).toBe('Prazo final em 4 dias')
  })

  it('vencimento no mês seguinte quando due < closing', () => {
    const closing = getLastClosingDate(25, new Date(2026, 0, 26)) // jan/26
    const due = getDueDateForClosing(25, 5, closing)
    expect(due.getMonth()).toBe(1) // fevereiro
    expect(due.getDate()).toBe(5)
  })

  it('retorna null sem datas configuradas', () => {
    expect(getCreditCardBillingStatus({ closingDay: null, dueDay: 12 })).toEqual({ closing: null, due: null })
  })
})
