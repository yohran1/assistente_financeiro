import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'

const fmt = (v) => {
  if (v >= 1000) return `R$${(v/1000).toFixed(0)}k`
  return `R$${v.toFixed(0)}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl px-4 py-3 shadow-xl">
      <p className="text-white/50 text-xs mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-sm text-white font-medium">
            {Number(p.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      ))}
    </div>
  )
}

const COLORS = {
  income:     '#34d399',
  expense:    '#f87171',
  investment: '#818cf8',
  saving:     '#38bdf8',
}

export function BalanceBarChart({ summary }) {
  if (!summary) return null

  const data = [
    { name: 'Receitas',      value: summary.totalIncome,      type: 'income'     },
    { name: 'Gastos',        value: summary.totalExpenses,    type: 'expense'    },
    { name: 'Invest.',       value: summary.totalInvestments, type: 'investment' },
    { name: 'Poupança',      value: summary.totalSavings,     type: 'saving'     },
  ].filter(d => d.value > 0)

  if (!data.length) {
    return (
      <div className="h-44 sm:h-52 flex flex-col items-center justify-center text-white/20 gap-2">
        <span className="text-3xl">📊</span>
        <p className="text-sm">Sem dados no período</p>
      </div>
    )
  }

  return (
    <div className="h-44 sm:h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="35%" margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmt}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={COLORS[entry.type]} fillOpacity={0.9} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
