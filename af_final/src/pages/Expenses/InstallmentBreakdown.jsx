import { ChevronDown, Layers } from 'lucide-react'
import { formatPurchaseLabel, getInstallmentSchedule } from '../../lib/balanceImpact'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function InstallmentToggleButton({ open, onClick, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? `Recolher parcelas de ${description}` : `Ver parcelas de ${description}`}
      className="
        p-2 rounded-xl
        text-orange-400/70 hover:text-orange-300 hover:bg-orange-500/10
        transition-all touch-press
        min-w-[36px] min-h-[36px] flex items-center justify-center
      "
    >
      <ChevronDown
        size={15}
        className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        aria-hidden="true"
      />
    </button>
  )
}

export function InstallmentBreakdown({ tx, open }) {
  const schedule = getInstallmentSchedule(tx)
  if (!schedule.length) return null

  return (
    <div
      className={`
        grid transition-[grid-template-rows,opacity] duration-300 ease-out
        ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
      `}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">
        <div className="px-3.5 sm:px-4 pb-3.5 pt-0 border-t border-white/[0.05]">
          <div className="flex items-center gap-2 pt-3 pb-2">
            <Layers size={13} className="text-orange-400/60 flex-shrink-0" aria-hidden="true" />
            <p className="text-xs font-medium text-white/50">
              {formatPurchaseLabel(tx)} · {fmt(schedule[0]?.amount)}/parcela
            </p>
          </div>
          <div className="space-y-1.5">
            {schedule.map((item, index) => (
              <div
                key={item.number}
                className={`
                  flex items-center justify-between gap-3
                  rounded-xl px-3 py-2 text-sm
                  bg-white/[0.02] border border-white/[0.04]
                  transition-all duration-300
                  ${open ? 'translate-y-0' : '-translate-y-1'}
                `}
                style={{ transitionDelay: open ? `${index * 40}ms` : '0ms' }}
              >
                <span className="text-white/80 font-medium">
                  Parcela {item.number}/{schedule.length}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-white/40 text-xs mono-number">{fmt(item.amount)}</span>
                  <span
                    className={`
                      text-[11px] font-medium px-2 py-0.5 rounded-lg
                      ${item.paid
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}
                    `}
                  >
                    {item.paid ? 'Paga' : 'Não paga'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
