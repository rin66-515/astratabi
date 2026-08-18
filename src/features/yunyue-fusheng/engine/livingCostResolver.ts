import {
  baseLivingExpenses,
  foodLifestyleConfigs,
  smokingConfigs,
} from '../data/incomeLivingConfig'
import type {
  FixedExpenseItem,
  FoodLifestyle,
  GameEffects,
  LivingProfile,
  SmokingLevel,
} from '../types/game'
import { applyEffects } from './applyEffects'

export function resolveLivingExpenses(
  foodLifestyle: FoodLifestyle,
  smokingLevel: SmokingLevel,
  extraSmokingJpy = 0,
): FixedExpenseItem[] {
  return [
    { id: 'rent', amountJpy: baseLivingExpenses.rent },
    { id: 'food', amountJpy: foodLifestyleConfigs[foodLifestyle].costJpy },
    { id: 'utilities', amountJpy: baseLivingExpenses.utilities },
    { id: 'telecom', amountJpy: baseLivingExpenses.telecom },
    { id: 'transport', amountJpy: baseLivingExpenses.transport },
    { id: 'smoking', amountJpy: smokingConfigs[smokingLevel].costJpy + Math.max(0, extraSmokingJpy) },
    { id: 'other_basic', amountJpy: baseLivingExpenses.other_basic },
  ]
}

export function livingEffects(foodLifestyle: FoodLifestyle, smokingLevel: SmokingLevel): GameEffects {
  const foodEffects = foodLifestyleConfigs[foodLifestyle].effects
  const smokingEffects = smokingConfigs[smokingLevel].effects
  return Object.fromEntries(
    [...Object.keys(foodEffects), ...Object.keys(smokingEffects)].map((key) => [
      key,
      (foodEffects[key as keyof typeof foodEffects] ?? 0)
        + (smokingEffects[key as keyof typeof smokingEffects] ?? 0),
    ]),
  ) as GameEffects
}

export function advanceLivingProfile(
  current: LivingProfile,
  foodLifestyle: FoodLifestyle,
  smokingLevel: SmokingLevel,
): LivingProfile {
  return {
    ...current,
    foodLifestyle,
    consecutiveFoodLifestyleMonths: current.foodLifestyle === foodLifestyle
      ? current.consecutiveFoodLifestyleMonths + 1
      : 1,
    smokingLevel,
  }
}

export function applyLivingEffects(
  stats: Parameters<typeof applyEffects>[0],
  foodLifestyle: FoodLifestyle,
  smokingLevel: SmokingLevel,
) {
  return applyEffects(stats, livingEffects(foodLifestyle, smokingLevel))
}
