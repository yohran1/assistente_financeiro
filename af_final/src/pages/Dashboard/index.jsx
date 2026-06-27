import { lazy, Suspense, useState } from 'react'
import { Pencil, TrendingUp, TrendingDown, Wallet, CreditCard, Plus, Calendar } from 'lucide-react'
import { useFinances }       from '../../hooks/useFinances'
import { Card, CardHeader }  from '../../components/ui/Card'
import { Button }            from '../../components/ui/Button'
import { Modal }             from '../../components/ui/Modal'
import { CurrencyInput }     from '../../components/ui/CurrencyInput'
import { ChatWidget }        from '../../components/chat/ChatWidget'
import { TransactionModal }  from './TransactionModal'
import toast from 'react-hot-toast'

const ExpensePieChart = lazy(() => import('../../components/charts/ExpensePieChart').then(m => ({ default: m.ExpensePieChart })))
const BalanceBarChart = lazy(() => import('../../components/charts/BalanceBarChart').then(m => ({ default: m.BalanceBarChart })))

const ChartLoader = () => (
  <div className="h-56 bg-white/[0.03] rounded-2xl flex items-center justify-center">
    <div className="text-white/30 text-sm">Carregando...</div>
  </div>
)

const fmt = (v) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'
}

function BalanceCard({ label, value, icon: Icon, onEdit, color = 'brand' }) {
  const palettes = {
    brand:   { card: 'from-brand-600/15 to-transparent border-brand-500/15', icon: 'bg-brand-500/15 text-brand-400' },
    emerald: { card: 'from-emerald-600/15 to-transparent border-emerald-500/15', icon: 'bg-emerald-500/15 text-emerald-400' },
    orange:  { card: 'from-orange-600/15 to-transparent border-orange-500/15', icon: 'bg-orange-500/15 text-orange-400' },
  }
  const p = palettes[color] ?? palettes.brand
  return (
    <div className={`rounded-3xl p-5 bg-gradient-to-br border ${p.card} relative`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${p.icon}`}>
          <Icon size={18} aria-hidden="true" />
        </div>
        <button
          onClick={onEdit}
          aria-label={`Editar ${label}`}
          className="p-2 -mt-1 -mr-1 rounded-xl hover:bg-white/10 text-white/25 hover:text-white/60 transition-all touch-press"
        >
          <Pencil size={13} />
        </button>
      </div>
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-semibold text-white mono-number">{fmt(value)}</p>
    </div>
  )
}

function StatCard({ label, value, positive }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        {positive
          ? <TrendingUp  size={13} className="text-emerald-400 flex-shrink-0" />
          : <TrendingDown size={13} className="text-red-400 flex-shrink-0" />
        }
        <span className="text-xs text-white/40 truncate">{label}</span>
      </div>
      <p className={`text-base font-semibold mono-number ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
        {fmt(value)}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const { profile, summary, loading, error, month, year, setMonth, setYear, updateBalance, updateCreditCard, addTransaction } = useFinances()

  const [editBalance,    setEditBalance]    = useState(false)
  const [editCard,       setEditCard]       = useState(false)
  const [addTxModal,     setAddTxModal]     = useState(false)
  const [newBalance,     setNewBalance]     = useState(null)
  const [newCardBalance, setNewCardBalance] = useState(null)
  const [newCardLimit,   setNewCardLimit]   = useState(null)
  const [saving,         setSaving]         = useState(false)

  const balance   = summary ? summary.totalIncome - summary.totalExpenses - summary.totalInvestments - summary.totalSavings : 0
  const monthName = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  const saveBalance = async () => {
    if (newBalance == null) { toast.error('Informe o saldo'); return }
    setSaving(true)
    try { await updateBalance(newBalance); setEditBalance(false); toast.success('Saldo atualizado') }
    catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const saveCard = async () => {
    if (newCardBalance == null && newCardLimit == null) { toast.error('Preencha ao menos um campo'); return }
    setSaving(true)
    try { await updateCreditCard({ balance: newCardBalance, limit: newCardLimit }); setEditCard(false); toast.success('Cartão atualizado') }
    catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 animate-pulse">
      <div className="skeleton h-8 w-40 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_,i) => <div key={i} className="skeleton h-28 rounded-3xl" />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
      </div>
      <div className="skeleton h-64 rounded-3xl" />
    </div>
  )

  if (error) return (
    <div className="p-8 text-center">
      <p className="text-red-400 mb-4">Erro ao carregar: {error}</p>
      <Button onClick={() => window.location.reload()} variant="secondary">Tentar novamente</Button>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-white/40 text-sm mt-0.5 capitalize">{monthName}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Seletor de mês — custom select cross-browser */}
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <select
              value={`${year}-${month}`}
              onChange={(e) => { const [y,m] = e.target.value.split('-'); setYear(+y); setMonth(+m) }}
              aria-label="Selecionar mês"
              className="pl-8 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(year, i)
                return <option key={i} value={`${year}-${i+1}`}>{d.toLocaleString('pt-BR', { month: 'long' })}</option>
              })}
            </select>
          </div>
          <Button onClick={() => setAddTxModal(true)} size="md">
            <Plus size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Nova transação</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Cards de saldo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <BalanceCard label="Saldo em conta"   value={profile?.account_balance}    icon={Wallet}     color="emerald" onEdit={() => { setNewBalance(profile?.account_balance); setEditBalance(true) }} />
        <BalanceCard label="Cartão de crédito" value={profile?.credit_card_balance} icon={CreditCard} color="orange"  onEdit={() => { setNewCardBalance(profile?.credit_card_balance); setNewCardLimit(profile?.credit_card_limit); setEditCard(true) }} />
        <BalanceCard label="Saldo do mês"     value={balance}                      icon={TrendingUp}  color="brand"   onEdit={() => {}} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
        <StatCard label="Receitas"      value={summary?.totalIncome}      positive />
        <StatCard label="Gastos"        value={summary?.totalExpenses}    positive={false} />
        <StatCard label="Investimentos" value={summary?.totalInvestments} positive />
        <StatCard label="Poupança"      value={summary?.totalSavings}     positive />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">Gastos por categoria</h2>
            <p className="text-xs text-white/30">Distribuição do mês</p>
          </CardHeader>
          <Suspense fallback={<ChartLoader />}>
            <ExpensePieChart data={summary?.byCategory} />
          </Suspense>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">Resumo financeiro</h2>
            <p className="text-xs text-white/30">Entradas vs saídas</p>
          </CardHeader>
          <Suspense fallback={<ChartLoader />}>
            <BalanceBarChart summary={summary} />
          </Suspense>
        </Card>
      </div>

      {/* Modais */}
      <Modal isOpen={editBalance} onClose={() => setEditBalance(false)} title="Atualizar saldo em conta">
        <div className="space-y-4">
          <CurrencyInput label="Saldo atual da conta" value={newBalance} onChange={setNewBalance} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setEditBalance(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveBalance}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editCard} onClose={() => setEditCard(false)} title="Atualizar cartão de crédito">
        <div className="space-y-4">
          <CurrencyInput label="Fatura atual" value={newCardBalance} onChange={setNewCardBalance} />
          <CurrencyInput label="Limite do cartão" value={newCardLimit} onChange={setNewCardLimit} />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setEditCard(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveCard}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {addTxModal && (
        <TransactionModal
          onClose={() => setAddTxModal(false)}
          onSave={async (data) => { await addTransaction(data); setAddTxModal(false); toast.success('Transação adicionada') }}
        />
      )}

      <ChatWidget />
    </div>
  )
}
