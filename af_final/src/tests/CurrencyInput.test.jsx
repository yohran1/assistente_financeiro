import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CurrencyInput } from '../components/ui/CurrencyInput'

describe('CurrencyInput', () => {
  it('renderiza com label', () => {
    render(<CurrencyInput label="Saldo" onChange={vi.fn()} />)
    expect(screen.getByText('Saldo')).toBeInTheDocument()
  })

  it('agrupa milhar sem casas decimais quando não há vírgula', () => {
    const onChange = vi.fn()
    render(<CurrencyInput onChange={onChange} />)
    const input = screen.getByPlaceholderText('0,00')
    fireEvent.change(input, { target: { value: '1500' } })
    expect(input.value).toBe('1.500')
    expect(onChange).toHaveBeenLastCalledWith(1500)
  })

  it('mostra centavos quando o usuário digita vírgula', () => {
    const onChange = vi.fn()
    render(<CurrencyInput onChange={onChange} />)
    const input = screen.getByPlaceholderText('0,00')
    fireEvent.change(input, { target: { value: '1234,45' } })
    expect(input.value).toBe('1.234,45')
    expect(onChange).toHaveBeenLastCalledWith(1234.45)
  })

  it('formata números grandes', () => {
    const onChange = vi.fn()
    render(<CurrencyInput onChange={onChange} />)
    const input = screen.getByPlaceholderText('0,00')
    fireEvent.change(input, { target: { value: '123456789,99' } })
    expect(input.value).toBe('123.456.789,99')
    expect(onChange).toHaveBeenLastCalledWith(123456789.99)
  })

  it('chama onChange com número', () => {
    const onChange = vi.fn()
    render(<CurrencyInput onChange={onChange} />)
    const input = screen.getByPlaceholderText('0,00')
    fireEvent.change(input, { target: { value: '250' } })
    expect(onChange).toHaveBeenCalledWith(250)
  })

  it('chama onChange com null quando vazio', () => {
    const onChange = vi.fn()
    render(<CurrencyInput onChange={onChange} />)
    const input = screen.getByPlaceholderText('0,00')
    fireEvent.change(input, { target: { value: '250' } })
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
