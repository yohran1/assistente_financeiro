import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { onPwaNeedRefresh, applyPwaUpdate } from '../lib/pwaUpdate'

export function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => onPwaNeedRefresh(() => setVisible(true)), [])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="
        fixed z-[60] inset-x-4
        bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]
        md:bottom-6 md:left-auto md:right-6 md:max-w-sm
        flex items-center gap-3
        bg-[#1a1a2e] border border-white/10
        rounded-2xl px-4 py-3 shadow-2xl
        animate-slide-up
      "
    >
      <RefreshCw size={18} className="text-brand-400 flex-shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm text-white/90">Nova versão disponível</p>
      <button
        type="button"
        onClick={() => applyPwaUpdate()}
        className="
          px-3 py-1.5 rounded-xl text-xs font-semibold
          bg-brand-600 hover:bg-brand-500 text-white
          transition-colors touch-press
        "
      >
        Atualizar
      </button>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Fechar aviso de atualização"
        className="p-1.5 rounded-lg text-white/40 hover:text-white/70 transition-colors"
      >
        ×
      </button>
    </div>
  )
}
