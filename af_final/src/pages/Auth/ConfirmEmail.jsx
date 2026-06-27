import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ConfirmEmail() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    let isMounted = true
    let countdownTimer = null
    let completed = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) return
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        completed = true
        setStatus('success')

        countdownTimer = setInterval(() => {
          setCountdown(c => {
            if (c <= 1) {
              clearInterval(countdownTimer)
              navigate('/dashboard')
              return 0
            }
            return c - 1
          })
        }, 1000)
      }
    })

    const timeout = setTimeout(() => {
      if (!isMounted || completed) return
      setStatus('error')
    }, 5000)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
      clearInterval(countdownTimer)
    }
  }, [navigate])

  return (
    <div className="min-h-screen min-h-dvh bg-[#09090e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center animate-fade-in">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-3xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-6">
              <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-white">Confirmando email...</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Conta criada com sucesso!</h2>
            <p className="text-white/40 text-sm">
              Redirecionando para o painel em{' '}
              <span className="text-brand-400 font-semibold">{countdown}</span>{' '}
              segundos...
            </p>
            <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-1000"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }}
              />
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-3xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
              <XCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Link inválido ou expirado</h2>
            <p className="text-white/40 text-sm mb-6">
              Tente cadastrar novamente ou solicite um novo link de confirmação.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="text-brand-400 hover:text-brand-300 transition-colors text-sm font-medium"
            >
              Voltar ao login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
