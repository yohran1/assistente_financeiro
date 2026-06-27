import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CurrencyInput } from '../components/ui/CurrencyInput'

describe('CurrencyInput', () => {
  it('renderiza com label', () => {
    render(<CurrencyInput label="Saldo" onChange={vi.fn()} />)
    expect(screen.getByText('Saldo')).toBeInTheDocument()
  })

  it('formata valor ao blur', () => {
    const onChange = vi.fn()
    render(<CurrencyInput onChange={onChange} />)
    const input = screen.getByPlaceholderText('0,00')
    fireEvent.change(input, { target: { value: '1500' } })
    fireEvent.blur(input)
    expect(input.value).toMatch(/1\.500,00|1500/)
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
