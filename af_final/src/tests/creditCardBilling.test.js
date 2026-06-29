import { describe, it, expect } from 'vitest'
import {
  getCreditCardBillingStatus,
  getLastClosingDate,
  getDueDateForClosing,
  payCreditCardInvoicePlan,
  computeProjectedCreditCardInvoice,
  getInstallmentsDueOnInvoice,
  isNextInvoicePreviewEligible,
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

describe('payCreditCardInvoicePlan', () => {
  const installments = [
    {
      id: 'tx1',
      purchase_type: 'installment',
      payment_source: 'credit_card',
      installment_amount: 100,
      installments_total: 4,
      installments_paid: 1,
    },
    {
      id: 'tx2',
      purchase_type: 'installment',
      payment_source: 'credit_card',
      installment_amount: 50,
      installments_total: 3,
      installments_paid: 3,
    },
  ]

  it('debita conta, zera fatura e avança parcelas ativas', () => {
    const plan = payCreditCardInvoicePlan({
      accountBalance: 2000,
      creditCardBalance: 850,
      activeInstallments: installments,
    })
    expect(plan.ok).toBe(true)
    expect(plan.amount).toBe(850)
    expect(plan.newAccountBalance).toBe(1150)
    expect(plan.newCreditCardBalance).toBe(0)
    expect(plan.installmentUpdates).toEqual([{ id: 'tx1', installments_paid: 2 }])
  })

  it('rejeita fatura zerada', () => {
    const plan = payCreditCardInvoicePlan({ accountBalance: 500, creditCardBalance: 0, activeInstallments: [] })
    expect(plan.ok).toBe(false)
    expect(plan.error).toMatch(/zerada/)
  })

  it('rejeita saldo insuficiente na conta', () => {
    const plan = payCreditCardInvoicePlan({ accountBalance: 100, creditCardBalance: 500, activeInstallments: [] })
    expect(plan.ok).toBe(false)
    expect(plan.error).toMatch(/insuficiente/)
    expect(plan.amount).toBe(500)
  })

  it('identifica parcelas devidas na fatura', () => {
    const due = getInstallmentsDueOnInvoice(installments)
    expect(due).toHaveLength(1)
    expect(due[0].id).toBe('tx1')
  })
})

describe('isNextInvoicePreviewEligible', () => {
  it('não exibe prévia com fatura em aberto', () => {
    expect(isNextInvoicePreviewEligible({
      closingDay: 5,
      creditCardBalance: 150,
      invoicePaidAt: '2026-07-01T12:00:00Z',
      today: new Date(2026, 6, 10),
    })).toBe(false)
  })

  it('não exibe prévia antes do fechamento do ciclo', () => {
    expect(isNextInvoicePreviewEligible({
      closingDay: 25,
      creditCardBalance: 0,
      invoicePaidAt: '2026-06-10T12:00:00Z',
      today: new Date(2026, 5, 15),
    })).toBe(false)
  })

  it('exibe prévia após fechamento e pagamento', () => {
    expect(isNextInvoicePreviewEligible({
      closingDay: 25,
      creditCardBalance: 0,
      invoicePaidAt: '2026-06-28T12:00:00Z',
      today: new Date(2026, 6, 26),
    })).toBe(true)
  })
})

describe('computeProjectedCreditCardInvoice', () => {
  const today = new Date(2026, 5, 20) // 20/jun/2026

  it('soma assinaturas, parcelas e compras à vista no ciclo', () => {
    const result = computeProjectedCreditCardInvoice({
      closingDay: 5,
      today,
      transactions: [
        {
          id: 'o1',
          type: 'expense',
          description: 'Loja',
          amount: 120,
          purchase_type: 'one_off',
          payment_source: 'credit_card',
          date: '2026-06-10',
        },
      ],
      activeInstallments: [
        {
          id: 'i1',
          description: 'TV',
          purchase_type: 'installment',
          payment_source: 'credit_card',
          installment_amount: 150,
          installments_total: 10,
          installments_paid: 2,
        },
      ],
      recurringExpenses: [
        { id: 'r1', description: 'Streaming', amount: 45, active: true, payment_source: 'credit_card' },
      ],
    })
    expect(result.items).toHaveLength(3)
    expect(result.total).toBe(45 + 150 + 120)
  })
})
