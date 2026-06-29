import { forwardRef, useState, useEffect, useRef } from 'react'

/**
 * Input de valor monetário (pt-BR).
 * Regras de exibição:
 *  - O número digitado é o valor em reais (NÃO em centavos).
 *  - Ponto separa milhar, vírgula separa centavos.
 *  - Sem vírgula  -> sem casas decimais.   Ex: 1000        -> "1.000"
 *  - Com vírgula  -> centavos após a vírgula. Ex: 1234,45   -> "1.234,45"
 *  - Funciona com números grandes.          Ex: 123456789,99 -> "123.456.789,99"
 */

// Agrupa a parte inteira com pontos de milhar, sem usar Number (preserva precisão).
function groupThousands(intDigits) {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Formata a partir de um número JS para exibição final (usado no carregamento/blur).
function formatFromNumber(num) {
  if (num === null || num === undefined || num === '' || Number.isNaN(Number(num))) return ''
  const n = Number(num)
  const negative = n < 0
  const abs = Math.abs(n)
  let out
  if (Number.isInteger(abs)) {
    out = groupThousands(String(abs))
  } else {
    const [intPart, decPart] = abs.toFixed(2).split('.')
    out = groupThousands(intPart) + ',' + decPart
  }
  return (negative ? '-' : '') + out
}

// Formata enquanto o usuário digita e devolve { display, value }.
function formatFromTyping(raw) {
  const negative = String(raw).trim().startsWith('-')
  // Mantém apenas dígitos e vírgulas (pontos de milhar são reaplicados).
  const cleaned = String(raw).replace(/[^\d,]/g, '')
  const firstComma = cleaned.indexOf(',')

  let intDigits, decDigits, hasComma
  if (firstComma === -1) {
    intDigits = cleaned
    decDigits = ''
    hasComma = false
  } else {
    intDigits = cleaned.slice(0, firstComma).replace(/,/g, '')
    decDigits = cleaned.slice(firstComma + 1).replace(/,/g, '').slice(0, 2)
    hasComma = true
  }

  // Remove zeros à esquerda (mantém um único zero).
  intDigits = intDigits.replace(/^0+(?=\d)/, '')

  if (intDigits === '' && decDigits === '' && !hasComma) {
    return { display: negative ? '-' : '', value: null }
  }

  const groupedInt = intDigits === '' ? '' : groupThousands(intDigits)
  let display = groupedInt
  if (hasComma) display = (groupedInt || '0') + ',' + decDigits
  if (negative) display = '-' + display

  const valueStr = (intDigits || '0') + (hasComma ? '.' + (decDigits || '0') : '')
  let value = parseFloat(valueStr)
  if (Number.isNaN(value)) value = null
  else if (negative) value = -value

  return { display, value }
}

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
  const [displayValue, setDisplayValue] = useState(() => formatFromNumber(value ?? null))
  const lastPropsValue = useRef(value)
  const mergedRef = ref || inputRef

  useEffect(() => {
    if (value !== lastPropsValue.current) {
      const normalized = value === null || value === undefined || value === '' ? null : Number(value)
      setInternalValue(normalized)
      setDisplayValue(formatFromNumber(normalized))
      lastPropsValue.current = value
    }
  }, [value])

  const handleChange = (e) => {
    const { display, value: num } = formatFromTyping(e.target.value)
    setDisplayValue(display)
    setInternalValue(num)
    onChange?.(num)
  }

  // Ao sair do campo, normaliza a exibição (ex.: "1.000," -> "1.000").
  const handleBlur = () => {
    setDisplayValue(formatFromNumber(internalValue))
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-white/70">{label}</label>}
      <div className="relative isolate">
        <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center justify-center text-white/40 text-sm font-medium">
          R$
        </span>
        <input
          ref={mergedRef}
          type="text"
          inputMode="decimal"
          onChange={handleChange}
          onBlur={handleBlur}
          value={displayValue}
          className={`
            w-full box-border pl-10 pr-4 py-3 rounded-xl min-h-[48px]
            bg-white/5 border border-white/10
            text-white placeholder:text-white/30
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/50 focus:border-brand-500/50
            transition-colors duration-200
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
