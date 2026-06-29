import { describe, it, expect } from 'vitest'
import { balanceDeltaForTransaction, formatPurchaseLabel, purchaseTotalValue } from '../lib/balanceImpact'

describe('balanceImpact', () => {
  it('desconta gasto avulso', () => {
    expect(balanceDeltaForTransaction({ type: 'expense', amount: 100, purchase_type: 'one_off' })).toBe(-100)
  })

  it('desconta parcela mensal', () => {
    expect(balanceDeltaForTransaction({
      type: 'expense', amount: 1000, purchase_type: 'installment',
      installment_amount: 200, installments_total: 5, installments_paid: 0, in_progress: false,
    })).toBe(-200)
  })

  it('desconta parcelas já pagas em andamento', () => {
    expect(balanceDeltaForTransaction({
      type: 'expense', amount: 1000, purchase_type: 'installment',
      installment_amount: 200, installments_total: 5, installments_paid: 3, in_progress: true,
    })).toBe(-600)
  })

  it('formata label parcelada (camelCase)', () => {
    expect(formatPurchaseLabel({ purchaseType: 'installment', installmentsPaid: 3, installmentsTotal: 5 }))
      .toBe('Parcelada 3/5')
  })

  it('calcula total da compra parcelada', () => {
    expect(purchaseTotalValue({ purchase_type: 'installment', installment_amount: 200, installments_total: 5 })).toBe(1000)
  })
})
