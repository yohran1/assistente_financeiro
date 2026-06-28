import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CurrencyInput } from '../components/ui/CurrencyInput'

// Reproduz o uso real: pai controla `value` via estado (como nos modais).
function Controlled({ initial = null }) {
  const [val, setVal] = useState(initial)
  return (
    <div>
      <CurrencyInput value={val} onChange={setVal} />
      <span data-testid="num">{val === null ? 'null' : String(val)}</span>
    </div>
  )
}

describe('CurrencyInput (controlado pelo pai)', () => {
  it('aceita digitação sequencial sem travar', () => {
    render(<Controlled initial={0} />)
    const input = screen.getByPlaceholderText('0,00')
    // simula limpar e digitar 1 -> 12 -> 123 -> ... -> 123456789
    const seq = ['1', '12', '123', '1234', '12345', '123456', '1234567', '12345678', '123456789']
    for (const s of seq) fireEvent.change(input, { target: { value: s } })
    expect(input.value).toBe('123.456.789')
    expect(screen.getByTestId('num').textContent).toBe('123456789')
  })

  it('mantém centavos ao digitar vírgula no fluxo controlado', () => {
    render(<Controlled initial={500} />)
    const input = screen.getByPlaceholderText('0,00')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.change(input, { target: { value: '1234' } })
    fireEvent.change(input, { target: { value: '1234,' } })
    fireEvent.change(input, { target: { value: '1234,4' } })
    fireEvent.change(input, { target: { value: '1234,45' } })
    expect(input.value).toBe('1.234,45')
    expect(screen.getByTestId('num').textContent).toBe('1234.45')
  })
})
