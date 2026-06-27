/**
 * Diálogo de confirmação nativo substituído por um modal acessível.
 * Substitui window.confirm() que é bloqueado em alguns ambientes PWA/iOS.
 */
import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirmar ação',
  message = 'Tem certeza?',
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  danger = false,
}) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    // Foca cancelar por padrão — padrão de segurança
    setTimeout(() => cancelRef.current?.focus(), 50)
    const handleEsc = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative bg-[#111118] border border-white/[0.1] rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto ${danger ? 'bg-red-500/15' : 'bg-brand-500/15'}`}>
          <AlertTriangle size={22} className={danger ? 'text-red-400' : 'text-brand-400'} />
        </div>
        <h2 id="confirm-title" className="text-base font-semibold text-white text-center mb-2">{title}</h2>
        <p  id="confirm-message" className="text-sm text-white/50 text-center leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3">
          <Button
            ref={cancelRef}
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
