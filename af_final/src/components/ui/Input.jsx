import { forwardRef, useState, useId } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export const Input = forwardRef(({
  label,
  error,
  hint,
  type      = 'text',
  className = '',
  icon: Icon,
  rightElement,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType  = isPassword ? (showPassword ? 'text' : 'password') : type
  const inputId    = useId()

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-white/70 select-none">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none z-10">
            <Icon size={16} aria-hidden="true" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          autoComplete={
            type === 'email'    ? 'email' :
            type === 'password' ? 'current-password' :
            props.autoComplete
          }
          className={`
            w-full py-3 rounded-xl
            bg-white/[0.05] border border-white/10
            text-white placeholder:text-white/30
            transition-all duration-200
            min-h-[48px]
            focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40
            disabled:opacity-40 disabled:cursor-not-allowed
            ${error ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50' : ''}
            ${Icon ? 'pl-10 pr-4' : 'px-4'}
            ${type === 'date' ? '!pr-10' : ''}
            ${isPassword || rightElement ? '!pr-12' : ''}
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />

        {/* Botão mostrar/ocultar senha */}
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            className="
              absolute right-0 top-0 bottom-0
              px-4 flex items-center
              text-white/30 hover:text-white/60
              transition-colors duration-150
              rounded-r-xl
            "
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}

        {!isPassword && rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-400 flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-white/40">{hint}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
