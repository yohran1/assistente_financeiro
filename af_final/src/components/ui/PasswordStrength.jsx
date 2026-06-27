import zxcvbn from 'zxcvbn'

const levels = [
  { label: 'Muito fraca', color: 'bg-red-500' },
  { label: 'Fraca',       color: 'bg-orange-500' },
  { label: 'Razoável',    color: 'bg-yellow-500' },
  { label: 'Forte',       color: 'bg-blue-500' },
  { label: 'Muito forte', color: 'bg-emerald-500' },
]

export function PasswordStrength({ password }) {
  if (!password) return null
  const result = zxcvbn(password)
  const score = result.score // 0–4
  const level = levels[score]

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {levels.map((l, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? level.color : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-white/40">
        Senha: <span className={`font-medium ${
          score <= 1 ? 'text-red-400' : score === 2 ? 'text-yellow-400' : 'text-emerald-400'
        }`}>{level.label}</span>
        {result.feedback.suggestions[0] && (
          <span className="ml-2 text-white/30">· {result.feedback.suggestions[0]}</span>
        )}
      </p>
    </div>
  )
}
