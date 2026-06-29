import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { InstallmentBreakdown, InstallmentToggleButton } from '../pages/Expenses/InstallmentBreakdown'

const installmentTx = {
  id: 'tx1',
  description: 'Notebook',
  purchase_type: 'installment',
  installments_total: 3,
  installments_paid: 1,
  installment_amount: 500,
}

describe('InstallmentBreakdown', () => {
  it('lista todas as parcelas com status pago/pendente', () => {
    render(<InstallmentBreakdown tx={installmentTx} open />)
    expect(screen.getByText('Parcela 1/3')).toBeInTheDocument()
    expect(screen.getByText('Parcela 2/3')).toBeInTheDocument()
    expect(screen.getByText('Parcela 3/3')).toBeInTheDocument()
    expect(screen.getAllByText('Paga')).toHaveLength(1)
    expect(screen.getAllByText('Não paga')).toHaveLength(2)
    expect(screen.getAllByText('R$ 500,00')).toHaveLength(3)
  })

  it('botão alterna aria-expanded', () => {
    const { rerender } = render(
      <InstallmentToggleButton open={false} onClick={() => {}} description="Notebook" />
    )
    expect(screen.getByRole('button', { name: /ver parcelas/i })).toHaveAttribute('aria-expanded', 'false')

    rerender(<InstallmentToggleButton open onClick={() => {}} description="Notebook" />)
    expect(screen.getByRole('button', { name: /recolher parcelas/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it('chama onClick ao clicar no botão', () => {
    let clicked = false
    render(
      <InstallmentToggleButton
        open={false}
        onClick={() => { clicked = true }}
        description="Notebook"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /ver parcelas/i }))
    expect(clicked).toBe(true)
  })
})
