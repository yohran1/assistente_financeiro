import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Select cross-browser com aparência consistente em
 * Chrome, Firefox, Safari, Edge, iOS Safari e Android Chrome.
 * Remove aparência nativa e aplica seta SVG customizada.
 */
export const Select = forwardRef(({
  label,
  error,
  hint,
  children,
  className = '',
  wrapperClassName = '',
  icon: Icon,
  compact = false,
  ...props
}, ref) => {
  const selectId = useId()

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-white/70 select-none">
          {label}
        </label>
      )}
      <div className="relative isolate">
        {Icon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center justify-center text-white/30">
            <Icon size={15} aria-hidden="true" />
          </span>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`
            w-full box-border rounded-xl
            bg-white/[0.05] border border-white/10
            text-white
            transition-colors duration-200
            cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/40 focus:border-brand-500/40
            disabled:opacity-40 disabled:cursor-not-allowed
            bg-[length:0_0] [background-image:none]
            ${compact ? 'py-2 min-h-[40px] text-sm' : 'py-3 min-h-[48px]'}
            ${error ? 'border-red-500/50 focus:ring-red-500/30' : ''}
            ${Icon ? 'pl-10 pr-10' : 'pl-4 pr-10'}
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          {...props}
        >
          {children}
        </select>
        {/* Seta customizada — funciona em todos os browsers */}
        <div className="absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-center pointer-events-none text-white/40">
          <ChevronDown size={15} aria-hidden="true" />
        </div>
      </div>
      {error && (
        <p id={`${selectId}-error`} role="alert" className="text-xs text-red-400 flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${selectId}-hint`} className="text-xs text-white/40">{hint}</p>
      )}
    </div>
  )
})

Select.displayName = 'Select'
