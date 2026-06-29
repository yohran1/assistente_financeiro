import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Modal } from '../components/ui/Modal'
import { CurrencyInput } from '../components/ui/CurrencyInput'

// Reproduz o padrão real: onClose inline + estado controlado no pai.
function BalanceModal() {
  const [open, setOpen] = useState(true)
  const [balance, setBalance] = useState(null)
  return (
    <Modal isOpen={open} onClose={() => setOpen(false)} title="Atualizar saldo">
      <CurrencyInput label="Saldo" value={balance} onChange={setBalance} />
    </Modal>
  )
}

describe('Modal focus', () => {
  it('mantém foco no input ao digitar com onClose inline', async () => {
    render(<BalanceModal />)
    const input = screen.getByPlaceholderText('0,00')
    input.focus()
    expect(document.activeElement).toBe(input)

    fireEvent.change(input, { target: { value: '1' } })
    expect(document.activeElement).toBe(input)

    fireEvent.change(input, { target: { value: '12' } })
    expect(document.activeElement).toBe(input)
    expect(input.value).toBe('12')
  })
})
