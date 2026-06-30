import { useState } from 'react'
import {
  Smartphone, Download, CheckCircle2, Share, Plus,
  MoreVertical, Chrome, Apple,
} from 'lucide-react'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import toast from 'react-hot-toast'

function Step({ number, children }) {
  return (
    <li className="flex gap-3 text-sm text-white/70 leading-relaxed">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600/20 border border-brand-500/30 text-brand-400 text-xs font-semibold flex items-center justify-center">
        {number}
      </span>
      <span>{children}</span>
    </li>
  )
}

export default function InstallMobile() {
  const { canInstall, isInstalled, isIos, isStandalone, promptInstall } = usePwaInstall()
  const [installing, setInstalling] = useState(false)

  const handleInstall = async () => {
    setInstalling(true)
    try {
      const ok = await promptInstall()
      if (ok) toast.success('App instalado com sucesso!')
      else toast('Instalação cancelada', { icon: 'ℹ️' })
    } catch {
      toast.error('Não foi possível instalar. Siga as instruções abaixo.')
    } finally {
      setInstalling(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-white">Instalar no celular</h1>
        <p className="text-white/40 text-sm mt-0.5">
          Use o app em tela cheia, como um aplicativo nativo
        </p>
      </div>

      {/* Status */}
      <div className={`
        flex items-center gap-4 p-4 mb-6 rounded-3xl border
        ${isInstalled || isStandalone
          ? 'bg-emerald-500/[0.08] border-emerald-500/20'
          : 'bg-white/[0.03] border-white/[0.06]'
        }
      `}>
        <div className={`
          w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0
          ${isInstalled || isStandalone ? 'bg-emerald-500/15' : 'bg-brand-600/15'}
        `}>
          {isInstalled || isStandalone
            ? <CheckCircle2 size={24} className="text-emerald-400" />
            : <Smartphone size={24} className="text-brand-400" />
          }
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-white">
            {isInstalled || isStandalone ? 'App já instalado' : 'Pronto para instalar'}
          </p>
          <p className="text-sm text-white/40 mt-0.5">
            {isInstalled || isStandalone
              ? 'Você está usando o Assistente Financeiro como app instalado.'
              : 'Instale para acesso rápido na tela inicial do seu celular.'
            }
          </p>
        </div>
      </div>

      {/* Botão Android/Chrome */}
      {canInstall && !isInstalled && (
        <div className="mb-6">
          <Button
            size="lg"
            className="w-full min-h-[48px]"
            loading={installing}
            onClick={handleInstall}
          >
            <Download size={18} />
            Instalar aplicativo
          </Button>
          <p className="text-xs text-white/30 text-center mt-2">
            Disponível no Chrome / Edge / Samsung Internet
          </p>
        </div>
      )}

      {/* Instruções iOS */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Apple size={16} className="text-white/40" />
            <h2 className="text-sm font-semibold text-white">iPhone / iPad (Safari)</h2>
          </div>
        </CardHeader>
        <ol className="space-y-3 list-none p-0 m-0">
          <Step number={1}>
            Abra este site no <strong className="text-white/90">Safari</strong> (não funciona no Chrome iOS).
          </Step>
          <Step number={2}>
            Toque no ícone <Share size={14} className="inline text-brand-400 -mt-0.5" aria-hidden="true" />{' '}
            <strong className="text-white/90">Compartilhar</strong> na barra inferior.
          </Step>
          <Step number={3}>
            Role e toque em <strong className="text-white/90">Adicionar à Tela de Início</strong>
            <Plus size={14} className="inline text-white/50 -mt-0.5" aria-hidden="true" />.
          </Step>
          <Step number={4}>
            Confirme com <strong className="text-white/90">Adicionar</strong> no canto superior direito.
          </Step>
        </ol>
        {isIos && !isInstalled && (
          <p className="text-xs text-brand-400/80 mt-4 p-3 bg-brand-600/10 rounded-xl border border-brand-500/15">
            Detectamos iOS — use o Safari e siga os passos acima.
          </p>
        )}
      </Card>

      {/* Instruções Android */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Chrome size={16} className="text-white/40" />
            <h2 className="text-sm font-semibold text-white">Android (Chrome)</h2>
          </div>
        </CardHeader>
        {canInstall ? (
          <p className="text-sm text-white/60 leading-relaxed">
            Toque no botão <strong className="text-white/90">Instalar aplicativo</strong> acima,
            ou use o menu do Chrome (⋮) e selecione <strong className="text-white/90">Instalar app</strong> ou{' '}
            <strong className="text-white/90">Adicionar à tela inicial</strong>.
          </p>
        ) : (
          <ol className="space-y-3 list-none p-0 m-0">
            <Step number={1}>
              Abra este site no <strong className="text-white/90">Chrome</strong> ou Samsung Internet.
            </Step>
            <Step number={2}>
              Toque no menu <MoreVertical size={14} className="inline text-white/50 -mt-0.5" aria-hidden="true" />{' '}
              (três pontos) no canto superior direito.
            </Step>
            <Step number={3}>
              Selecione <strong className="text-white/90">Instalar app</strong> ou{' '}
              <strong className="text-white/90">Adicionar à tela inicial</strong>.
            </Step>
            <Step number={4}>
              Confirme a instalação. O ícone aparecerá na sua tela inicial.
            </Step>
          </ol>
        )}
      </Card>

      {/* Benefícios */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4">
        <p className="text-xs text-white/30 leading-relaxed">
          <span className="text-white/50 font-medium">Por que instalar?</span>{' '}
          Acesso em tela cheia, ícone na tela inicial, carregamento mais rápido
          e experiência similar a um app nativo — sem precisar baixar da loja.
        </p>
      </div>
    </div>
  )
}
