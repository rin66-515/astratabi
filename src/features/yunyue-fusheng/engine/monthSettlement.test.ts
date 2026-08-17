import { describe, expect, it } from 'vitest'
import { initialGameStats } from '../data/initialState'
import type { MonthlyPlan } from '../types/game'
import { createMonthlyPlan } from './monthPlanning'
import {
  EXTRA_PAYMENT_CASH_RESERVE_JPY,
  FIXED_MONTHLY_EXPENSES_JPY,
  getMaximumExtraPaymentRmb,
  settleMonth,
} from './monthSettlement'

function plan(overrides: Partial<MonthlyPlan> = {}): MonthlyPlan {
  return {
    elapsedMonth: 2,
    year: 2024,
    month: 9,
    openingCashJpy: initialGameStats.cashJpy,
    actionPointsGranted: 7,
    actionPointsRemaining: 7,
    exchangeRate: 0.048,
    selectedActions: [],
    extraPaymentRmb: 0,
    ...overrides,
  }
}

describe('settleMonth', () => {
  it('credits salary, deducts fixed expenses, adds interest and pays the minimum', () => {
    const result = settleMonth(
      initialGameStats,
      { elapsedMonth: 2, year: 2024, month: 9 },
      plan(),
    )
    expect(result.settlement.fixedExpensesJpy).toBe(150_000)
    expect(result.settlement.interestRmb).toBe(600)
    expect(result.settlement.minimumPaymentRmb).toBe(5_000)
    expect(result.settlement.extraPaymentRmb).toBe(0)
    expect(result.stats.debtRmb).toBe(95_600)
    expect(result.stats.cashJpy).toBe(260_833)
  })

  it('clears the remaining balance without overpaying', () => {
    const result = settleMonth(
      { ...initialGameStats, debtRmb: 1_000 },
      { elapsedMonth: 10, year: 2025, month: 5 },
      plan({ elapsedMonth: 10, year: 2025, month: 5, extraPaymentRmb: 10_000 }),
    )
    expect(result.settlement.interestRmb).toBe(6)
    expect(result.settlement.minimumPaymentRmb).toBe(1_006)
    expect(result.settlement.extraPaymentRmb).toBe(0)
    expect(result.stats.debtRmb).toBe(0)
  })

  it('limits extra repayment by remaining debt, cash and the cash reserve', () => {
    const monthlyPlan = plan({ extraPaymentRmb: 10_000 })
    expect(getMaximumExtraPaymentRmb(initialGameStats, monthlyPlan)).toBeGreaterThanOrEqual(10_000)

    const result = settleMonth(
      initialGameStats,
      { elapsedMonth: 2, year: 2024, month: 9 },
      monthlyPlan,
    )
    expect(result.settlement.extraPaymentRmb).toBe(10_000)
    expect(result.stats.cashJpy).toBeGreaterThanOrEqual(EXTRA_PAYMENT_CASH_RESERVE_JPY)
    expect(result.stats.debtRmb).toBe(85_600)
  })

  it('keeps the zero-extra-payment baseline clearable in month 23 at the worst exchange rate', () => {
    let stats = { ...initialGameStats, cashJpy: 221_000, exchangeRate: 0.044 }
    let clearedMonth: number | null = null

    for (let elapsedMonth = 2; elapsedMonth <= 30 && stats.debtRmb > 0; elapsedMonth += 1) {
      const calendarMonthIndex = 8 + (elapsedMonth - 2)
      const monthlyPlan = createMonthlyPlan(stats, {
        elapsedMonth,
        year: 2024 + Math.floor(calendarMonthIndex / 12),
        month: (calendarMonthIndex % 12) + 1,
      }, () => 0)
      monthlyPlan.exchangeRate = 0.044
      const result = settleMonth(stats, {
        elapsedMonth,
        year: monthlyPlan.year,
        month: monthlyPlan.month,
      }, monthlyPlan)
      stats = result.stats
      if (stats.debtRmb <= 0) clearedMonth = elapsedMonth
    }

    expect(FIXED_MONTHLY_EXPENSES_JPY).toBe(150_000)
    expect(clearedMonth).toBe(23)
    expect(stats.cashJpy).toBeGreaterThanOrEqual(0)
  })
})
