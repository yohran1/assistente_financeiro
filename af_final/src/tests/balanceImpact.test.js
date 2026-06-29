import { describe, it, expect } from 'vitest'
import {
  balanceDeltaForTransaction,
  balanceImpactForTransaction,
  balanceImpactForRecurring,
  formatPurchaseLabel,
  formatInstallmentInvoiceStatus,
  purchaseTotalValue,
  computeCreditCardLimitUsed,
  computeAvailableCreditLimit,
} from '../lib/balanceImpact'

describe('balanceImpact', () => {
  it('desconta gasto avulso na conta', () => {
    const impact = balanceImpactForTransaction({ type: 'expense', amount: 100, purchase_type: 'one_off', payment_source: 'account' })
    expect(impact.account).toBe(-100)
    expect(impact.creditCard).toBe(0)
    expect(balanceDeltaForTransaction({ type: 'expense', amount: 100, purchase_type: 'one_off' })).toBe(-100)
  })

  it('crédito à vista aumenta fatura do cartão sem mexer na conta', () => {
    const impact = balanceImpactForTransaction({ type: 'expense', amount: 250, purchase_type: 'one_off', payment_source: 'credit_card' })
    expect(impact.account).toBe(0)
    expect(impact.creditCard).toBe(250)
  })

  it('parcelado no cartão: só parcela atual na fatura, conta não muda', () => {
    const impact = balanceImpactForTransaction({
      type: 'expense', amount: 6600, purchase_type: 'installment', payment_source: 'credit_card',
      installment_amount: 550, installments_total: 12, installments_paid: 0,
    })
    expect(impact.account).toBe(0)
    expect(impact.creditCard).toBe(550)
  })

  it('parcelado em andamento não debita conta', () => {
    expect(balanceImpactForTransaction({
      type: 'expense', amount: 1000, purchase_type: 'installment', payment_source: 'credit_card',
      installment_amount: 200, installments_total: 5, installments_paid: 3, in_progress: true,
    })).toEqual({ account: 0, creditCard: 200 })
  })

  it('assinatura na conta não debita na criação', () => {
    expect(balanceImpactForRecurring({ amount: 49.9, payment_source: 'account' })).toEqual({ account: 0, creditCard: 0 })
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

  it('status de parcela na fatura', () => {
    const tx = { purchase_type: 'installment', installments_paid: 1, installments_total: 5 }
    expect(formatInstallmentInvoiceStatus(tx, { cardBalance: 200 })).toBe('(não paga)')
    expect(formatInstallmentInvoiceStatus(tx, { cardBalance: 0 })).toBe('(pago)')
  })

  it('calcula total da compra parcelada', () => {
    expect(purchaseTotalValue({ purchase_type: 'installment', installment_amount: 200, installments_total: 5 })).toBe(1000)
  })

  it('calcula limite comprometido e disponível', () => {
    const installments = [
      { purchase_type: 'installment', payment_source: 'credit_card', installment_amount: 550, installments_total: 12, installments_paid: 0 },
    ]
    expect(computeCreditCardLimitUsed(installments)).toBe(6600)
    expect(computeAvailableCreditLimit(10000, installments)).toBe(3400)
  })
})
