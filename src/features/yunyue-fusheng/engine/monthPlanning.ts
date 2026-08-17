import type { GameStats, MonthlyPlan } from '../types/game'

export const MIN_MONTHLY_ACTION_POINTS = 5
export const MAX_MONTHLY_ACTION_POINTS = 8
export const MIN_EXCHANGE_RATE = 0.044
export const MAX_EXCHANGE_RATE = 0.052
export const EXCHANGE_RATE_SWING = 0.015

type MonthPlanContext = {
  elapsedMonth: number
  year: number
  month: number
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function boundedRandom(random: () => number) {
  return clamp(random(), 0, 0.999999)
}

export function createMonthlyPlan(
  stats: GameStats,
  context: MonthPlanContext,
  random: () => number = Math.random,
): MonthlyPlan {
  const actionPointRange = MAX_MONTHLY_ACTION_POINTS - MIN_MONTHLY_ACTION_POINTS + 1
  const actionPointsGranted = MIN_MONTHLY_ACTION_POINTS
    + Math.floor(boundedRandom(random) * actionPointRange)
  const rateDelta = (boundedRandom(random) * 2 - 1) * EXCHANGE_RATE_SWING
  const exchangeRate = Number(clamp(
    stats.exchangeRate * (1 + rateDelta),
    MIN_EXCHANGE_RATE,
    MAX_EXCHANGE_RATE,
  ).toFixed(6))

  return {
    ...context,
    actionPointsGranted,
    actionPointsRemaining: actionPointsGranted,
    exchangeRate,
    selectedActions: [],
    extraPaymentRmb: 0,
  }
}
