import { useEffect, useState } from 'react'
import { useForm }            from 'react-hook-form'
import { z }                  from 'zod'
import { zodResolver }        from '@hookform/resolvers/zod'
import { User, Lock, Download, Trash2, Shield, Landmark } from 'lucide-react'
import { useAuth }            from '../../hooks/useAuth'
import { updateProfile, updatePassword, deleteAccount, exportUserData } from '../../services/auth'
import { requestPluggyConnectToken } from '../../services/pluggy'
import { Card, CardHeader }   from '../../components/ui/Card'
import { Input }              from '../../components/ui/Input'
import { Button }             from '../../components/ui/Button'
import { PasswordStrength }   from '../../components/ui/PasswordStrength'
import { ConfirmDialog }      from '../../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

const profileSchema = z.object({
  name:  z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
})

const passwordSchema = z.object({
  newPassword:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
})

export default function Profile() {
  const { user }                = useAuth()
  const [savingProfile, setSavingProfile]   = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [exporting,  setExporting]          = useState(false)
  const [deleting,   setDeleting]           = useState(false)
  const [watchPwd,   setWatchPwd]           = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [connectingBank, setConnectingBank]       = useState(false)

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name:  user?.user_metadata?.name || '',
      email: user?.email || '',
    },
  })

  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) })

  // Atualiza form quando usuário carrega
  useEffect(() => {
    if (!user) return
    profileForm.reset({
      name:  user?.user_metadata?.name || '',
      email: user?.email || '',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handleSaveProfile = async (data) => {
    setSavingProfile(true)
    try {
      await updateProfile(data)
      toast.success('Perfil atualizado')
    } catch (e) { toast.error(e.message) }
    finally { setSavingProfile(false) }
  }

  const handleSavePassword = async (data) => {
    setSavingPassword(true)
    try {
      await updatePassword(data.newPassword)
      passwordForm.reset()
      setWatchPwd('')
      toast.success('Senha alterada com sucesso')
    } catch (e) { toast.error(e.message) }
    finally { setSavingPassword(false) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportUserData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `financeiro-dados-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Dados exportados')
    } catch { toast.error('Erro ao exportar') }
    finally { setExporting(false) }
  }

  const handleConnectBank = async () => {
    setConnectingBank(true)
    try {
      const result = await requestPluggyConnectToken()
      if (result.ok) {
        toast.success('Conexão iniciada — em breve o widget Pluggy abrirá aqui.')
        return
      }
      if (result.status === 501) {
        toast('Open Finance em breve — a integração Pluggy ainda está em desenvolvimento.', { icon: '🏦' })
        return
      }
      if (result.status === 503) {
        toast.error('Open Finance indisponível no momento. Tente novamente mais tarde.')
        return
      }
      toast.error(result.message ?? 'Não foi possível iniciar a conexão.')
    } catch (e) {
      toast.error(e.message ?? 'Erro ao conectar banco')
    } finally {
      setConnectingBank(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setConfirmDeleteOpen(false)
    try {
      await deleteAccount()
      // deleteAccount chama signOut internamente — redireciona automaticamente
    } catch (e) {
      toast.error(e.message)
      setDeleting(false)
    }
  }

  const initials = user?.user_metadata?.name
    ? user.user_metadata.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
    : (user?.email?.[0]?.toUpperCase() ?? 'U')

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-white">Perfil</h1>
        <p className="text-white/40 text-sm mt-0.5">Gerencie suas informações e configurações</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-white/[0.03] border border-white/[0.06] rounded-3xl">
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-brand-600/25 border border-brand-500/20 flex items-center justify-center text-xl sm:text-2xl font-semibold text-brand-400 flex-shrink-0"
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{user?.user_metadata?.name || 'Usuário'}</p>
          <p className="text-sm text-white/40 truncate">{user?.email}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="text-xs text-white/30">Email verificado</span>
          </div>
        </div>
      </div>

      {/* Dados pessoais */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User size={15} className="text-white/40" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Dados pessoais</h2>
          </div>
        </CardHeader>
        <form onSubmit={profileForm.handleSubmit(handleSaveProfile)} className="space-y-4" noValidate>
          <Input
            label="Nome completo"
            placeholder="Seu nome"
            autoComplete="name"
            error={profileForm.formState.errors.name?.message}
            {...profileForm.register('name')}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            error={profileForm.formState.errors.email?.message}
            {...profileForm.register('email')}
          />
          <Button type="submit" loading={savingProfile} size="md">
            Salvar alterações
          </Button>
        </form>
      </Card>

      {/* Alterar senha */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-white/40" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Alterar senha</h2>
          </div>
        </CardHeader>
        <form onSubmit={passwordForm.handleSubmit(handleSavePassword)} className="space-y-4" noValidate>
          <div>
            <Input
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword', {
                onChange: (e) => setWatchPwd(e.target.value),
              })}
            />
            <PasswordStrength password={watchPwd} />
          </div>
          <Input
            label="Confirmar nova senha"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a senha"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register('confirmPassword')}
          />
          <Button type="submit" loading={savingPassword} size="md">
            Alterar senha
          </Button>
        </form>
      </Card>

      {/* Open Finance */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Landmark size={15} className="text-white/40" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Open Finance</h2>
          </div>
        </CardHeader>
        <div className="space-y-3">
          <p className="text-sm text-white/50 leading-relaxed">
            Conecte sua conta bancária via Open Finance (Pluggy) para importar saldos e movimentações automaticamente.
            Os dados preencherão o saldo em conta, compras do cartão, assinaturas e gastos recorrentes no Dashboard.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white/[0.02] rounded-2xl">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Conectar banco</p>
              <p className="text-xs text-white/30 mt-0.5">Importação segura — credenciais nunca passam pelo app</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleConnectBank}
              loading={connectingBank}
              aria-label="Conectar banco via Open Finance"
            >
              <Landmark size={14} aria-hidden="true" />
              <span>Conectar banco</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Privacidade LGPD */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield size={15} className="text-white/40" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Privacidade (LGPD)</h2>
          </div>
        </CardHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 p-4 bg-white/[0.02] rounded-2xl">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Exportar meus dados</p>
              <p className="text-xs text-white/30 mt-0.5">Baixe tudo em formato JSON</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting} aria-label="Exportar dados pessoais">
              <Download size={14} />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 p-4 bg-red-500/[0.05] border border-red-500/10 rounded-2xl">
            <div className="min-w-0">
              <p className="text-sm font-medium text-red-400">Excluir conta</p>
              <p className="text-xs text-white/30 mt-0.5">Apaga todos os dados permanentemente</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDeleteOpen(true)}
              loading={deleting}
              aria-label="Excluir conta permanentemente"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Rodapé segurança */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
        <p className="text-xs text-white/30 leading-relaxed">
          <span className="text-white/50 font-medium">🔒 Segurança:</span>{' '}
          Dados criptografados com AES-256 em repouso e TLS 1.3 em trânsito.
          Senhas nunca armazenadas em texto puro. Sessões expiram em 1 hora.
          Protegido pela LGPD (Lei 13.709/2018).
        </p>
      </div>

      {/* Confirm delete — substitui window.confirm() */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Excluir conta permanentemente"
        message="Todos os seus dados (transações, gastos, categorias) serão apagados e não poderão ser recuperados. Esta ação é irreversível."
        confirmLabel="Sim, excluir minha conta"
        cancelLabel="Cancelar"
        danger
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  )
}
