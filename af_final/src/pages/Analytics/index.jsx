import { lazy, Suspense } from 'react'
import { useFinances }    from '../../hooks/useFinances'
import { Card, CardHeader } from '../../components/ui/Card'
import { Select }         from '../../components/ui/Select'
import { TrendingUp, TrendingDown, Percent, PiggyBank, Calendar } from 'lucide-react'
import { formatPurchaseLabel } from '../../lib/balanceImpact'

const ExpensePieChart = lazy(() => import('../../components/charts/ExpensePieChart').then(m => ({ default: m.ExpensePieChart })))
const BalanceBarChart = lazy(() => import('../../components/charts/BalanceBarChart').then(m => ({ default: m.BalanceBarChart })))

const ChartLoader = () => (
  <div className="h-56 bg-white/[0.03] rounded-2xl flex items-center justify-center">
    <div className="text-white/30 text-sm">Carregando...</div>
  </div>
)

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function MetricCard({ label, value, icon: Icon, colorClass, sublabel }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-4 sm:p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorClass}`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-semibold text-white mono-number">{value}</p>
      {sublabel && <p className="text-xs text-white/30 mt-1 leading-relaxed">{sublabel}</p>}
    </div>
  )
}

export default function Analytics() {
  const { summary, loading, month, year, setMonth, setYear } = useFinances()

  const savingsRate = summary?.totalIncome > 0
    ? ((summary.totalSavings + summary.totalInvestments) / summary.totalIncome * 100).toFixed(1)
    : '0.0'

  const balance   = summary
    ? summary.totalIncome - summary.totalExpenses - summary.totalInvestments - summary.totalSavings
    : 0

  const monthName = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  if (loading) return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 animate-pulse">
      <div className="skeleton h-8 w-40 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="skeleton h-64 rounded-3xl" />
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Relatórios</h1>
          <p className="text-white/40 text-sm mt-0.5 capitalize">{monthName}</p>
        </div>
        <Select
          icon={Calendar}
          compact
          value={`${year}-${month}`}
          onChange={(e) => { const [y,m] = e.target.value.split('-'); setYear(+y); setMonth(+m) }}
          aria-label="Selecionar mês"
          className="w-auto min-w-[10.5rem] sm:min-w-[11.5rem]"
        >
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date(year, i)
            return (
              <option key={i} value={`${year}-${i+1}`}>
                {d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </option>
            )
          })}
        </Select>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Receitas"       value={fmt(summary?.totalIncome)}      icon={TrendingUp}   colorClass="bg-emerald-500/10 text-emerald-400" />
        <MetricCard label="Gastos"         value={fmt(summary?.totalExpenses)}    icon={TrendingDown} colorClass="bg-red-500/10 text-red-400" />
        <MetricCard label="Taxa poupança"  value={`${savingsRate}%`}              icon={Percent}      colorClass="bg-brand-500/10 text-brand-400" sublabel="(Poupança + Invest.) ÷ Receita" />
        <MetricCard label="Saldo líquido"  value={fmt(balance)}                   icon={PiggyBank}    colorClass={balance >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">Gastos por categoria</h2>
            <p className="text-xs text-white/30">Distribuição do período</p>
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

      {/* Gastos do mês (regra 7) */}
      {summary?.items && summary.items.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">Gastos do mês</h2>
            <p className="text-xs text-white/30">Avulsas e parceladas (ex.: 3/5)</p>
          </CardHeader>
          <div className="space-y-2">
            {summary.items.map(item => {
              const label = item.purchaseType === 'installment'
                ? formatPurchaseLabel(item)
                : 'Avulsa'
              const displayAmt = item.purchaseType === 'installment'
                ? item.installmentAmount ?? item.amount
                : item.amount
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{item.description}</p>
                    <p className="text-xs text-white/30">
                      {label}
                      {item.store && ` · ${item.store}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-400 mono-number flex-shrink-0">
                    {fmt(displayAmt)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Detalhamento por categoria */}
      {summary?.byCategory && Object.keys(summary.byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-white">Detalhamento por categoria</h2>
          </CardHeader>
          <div className="space-y-3">
            {Object.entries(summary.byCategory)
              .sort((a,b) => b[1].total - a[1].total)
              .map(([name, { total, color }]) => {
                const pct = summary.totalExpenses > 0
                  ? (total / summary.totalExpenses * 100).toFixed(1)
                  : '0.0'
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-sm text-white/80 truncate">{name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-xs text-white/30">{pct}%</span>
                        <span className="text-sm font-semibold text-white mono-number">{fmt(total)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </Card>
      )}
    </div>
  )
}
