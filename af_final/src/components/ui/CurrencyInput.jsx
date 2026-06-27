import { forwardRef, useState, useEffect, useRef } from 'react'

/**
 * Input de valor monetário com formatação BRL ao digitar
 * Otimizado para evitar bugs de sincronização e lag
 */
export const CurrencyInput = forwardRef(({
  label,
  error,
  value,
  onChange,
  className = '',
  ...props
}, ref) => {
  const inputRef = useRef(null)
  const [internalValue, setInternalValue] = useState(value ?? null)
  const [displayValue, setDisplayValue] = useState(() => {
    const initialValue = value ?? null
    if (initialValue === null || initialValue === undefined || initialValue === '') return ''
    const parsed = typeof initialValue === 'string' ? parseFloat(initialValue.replace(',', '.')) : parseFloat(initialValue)
    return Number.isFinite(parsed)
      ? parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : ''
  })
  const lastPropsValue = useRef(value)
  const mergedRef = ref || inputRef

  const formatDisplay = (num) => {
    if (num === null || num === undefined || num === '') return ''
    const parsed = typeof num === 'string' ? parseFloat(num.replace(',', '.')) : parseFloat(num)
    if (isNaN(parsed)) return ''
    return parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const extractNumber = (str) => {
    const cleaned = String(str).replace(/[^\d.,]/g, '')
    return cleaned.replace(',', '.')
  }

  useEffect(() => {
    if (value !== lastPropsValue.current) {
      const normalized = value === null || value === undefined || value === '' ? null : value
      setInternalValue(normalized)
      setDisplayValue(formatDisplay(normalized))
      lastPropsValue.current = value
    }
  }, [value])

  const handleChange = (e) => {
    const rawInput = e.target.value
    setDisplayValue(rawInput)
    const numStr = extractNumber(rawInput)

    if (numStr === '' || numStr === '.') {
      setInternalValue(null)
      onChange?.(null)
      return
    }

    const num = parseFloat(numStr)
    if (!isNaN(num)) {
      setInternalValue(num)
      onChange?.(num)
    }
  }

  const handleBlur = () => {
    setDisplayValue(internalValue !== null && internalValue !== undefined ? formatDisplay(internalValue) : '')
  }

  const handleFocus = () => {
    if (internalValue !== null && internalValue !== undefined) {
      setDisplayValue(String(internalValue))
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-white/70">{label}</label>}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm font-medium">R$</span>
        <input
          ref={mergedRef}
          type="text"
          inputMode="decimal"
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          value={displayValue}
          className={`
            w-full pl-10 pr-4 py-3 rounded-xl
            bg-white/5 border border-white/10
            text-white placeholder:text-white/30
            focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50
            transition-all duration-200
            font-mono
            ${error ? 'border-red-500/50' : ''}
            ${className}
          `}
          placeholder="0,00"
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
})

CurrencyInput.displayName = 'CurrencyInput'
