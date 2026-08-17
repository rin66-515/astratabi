import { describe, expect, it } from 'vitest'
import { initialGameStats } from '../data/initialState'
import {
  createMonthlyPlan,
  MAX_EXCHANGE_RATE,
  MAX_MONTHLY_ACTION_POINTS,
  MIN_EXCHANGE_RATE,
  MIN_MONTHLY_ACTION_POINTS,
} from './monthPlanning'

describe('createMonthlyPlan', () => {
  it('rolls the configured action point range and basic exchange movement', () => {
    const lowest = createMonthlyPlan(initialGameStats, {
      elapsedMonth: 2,
      year: 2024,
      month: 9,
    }, () => 0)
    const highest = createMonthlyPlan(initialGameStats, {
      elapsedMonth: 2,
      year: 2024,
      month: 9,
    }, () => 0.999999)

    expect(lowest.actionPointsGranted).toBe(MIN_MONTHLY_ACTION_POINTS)
    expect(highest.actionPointsGranted).toBe(MAX_MONTHLY_ACTION_POINTS)
    expect(lowest.exchangeRate).toBeGreaterThanOrEqual(MIN_EXCHANGE_RATE)
    expect(highest.exchangeRate).toBeLessThanOrEqual(MAX_EXCHANGE_RATE)
  })

  it('creates a fresh, empty monthly plan', () => {
    const monthlyPlan = createMonthlyPlan(initialGameStats, {
      elapsedMonth: 6,
      year: 2025,
      month: 1,
    }, () => 0.5)
    expect(monthlyPlan.selectedActions).toEqual([])
    expect(monthlyPlan.extraPaymentRmb).toBe(0)
    expect(monthlyPlan.actionPointsRemaining).toBe(monthlyPlan.actionPointsGranted)
  })
})
