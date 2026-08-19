import { describe, expect, it } from 'vitest'
import { initialGameStats } from '../data/initialState'
import type { MonthlyPlan } from '../types/game'
import { createMonthlyPlan } from './monthPlanning'
import {
  EXTRA_PAYMENT_CASH_RESERVE_JPY,
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
    income: {
      baseSalaryJpy: initialGameStats.salaryJpy,
      roleAllowanceJpy: 0,
      mentorAllowanceJpy: 0,
      overtimeIncomeJpy: 0,
      totalIncomeJpy: initialGameStats.salaryJpy,
      raiseJpy: 0,
    },
    foodLifestyle: 'frugal',
    smokingLevel: 'regular',
    extraSmokingJpy: 0,
    actionAvailability: [],
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
    expect(result.settlement.fixedExpensesJpy).toBe(166_000)
    expect(result.settlement.interestRmb).toBe(600)
    expect(result.settlement.minimumPaymentRmb).toBe(5_000)
    expect(result.settlement.extraPaymentRmb).toBe(0)
    expect(result.stats.debtRmb).toBe(95_600)
    expect(result.stats.cashJpy).toBe(244_833)
    expect(result.settlement.actionIntensity).toBe(0)
    expect(result.settlement.consequenceEffects).toMatchObject({ stress: -3, recoveryDebt: -1 })
  })

  it('records negative AP and applies its delayed health cost during settlement', () => {
    const result = settleMonth(
      initialGameStats,
      { elapsedMonth: 2, year: 2024, month: 9 },
      plan({ actionPointsRemaining: -2 }),
    )

    expect(result.settlement.actionPointsSpent).toBe(9)
    expect(result.settlement.actionPointsOverdrawn).toBe(2)
    expect(result.settlement.negativeActionPointMonth).toBe(true)
    expect(result.stats.health).toBe(initialGameStats.health - 2)
    expect(result.stats.recoveryDebt).toBe(initialGameStats.recoveryDebt + 10)
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
    const maximum = getMaximumExtraPaymentRmb(initialGameStats, monthlyPlan)
    expect(maximum).toBeGreaterThan(0)
    expect(maximum).toBeLessThan(10_000)

    const result = settleMonth(
      initialGameStats,
      { elapsedMonth: 2, year: 2024, month: 9 },
      monthlyPlan,
    )
    expect(result.settlement.extraPaymentRmb).toBe(maximum)
    expect(result.stats.cashJpy).toBeGreaterThanOrEqual(EXTRA_PAYMENT_CASH_RESERVE_JPY)
    expect(result.stats.debtRmb).toBe(95_600 - maximum)
  })

  it('keeps the zero-extra-payment baseline inside the accepted 20-26 month range at the worst exchange rate', () => {
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

    expect(plan().income.totalIncomeJpy).toBe(255_000)
    expect(clearedMonth).toBe(26)
    expect(clearedMonth).toBeGreaterThanOrEqual(20)
    expect(clearedMonth).toBeLessThanOrEqual(26)
    expect(stats.cashJpy).toBeGreaterThanOrEqual(0)
  })

  it('records selected food and additional stress-smoking cost in the settlement', () => {
    const result = settleMonth(
      initialGameStats,
      { elapsedMonth: 4, year: 2024, month: 11 },
      plan({ foodLifestyle: 'balanced', extraSmokingJpy: 1_400 }),
    )

    expect(result.settlement.foodCostJpy).toBe(65_000)
    expect(result.settlement.smokingCostJpy).toBe(17_400)
    expect(result.settlement.fixedExpensesJpy).toBe(190_400)
    expect(result.settlement.livingEffects).toMatchObject({ health: 1, mental: 1 })
    expect(result.livingProfile.foodLifestyle).toBe('balanced')
  })
})
