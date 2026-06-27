import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const RADIAN = Math.PI / 180

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.07) return null // Esconde labels muito pequenos
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x} y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value, color } = payload[0].payload
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl px-4 py-3 shadow-xl max-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-sm font-medium text-white truncate">{name}</span>
      </div>
      <p className="text-brand-400 font-semibold text-sm">
        {Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  )
}

const CustomLegend = ({ payload }) => {
  if (!payload?.length) return null
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2 px-2">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-xs text-white/50 truncate max-w-[80px]">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ExpensePieChart({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="h-52 flex flex-col items-center justify-center text-white/20 gap-2">
        <span className="text-3xl">🍕</span>
        <p className="text-sm">Sem gastos categorizados no período</p>
      </div>
    )
  }

  const chartData = Object.entries(data).map(([name, { total, color }]) => ({
    name,
    value: total,
    color,
  }))

  return (
    <div className="h-56 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius="70%"
            innerRadius="40%"
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
