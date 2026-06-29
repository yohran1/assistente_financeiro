import { useState } from 'react'
import { Plus, Trash2, Pencil, Search, RefreshCw, Calendar } from 'lucide-react'
import { useFinances }          from '../../hooks/useFinances'
import { Button }               from '../../components/ui/Button'
import { Input }                from '../../components/ui/Input'
import { Select }               from '../../components/ui/Select'
import { Modal }                from '../../components/ui/Modal'
import { CurrencyInput }        from '../../components/ui/CurrencyInput'
import { ConfirmDialog }        from '../../components/ui/ConfirmDialog'
import { addRecurringExpense, deleteRecurringExpense } from '../../services/finances'
import { PurchaseModal } from '../Dashboard/PurchaseModal'
import { formatPurchaseLabel } from '../../lib/balanceImpact'
import toast from 'react-hot-toast'

const TYPE_LABELS = {
  income:     { label: 'Receita',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/20' },
  expense:    { label: 'Gasto',        color: 'text-red-400',     bg: 'bg-red-500/10 border border-red-500/20'         },
  investment: { label: 'Investimento', color: 'text-purple-400',  bg: 'bg-purple-500/10 border border-purple-500/20'   },
  saving:     { label: 'Poupança',     color: 'text-blue-400',    bg: 'bg-blue-500/10 border border-blue-500/20'       },
}

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Expenses() {
  const {
    transactions, recurringExpenses, categories,
    loading, deleteTransaction, updateTransaction,
    refresh, addTransaction,
  } = useFinances()

  const [search,        setSearch]        = useState('')
  const [filterType,    setFilterType]    = useState('all')
  const [editTx,        setEditTx]        = useState(null)
  const [addPurchase,  setAddPurchase]  = useState(false)
  const [addRecurring, setAddRecurring] = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [activeTab,     setActiveTab]     = useState('transactions')
  const [confirmDelete, setConfirmDelete] = useState(null) // { id, type }

  // Campos do modal de edição
  const [editDesc,   setEditDesc]   = useState('')
  const [editAmount, setEditAmount] = useState(null)
  const [editType,   setEditType]   = useState('expense')
  const [editCat,    setEditCat]    = useState('')
  const [editDate,   setEditDate]   = useState('')

  // Campos de gasto recorrente
  const [recDesc,   setRecDesc]   = useState('')
  const [recAmount, setRecAmount] = useState(null)
  const [recDay,    setRecDay]    = useState('')
  const [recCat,    setRecCat]    = useState('')

  const [editStore, setEditStore] = useState('')
  const [editPurchaseType, setEditPurchaseType] = useState('one_off')
  const [editInstallmentsTotal, setEditInstallmentsTotal] = useState('')
  const [editInstallmentsPaid, setEditInstallmentsPaid] = useState('0')
  const [editInstallmentAmount, setEditInstallmentAmount] = useState(null)

  const filtered = transactions.filter(tx => {
    const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase())
    const matchType   = filterType === 'all' || tx.type === filterType
    const matchTab    = activeTab !== 'installments' || tx.purchase_type === 'installment'
    return matchSearch && matchType && matchTab
  })

  const openEdit = (tx) => {
    setEditTx(tx)
    setEditDesc(tx.description)
    setEditAmount(Number(tx.amount))
    setEditType(tx.type)
    setEditCat(tx.category_id || '')
    setEditDate(tx.date)
    setEditStore(tx.store || '')
    setEditPurchaseType(tx.purchase_type || 'one_off')
    setEditInstallmentsTotal(tx.installments_total != null ? String(tx.installments_total) : '')
    setEditInstallmentsPaid(String(tx.installments_paid ?? 0))
    setEditInstallmentAmount(tx.installment_amount != null ? Number(tx.installment_amount) : null)
  }

  const handleSaveEdit = async () => {
    if (!editTx) return
    if (!editDesc.trim())                  { toast.error('Descrição obrigatória'); return }
    if (!editAmount || editAmount <= 0)    { toast.error('Valor deve ser positivo'); return }
    if (!editDate)                         { toast.error('Data obrigatória'); return }
    setSaving(true)
    try {
      await updateTransaction(editTx.id, {
        description: editDesc, amount: editAmount,
        type: editType, categoryId: editCat || null, date: editDate,
        store: editStore || null,
        purchaseType: editPurchaseType,
        installmentsTotal: editPurchaseType === 'installment' ? editInstallmentsTotal : null,
        installmentsPaid: editPurchaseType === 'installment' ? editInstallmentsPaid : 0,
        installmentAmount: editPurchaseType === 'installment' ? editInstallmentAmount : null,
        inProgress: editPurchaseType === 'installment' && Number(editInstallmentsPaid) > 0,
      })
      setEditTx(null)
      toast.success('Transação atualizada')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = (id) => setConfirmDelete({ id, type: 'transaction' })
  const handleDeleteRecurring = (id) => setConfirmDelete({ id, type: 'recurring' })

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return
    try {
      if (confirmDelete.type === 'transaction') {
        await deleteTransaction(confirmDelete.id)
        toast.success('Transação removida')
      } else {
        await deleteRecurringExpense(confirmDelete.id)
        await refresh()
        toast.success('Gasto recorrente removido')
      }
    } catch (e) { toast.error(e.message) }
    finally { setConfirmDelete(null) }
  }

  const handleAddRecurring = async () => {
    if (!recDesc.trim())                { toast.error('Descrição obrigatória'); return }
    if (!recAmount || recAmount <= 0)   { toast.error('Valor deve ser positivo'); return }
    if (!recDay || recDay < 1 || recDay > 31) { toast.error('Dia deve ser entre 1 e 31'); return }
    setSaving(true)
    try {
      await addRecurringExpense({ description: recDesc, amount: recAmount, categoryId: recCat || null, dayOfMonth: recDay })
      await refresh()
      setAddRecurring(false)
      setRecDesc(''); setRecAmount(null); setRecDay(''); setRecCat('')
      toast.success('Gasto recorrente adicionado')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Gastos</h1>
          <p className="text-white/40 text-sm mt-0.5">{filtered.length} transações</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={refresh} aria-label="Atualizar">
            <RefreshCw size={15} />
          </Button>
          <Button size="md" variant="secondary" onClick={() => setAddPurchase(true)}>
            <Plus size={15} />
            <span className="hidden sm:inline">Compra</span>
          </Button>
          <Button size="md" onClick={() => setAddRecurring(true)}>
            <Plus size={15} />
            <span className="hidden sm:inline">Recorrente</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white/[0.03] rounded-2xl p-1 w-fit" role="tablist">
        {[
          { key: 'transactions', label: 'Transações' },
          { key: 'installments', label: 'Parceladas' },
          { key: 'recurring',    label: 'Recorrentes' },
        ].map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`
              px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
              min-h-[36px] touch-press
              ${activeTab === key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Aba: Transações / Parceladas */}
      {(activeTab === 'transactions' || activeTab === 'installments') && (
        <>
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                placeholder="Buscar transação..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Buscar transações"
                className="
                  w-full pl-10 pr-4 py-3 rounded-xl min-h-[48px]
                  bg-white/[0.05] border border-white/10
                  text-white placeholder:text-white/30
                  focus:outline-none focus:ring-2 focus:ring-brand-500/40
                  transition-all
                "
                style={{ fontSize: '16px' }}
              />
            </div>
            <Select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              aria-label="Filtrar por tipo"
              className="sm:w-44"
            >
              <option value="all">Todos os tipos</option>
              <option value="income">Receitas</option>
              <option value="expense">Gastos</option>
              <option value="investment">Investimentos</option>
              <option value="saving">Poupança</option>
            </Select>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_,i) => <div key={i} className="skeleton h-[68px] rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-white/20">
              <p className="text-base mb-1">Nenhuma transação encontrada</p>
              <p className="text-sm">Adicione transações pelo Dashboard</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(tx => {
                const t = TYPE_LABELS[tx.type] || TYPE_LABELS.expense
                const dateStr = tx.date
                  ? new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')
                  : ''
                return (
                  <div key={tx.id} className="
                    flex items-center gap-3 sm:gap-4
                    bg-white/[0.03] border border-white/[0.06] rounded-2xl
                    px-3.5 py-3 sm:px-4 sm:py-3.5
                    hover:bg-white/[0.05] transition-all group
                  ">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg flex-shrink-0 ${t.bg} ${t.color}`}>
                      {t.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{tx.description}</p>
                      <p className="text-xs text-white/30 mt-0.5 flex items-center gap-1">
                        <Calendar size={10} aria-hidden="true" />
                        {dateStr}{tx.categories?.name && ` · ${tx.categories.name}`}
                        {tx.purchase_type === 'installment' && (
                          <span className="text-orange-400/80"> · {formatPurchaseLabel(tx)}</span>
                        )}
                        {tx.store && ` · ${tx.store}`}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold mono-number flex-shrink-0 ${t.color}`}>
                      {tx.type === 'expense' ? '-' : '+'}{fmt(tx.amount)}
                    </span>
                    {/* Ações: sempre visíveis no mobile, hover no desktop */}
                    <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(tx)}
                        aria-label={`Editar ${tx.description}`}
                        className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white/70 transition-all touch-press min-w-[36px] min-h-[36px] flex items-center justify-center"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        aria-label={`Remover ${tx.description}`}
                        className="p-2 rounded-xl hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all touch-press min-w-[36px] min-h-[36px] flex items-center justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Aba: Recorrentes */}
      {activeTab === 'recurring' && (
        <div className="space-y-2">
          {recurringExpenses.length === 0 ? (
            <div className="text-center py-16 text-white/20">
              <p className="text-base mb-1">Nenhum gasto recorrente</p>
              <p className="text-sm">Adicione assinaturas, aluguel, planos...</p>
            </div>
          ) : recurringExpenses.map(r => (
            <div key={r.id} className="
              flex items-center gap-3 sm:gap-4
              bg-white/[0.03] border border-white/[0.06] rounded-2xl
              px-3.5 py-3 sm:px-4 sm:py-3.5
              hover:bg-white/[0.05] transition-all group
            ">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                <RefreshCw size={15} className="text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{r.description}</p>
                <p className="text-xs text-white/30 mt-0.5">
                  Todo dia {r.day_of_month}{r.categories?.name && ` · ${r.categories.name}`}
                </p>
              </div>
              <span className="text-sm font-semibold text-red-400 mono-number flex-shrink-0">
                -{fmt(r.amount)}
              </span>
              <button
                onClick={() => handleDeleteRecurring(r.id)}
                aria-label={`Remover ${r.description}`}
                className="p-2 rounded-xl hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all touch-press min-w-[36px] min-h-[36px] flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal: editar transação */}
      <Modal isOpen={!!editTx} onClose={() => setEditTx(null)} title="Editar transação">
        <div className="space-y-4">
          <Input
            label="Descrição"
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            autoComplete="off"
          />
          <CurrencyInput label="Valor" value={editAmount} onChange={setEditAmount} />
          <Select label="Tipo" value={editType} onChange={e => setEditType(e.target.value)}>
            <option value="income">Receita</option>
            <option value="expense">Gasto</option>
            <option value="investment">Investimento</option>
            <option value="saving">Poupança</option>
          </Select>
          <Select label="Categoria" value={editCat} onChange={e => setEditCat(e.target.value)}>
            <option value="">Sem categoria</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Data" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
          <Input label="Loja" value={editStore} onChange={e => setEditStore(e.target.value)} />
          <Select label="Tipo de compra" value={editPurchaseType} onChange={e => setEditPurchaseType(e.target.value)}>
            <option value="one_off">Avulsa</option>
            <option value="installment">Parcelada</option>
          </Select>
          {editPurchaseType === 'installment' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Total parcelas" type="number" min={2} value={editInstallmentsTotal} onChange={e => setEditInstallmentsTotal(e.target.value)} />
                <Input label="Parcelas pagas" type="number" min={0} value={editInstallmentsPaid} onChange={e => setEditInstallmentsPaid(e.target.value)} />
              </div>
              <CurrencyInput label="Valor da parcela" value={editInstallmentAmount} onChange={setEditInstallmentAmount} />
            </>
          )}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setEditTx(null)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={handleSaveEdit}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: gasto recorrente */}
      <Modal isOpen={addRecurring} onClose={() => setAddRecurring(false)} title="Novo gasto recorrente">
        <div className="space-y-4">
          <Input
            label="Descrição"
            placeholder="Ex: Netflix, Aluguel, Academia..."
            value={recDesc}
            onChange={e => setRecDesc(e.target.value)}
            autoComplete="off"
          />
          <CurrencyInput label="Valor mensal" value={recAmount} onChange={setRecAmount} />
          <Input
            label="Dia do mês"
            type="number"
            min={1} max={31}
            placeholder="Ex: 5"
            value={recDay}
            onChange={e => setRecDay(e.target.value)}
            hint="Dia 29-31 será ajustado em meses menores"
          />
          <Select label="Categoria (opcional)" value={recCat} onChange={e => setRecCat(e.target.value)}>
            <option value="">Sem categoria</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setAddRecurring(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={handleAddRecurring}>Adicionar</Button>
          </div>
        </div>
      </Modal>

      {addPurchase && (
        <PurchaseModal
          onClose={() => setAddPurchase(false)}
          onSave={async (data) => { await addTransaction(data); await refresh(); setAddPurchase(false); toast.success('Compra adicionada') }}
        />
      )}

      {/* Confirm dialog — substitui window.confirm() */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Remover item"
        message={confirmDelete?.type === 'transaction'
          ? 'Deseja remover esta transação? A ação não pode ser desfeita.'
          : 'Deseja remover este gasto recorrente?'}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
