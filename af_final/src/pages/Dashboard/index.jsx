import { lazy, Suspense, useState } from 'react'
import { Pencil, TrendingUp, TrendingDown, Wallet, CreditCard, Plus, Calendar, Trash2 } from 'lucide-react'
import { useFinances }       from '../../hooks/useFinances'
import { Card, CardHeader }  from '../../components/ui/Card'
import { Button }            from '../../components/ui/Button'
import { Modal }             from '../../components/ui/Modal'
import { Input }             from '../../components/ui/Input'
import { CurrencyInput }     from '../../components/ui/CurrencyInput'
import { ChatWidget }        from '../../components/chat/ChatWidget'
import { TransactionModal }  from './TransactionModal'
import { PurchaseModal }     from './PurchaseModal'
import { getCreditCardBillingStatus } from '../../lib/creditCardBilling'
import { formatPurchaseLabel } from '../../lib/balanceImpact'
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

function StatusBar({ label, pct, color, overdue }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/35 uppercase tracking-wide">{label}</span>
        <span className={`text-[10px] ${overdue ? 'text-red-400' : 'text-white/40'}`}>{pct.label}</span>
      </div>
      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct.pct}%`, background: overdue ? '#f87171' : color }}
        />
      </div>
    </div>
  )
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
        {onEdit && (
          <button
            onClick={onEdit}
            aria-label={`Editar ${label}`}
            className="p-2 -mt-1 -mr-1 rounded-xl hover:bg-white/10 text-white/25 hover:text-white/60 transition-all touch-press"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-semibold text-white mono-number">{fmt(value)}</p>
    </div>
  )
}

function CreditCardCard({ value, closingDay, dueDay, onEdit }) {
  const billing = getCreditCardBillingStatus({ closingDay, dueDay })

  return (
    <div className="rounded-3xl p-5 bg-gradient-to-br from-orange-600/15 to-transparent border border-orange-500/15 relative">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-orange-500/15 text-orange-400">
          <CreditCard size={18} aria-hidden="true" />
        </div>
        <button
          onClick={onEdit}
          aria-label="Editar cartão de crédito"
          className="p-2 -mt-1 -mr-1 rounded-xl hover:bg-white/10 text-white/25 hover:text-white/60 transition-all touch-press"
        >
          <Pencil size={13} />
        </button>
      </div>
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">Cartão de crédito</p>
      <p className="text-xl sm:text-2xl font-semibold text-white mono-number mb-3">{fmt(value)}</p>
      {billing.closing && billing.due ? (
        <div className="space-y-2.5">
          <StatusBar label="Fecha fatura" pct={billing.closing} color="#fb923c" />
          <StatusBar label="Prazo final" pct={billing.due} color="#fbbf24" overdue={billing.due.overdue} />
        </div>
      ) : (
        <p className="text-[11px] text-white/30">Configure fechamento e vencimento no editar</p>
      )}
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

function WalletsPanel({ wallets, onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState(null)
  const [includeInTotal, setIncludeInTotal] = useState(true)
  const [saving, setSaving] = useState(false)

  const saveWallet = async () => {
    if (!name.trim()) { toast.error('Nome da carteira obrigatório'); return }
    setSaving(true)
    try {
      await onAdd({ name: name.trim(), balance: balance ?? 0, includeInTotal })
      setAdding(false)
      setName('')
      setBalance(null)
      setIncludeInTotal(true)
      toast.success('Sub-carteira criada')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-white/80">Sub-carteiras</h2>
        <Button size="sm" variant="secondary" onClick={() => setAdding(v => !v)}>
          <Plus size={14} /> Criar sub-carteira
        </Button>
      </div>
      {adding && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-3 space-y-3">
          <Input label="Nome" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Multibenefício" />
          <CurrencyInput label="Saldo" value={balance} onChange={setBalance} />
          <label className="flex items-center justify-between text-sm text-white/70">
            <span>Somar ao saldo atual</span>
            <button
              type="button"
              role="switch"
              aria-checked={includeInTotal}
              onClick={() => setIncludeInTotal(v => !v)}
              className={`w-11 h-6 rounded-full transition-colors ${includeInTotal ? 'bg-brand-500' : 'bg-white/20'} relative`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${includeInTotal ? 'left-5' : 'left-0.5'}`} />
            </button>
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveWallet}>Salvar</Button>
          </div>
        </div>
      )}
      {wallets.length === 0 ? (
        <p className="text-xs text-white/30">Nenhuma sub-carteira. Ex.: cartão multibenefício.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {wallets.map(w => (
            <div key={w.id} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5">
              <div>
                <p className="text-sm text-white">{w.name}</p>
                <p className="text-xs text-white/35">{w.include_in_total ? 'Soma ao saldo' : 'Separada'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold mono-number text-white">{fmt(w.balance)}</span>
                <button
                  type="button"
                  aria-label={`Alternar somar ${w.name}`}
                  onClick={() => onUpdate(w.id, { includeInTotal: !w.include_in_total })}
                  className={`text-[10px] px-2 py-1 rounded-lg border ${w.include_in_total ? 'border-brand-500/40 text-brand-300' : 'border-white/10 text-white/40'}`}
                >
                  {w.include_in_total ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${w.name}`}
                  onClick={() => onDelete(w.id)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const {
    profile, summary, wallets, walletsIncludedTotal, loading, error,
    month, year, setMonth, setYear,
    updateBalance, updateCreditCard, addTransaction, addWallet, updateWallet, deleteWallet,
  } = useFinances()

  const [editBalance,    setEditBalance]    = useState(false)
  const [editCard,       setEditCard]       = useState(false)
  const [addTxModal,     setAddTxModal]     = useState(false)
  const [addPurchase,    setAddPurchase]    = useState(false)
  const [newBalance,     setNewBalance]     = useState(null)
  const [newCardBalance, setNewCardBalance] = useState(null)
  const [newCardLimit,   setNewCardLimit]   = useState(null)
  const [newClosingDay,  setNewClosingDay]  = useState('')
  const [newDueDay,      setNewDueDay]      = useState('')
  const [saving,         setSaving]         = useState(false)

  // Saldo líquido = conta (+ sub-carteiras ON) − cartão
  const accountTotal = (Number(profile?.account_balance) || 0) + walletsIncludedTotal
  const netBalance = accountTotal - (Number(profile?.credit_card_balance) || 0)
  const monthName  = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  const openCardEdit = () => {
    setNewCardBalance(profile?.credit_card_balance)
    setNewCardLimit(profile?.credit_card_limit)
    setNewClosingDay(profile?.credit_card_closing_day ?? '')
    setNewDueDay(profile?.credit_card_due_day ?? '')
    setEditCard(true)
  }

  const saveBalance = async () => {
    if (newBalance == null) { toast.error('Informe o saldo'); return }
    setSaving(true)
    try { await updateBalance(newBalance); setEditBalance(false); toast.success('Saldo atualizado') }
    catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const saveCard = async () => {
    const hasValue = newCardBalance != null || newCardLimit != null
    const hasDates = newClosingDay !== '' || newDueDay !== ''
    if (!hasValue && !hasDates) { toast.error('Preencha ao menos um campo'); return }
    setSaving(true)
    try {
      await updateCreditCard({
        balance: newCardBalance,
        limit: newCardLimit,
        closingDay: newClosingDay !== '' ? newClosingDay : undefined,
        dueDay: newDueDay !== '' ? newDueDay : undefined,
      })
      setEditCard(false)
      toast.success('Cartão atualizado')
    } catch (e) { toast.error(e.message) }
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
          <Button onClick={() => setAddPurchase(true)} size="md" variant="secondary">
            <Plus size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Adicionar compra</span>
          </Button>
          <Button onClick={() => setAddTxModal(true)} size="md">
            <Plus size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Nova transação</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      {/* Cards de saldo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <BalanceCard label="Saldo em conta" value={accountTotal} icon={Wallet} color="emerald" onEdit={() => { setNewBalance(profile?.account_balance); setEditBalance(true) }} />
        <CreditCardCard
          value={profile?.credit_card_balance}
          closingDay={profile?.credit_card_closing_day}
          dueDay={profile?.credit_card_due_day}
          onEdit={openCardEdit}
        />
        <BalanceCard label="Saldo líquido" value={netBalance} icon={TrendingUp} color="brand" />
      </div>

      <WalletsPanel
        wallets={wallets}
        onAdd={addWallet}
        onUpdate={updateWallet}
        onDelete={async (id) => { await deleteWallet(id); toast.success('Sub-carteira removida') }}
      />

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

      {summary?.items?.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">Gastos do mês (detalhe)</h2>
            <p className="text-xs text-white/30">Avulsas e parceladas — valores já descontam do saldo em conta</p>
          </CardHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {summary.items.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-white/[0.04] last:border-0">
                <div className="min-w-0">
                  <p className="text-white truncate">{item.description}{item.store ? ` · ${item.store}` : ''}</p>
                  <p className="text-[11px] text-white/35">
                    {item.purchaseType === 'installment'
                      ? `${formatPurchaseLabel(item)} · ${Number(item.installmentAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/parcela`
                      : 'Avulsa'}
                  </p>
                </div>
                <span className="text-red-400 mono-number flex-shrink-0 ml-2">
                  -{fmt(item.purchaseType === 'installment' ? item.installmentAmount || item.amount : item.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

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
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Dia de fechamento"
              type="number"
              min={1}
              max={31}
              placeholder="Ex: 5"
              value={newClosingDay}
              onChange={e => setNewClosingDay(e.target.value)}
              hint="Dia em que a fatura fecha"
            />
            <Input
              label="Dia de vencimento"
              type="number"
              min={1}
              max={31}
              placeholder="Ex: 12"
              value={newDueDay}
              onChange={e => setNewDueDay(e.target.value)}
              hint="Dia limite para pagamento"
            />
          </div>
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

      {addPurchase && (
        <PurchaseModal
          onClose={() => setAddPurchase(false)}
          onSave={async (data) => { await addTransaction(data); setAddPurchase(false); toast.success('Compra registrada') }}
        />
      )}

      <ChatWidget />
    </div>
  )
}
