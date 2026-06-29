import { describe, it, expect } from 'vitest'
import {
  balanceDeltaForTransaction,
  balanceImpactForTransaction,
  balanceImpactForRecurring,
  formatPurchaseLabel,
  purchaseTotalValue,
  computeMonthlyAccountDeductions,
} from '../lib/balanceImpact'

describe('balanceImpact', () => {
  it('desconta gasto avulso na conta', () => {
    const impact = balanceImpactForTransaction({ type: 'expense', amount: 100, purchase_type: 'one_off', payment_source: 'account' })
    expect(impact.account).toBe(-100)
    expect(impact.creditCard).toBe(0)
    expect(balanceDeltaForTransaction({ type: 'expense', amount: 100, purchase_type: 'one_off' })).toBe(-100)
  })

  it('crédito à vista aumenta fatura do cartão', () => {
    const impact = balanceImpactForTransaction({ type: 'expense', amount: 250, purchase_type: 'one_off', payment_source: 'credit_card' })
    expect(impact.account).toBe(0)
    expect(impact.creditCard).toBe(250)
  })

  it('parcelado no cartão: fatura total + primeira parcela na conta', () => {
    const impact = balanceImpactForTransaction({
      type: 'expense', amount: 1000, purchase_type: 'installment', payment_source: 'credit_card',
      installment_amount: 200, installments_total: 5, installments_paid: 0, in_progress: false,
    })
    expect(impact.account).toBe(-200)
    expect(impact.creditCard).toBe(1000)
  })

  it('parcelado em andamento desconta parcelas já pagas', () => {
    expect(balanceDeltaForTransaction({
      type: 'expense', amount: 1000, purchase_type: 'installment', payment_source: 'credit_card',
      installment_amount: 200, installments_total: 5, installments_paid: 3, in_progress: true,
    })).toBe(-600)
  })

  it('assinatura na conta debita mensalidade', () => {
    expect(balanceImpactForRecurring({ amount: 49.9, payment_source: 'account' })).toEqual({ account: -49.9, creditCard: 0 })
  })

  it('assinatura no cartão aumenta fatura', () => {
    expect(balanceImpactForRecurring({ amount: 55, payment_source: 'credit_card' })).toEqual({ account: 0, creditCard: 55 })
  })

  it('formata label parcelada (camelCase — summary.items)', () => {
    expect(formatPurchaseLabel({ purchaseType: 'installment', installmentsPaid: 3, installmentsTotal: 5 }))
      .toBe('Parcelada 3/5')
  })

  it('formata label cartão à vista', () => {
    expect(formatPurchaseLabel({ purchase_type: 'one_off', payment_source: 'credit_card' })).toBe('Cartão à vista')
  })

  it('calcula total da compra parcelada', () => {
    expect(purchaseTotalValue({ purchase_type: 'installment', installment_amount: 200, installments_total: 5 })).toBe(1000)
  })

  it('computa descontos mensais da conta', () => {
    const result = computeMonthlyAccountDeductions({
      month: 6,
      year: 2026,
      transactions: [
        { id: '1', type: 'expense', description: 'Mercado', amount: 80, purchase_type: 'one_off', payment_source: 'account', date: '2026-06-10' },
      ],
      activeInstallments: [
        { id: '2', type: 'expense', description: 'TV', purchase_type: 'installment', payment_source: 'credit_card', installment_amount: 150, installments_total: 10, installments_paid: 2 },
      ],
      recurringExpenses: [
        { id: '3', description: 'Netflix', amount: 45, active: true, payment_source: 'account' },
      ],
    })
    expect(result.items).toHaveLength(3)
    expect(result.total).toBe(80 + 150 + 45)
  })
})
