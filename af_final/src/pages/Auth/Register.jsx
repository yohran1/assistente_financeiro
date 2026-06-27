import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wallet, Mail } from 'lucide-react'
import { signUp } from '../../services/auth'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { PasswordStrength } from '../../components/ui/PasswordStrength'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
})

const STEPS = { FORM: 'form', SUCCESS: 'success' }

export default function Register() {
  const [step, setStep] = useState(STEPS.FORM)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const watchedPassword = watch('password', '')

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await signUp(data)
      setEmail(data.email)
      setStep(STEPS.SUCCESS)
    } catch (err) {
      toast.error(err.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  if (step === STEPS.SUCCESS) {
    return (
      <div className="min-h-screen min-h-dvh bg-[#09090e] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center animate-slide-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 mb-6">
            <Mail size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Confirme seu email</h2>
          <p className="text-white/50 text-sm leading-relaxed mb-2">
            Enviamos um link de confirmação para
          </p>
          <p className="text-brand-400 font-medium mb-6">{email}</p>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-5">
            <p className="text-white/40 text-sm leading-relaxed">
              Acesse seu email, clique no link de confirmação e sua conta estará pronta para uso.
              Não esqueça de verificar a pasta de spam.
            </p>
          </div>
          <p className="text-center text-sm text-white/40 mt-6">
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-dvh bg-[#09090e] flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-brand-600 mb-4 shadow-lg shadow-brand-600/30">
            <Wallet size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Criar sua conta</h1>
          <p className="text-white/40 text-sm mt-1">Gratuito, rápido e seguro</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Seu nome"
              placeholder="João Silva"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <div>
              <Input
                label="Senha"
                type="password"
                placeholder="Mínimo 8 caracteres"
                error={errors.password?.message}
                {...register('password')}
              />
              <PasswordStrength password={watchedPassword} />
            </div>
            <Input
              label="Confirmar senha"
              type="password"
              placeholder="Repita a senha"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <p className="text-xs text-white/30 leading-relaxed">
              Ao criar conta, você concorda com nossa Política de Privacidade.
              Seus dados são protegidos pela LGPD.
            </p>

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Criar conta grátis
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          Já tem conta?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
