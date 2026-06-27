export function Card({ children, className = '', glass = false, onClick, hover = false }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      className={`
        w-full text-left rounded-2xl sm:rounded-3xl p-4 sm:p-5
        ${glass
          ? 'bg-white/[0.03] border border-white/[0.06] -webkit-backdrop-filter backdrop-blur-xl'
          : 'bg-white/[0.04] border border-white/[0.07]'
        }
        ${onClick || hover
          ? 'cursor-pointer hover:bg-white/[0.07] transition-all duration-200 touch-press'
          : ''
        }
        ${className}
      `}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({ children, action }) {
  return (
    <div className="flex items-start justify-between gap-2 mb-4">
      <div className="min-w-0">{children}</div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
