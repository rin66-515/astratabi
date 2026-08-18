import type { FoodLifestyle, GameEffects, SmokingLevel } from '../types/game'

export const SALARY_REVIEW_INTERVAL_MONTHS = 6
export const MENTOR_ALLOWANCE_JPY = 8_000

export const salaryRaiseRules = [
  { minimumScore: 9, raiseJpy: 15_000 },
  { minimumScore: 6, raiseJpy: 10_000 },
  { minimumScore: 4, raiseJpy: 5_000 },
] as const

export const foodLifestyleConfigs: Record<FoodLifestyle, {
  costJpy: number
  effects: GameEffects
}> = {
  survival: { costJpy: 28_000, effects: { health: -1, recoveryDebt: 1, lifePoverty: 2 } },
  frugal: { costJpy: 42_000, effects: {} },
  balanced: { costJpy: 65_000, effects: { health: 1, mental: 1, recoveryDebt: -1, lifePoverty: -1 } },
  comfortable: { costJpy: 90_000, effects: { mental: 2, stress: -1, lifePoverty: -2 } },
}

export const smokingConfigs: Record<SmokingLevel, {
  costJpy: number
  effects: GameEffects
}> = {
  none: { costJpy: 0, effects: {} },
  light: { costJpy: 7_000, effects: {} },
  regular: { costJpy: 16_000, effects: { recoveryDebt: 1 } },
  heavy: { costJpy: 32_000, effects: { health: -1, recoveryDebt: 2 } },
}

export const baseLivingExpenses = {
  rent: 75_000,
  utilities: 13_000,
  telecom: 7_000,
  transport: 8_000,
  other_basic: 5_000,
} as const
