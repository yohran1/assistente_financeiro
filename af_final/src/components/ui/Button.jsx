import { forwardRef } from 'react'

const variants = {
  primary:   'bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white shadow-lg shadow-brand-600/20',
  secondary: 'bg-white/[0.07] hover:bg-white/[0.12] active:bg-white/[0.05] text-white border border-white/10',
  ghost:     'hover:bg-white/[0.07] active:bg-white/[0.04] text-white/70 hover:text-white',
  danger:    'bg-red-600/15 hover:bg-red-600/25 active:bg-red-600/10 text-red-400 border border-red-500/20',
  success:   'bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/20',
}

const sizes = {
  sm:   'px-3 py-1.5 text-xs rounded-xl gap-1.5 min-h-[32px]',
  md:   'px-4 py-2.5 text-sm rounded-xl gap-2 min-h-[40px]',
  lg:   'px-6 py-3 text-base rounded-2xl gap-2 min-h-[48px]',
  xl:   'px-8 py-4 text-base rounded-2xl gap-2 min-h-[56px]',
  icon: 'p-2.5 rounded-xl min-w-[40px] min-h-[40px]',
}

export const Button = forwardRef(({
  children,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}, ref) => (
  <button
    ref={ref}
    type={type}
    disabled={disabled || loading}
    className={`
      inline-flex items-center justify-center font-medium
      transition-all duration-150 cursor-pointer select-none
      touch-press
      disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
      focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:outline-none
      ${variants[variant] ?? variants.primary}
      ${sizes[size] ?? sizes.md}
      ${className}
    `}
    {...props}
  >
    {loading && (
      <svg
        className="animate-spin-slow shrink-0"
        style={{ width: size === 'sm' ? 12 : 15, height: size === 'sm' ? 12 : 15 }}
        fill="none" viewBox="0 0 24 24" aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path  className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    )}
    {children}
  </button>
))

Button.displayName = 'Button'
