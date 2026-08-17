import type { GameEffects, GameStats, StatKey } from '../types/game'

const boundedStats = new Set<StatKey>([
  'health', 'mental', 'socialBattery', 'freedom', 'japanese', 'tech', 'workplace', 'product',
  'stress', 'recoveryDebt', 'lossOfControl', 'obsession', 'lifePoverty', 'workTrust',
  'debtStress', 'observerActivity', 'boundary',
])

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function applyEffects(stats: GameStats, effects: GameEffects = {}): GameStats {
  const next = { ...stats }

  for (const [rawKey, rawDelta] of Object.entries(effects)) {
    const key = rawKey as StatKey
    const delta = rawDelta ?? 0
    let value = stats[key] + delta

    if (boundedStats.has(key)) value = clamp(value, 0, 100)
    if (key === 'debtRmb' || key === 'salaryJpy' || key === 'exchangeRate') value = Math.max(0, value)
    next[key] = value
  }

  return next
}
