import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const overlayRef  = useRef(null)
  const firstFocRef = useRef(null)

  // Fecha com ESC + trap focus + bloqueia scroll
  useEffect(() => {
    if (!isOpen) return

    const prevFocus = document.activeElement
    document.body.style.overflow = 'hidden'

    // Foca o primeiro elemento focável
    requestAnimationFrame(() => firstFocRef.current?.focus())

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      // Trap focus dentro do modal
      if (e.key === 'Tab') {
        const focusable = overlayRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable?.length) return
        const first = focusable[0]
        const last  = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last)  { e.preventDefault(); first.focus() }
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
      prevFocus?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxWidths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' }

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" aria-hidden="true" />

      {/* Painel */}
      <div className={`
        relative w-full ${maxWidths[size] ?? maxWidths.md}
        bg-[#111118] border border-white/[0.09] shadow-2xl
        rounded-t-3xl sm:rounded-3xl
        animate-slide-up
        max-h-[92dvh] flex flex-col
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06] flex-shrink-0">
          {/* Drag handle — mobile only */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/15 rounded-full sm:hidden" />
          <h2 id="modal-title" className="text-base font-semibold text-white mt-1 sm:mt-0">
            {title}
          </h2>
          <Button
            ref={firstFocRef}
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={17} />
          </Button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="px-5 py-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
