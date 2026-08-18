import { describe, expect, it } from 'vitest'
import { balanceStrategyIds, runBalanceStudy, simulateBalanceRun, summarizeBalanceRuns } from './sideHustleBalance'

describe('side hustle balance simulation', () => {
  it('is deterministic for the same seed and keeps the reference route unchanged', () => {
    const first = simulateBalanceRun('reference_no_extra', 24, 12345)
    const second = simulateBalanceRun('reference_no_extra', 24, 12345)

    expect(first).toEqual(second)
    expect(first.debtClearedMonth).toBe(24)
    expect(first.debtClearedMonth).toBeGreaterThanOrEqual(20)
    expect(first.debtClearedMonth).toBeLessThanOrEqual(26)
    expect(first.cumulativeSideIncomeJpy).toBe(0)
    expect(first.averageActionPointsSpent).toBe(0)
    expect(first.eventsTriggered).toBeGreaterThan(0)
  })

  it('summarizes every strategy at 12, 18 and 24 months', () => {
    const report = runBalanceStudy(12)

    expect(report).toHaveLength(balanceStrategyIds.length * 3)
    expect(new Set(report.map((row) => row.horizonMonths))).toEqual(new Set([12, 18, 24]))
    expect(report.every((row) => row.runs === 12)).toBe(true)
    expect(report.every((row) => row.debtClearRate >= 0 && row.debtClearRate <= 1)).toBe(true)
    expect(report.every((row) => row.eventsTriggered.median > 0)).toBe(true)
  })

  it('calculates percentiles and route progression from repeated runs', () => {
    const runs = Array.from({ length: 50 }, (_, index) => simulateBalanceRun('mixed', 18, index + 1))
    const summary = summarizeBalanceRuns(runs)

    expect(summary.cumulativeSideIncomeJpy.p10).toBeLessThanOrEqual(summary.cumulativeSideIncomeJpy.median)
    expect(summary.cumulativeSideIncomeJpy.median).toBeLessThanOrEqual(summary.cumulativeSideIncomeJpy.p90)
    expect(Object.values(summary.medianRouteLevels).some((level) => level > 0)).toBe(true)
    expect(summary.sideHustleFeedbackEvents.median).toBeGreaterThan(0)
  })

  it('distinguishes deliberate overwork through negative AP months', () => {
    const overwork = simulateBalanceRun('high_overwork', 12, 123)
    const regular = simulateBalanceRun('freelance_only', 12, 123)

    expect(overwork.negativeActionPointMonths).toBeGreaterThan(0)
    expect(regular.negativeActionPointMonths).toBe(0)
    expect(overwork.recoveryDebt).toBeGreaterThan(regular.recoveryDebt)
  })

  it('distinguishes lifestyle cost and health trade-offs', () => {
    const survival = simulateBalanceRun('living_survival', 18, 321)
    const balanced = simulateBalanceRun('living_balanced', 18, 321)
    const comfortable = simulateBalanceRun('living_comfortable', 18, 321)
    const smoker = simulateBalanceRun('stress_smoker', 18, 321)

    expect(survival.foodCostJpy).toBeLessThan(balanced.foodCostJpy)
    expect(balanced.foodCostJpy).toBeLessThan(comfortable.foodCostJpy)
    expect(survival.lifePoverty).toBeGreaterThan(balanced.lifePoverty)
    expect(smoker.smokingCostJpy).toBeGreaterThan(balanced.smokingCostJpy)
    expect(smoker.health).toBeLessThan(balanced.health)
  })

  it('reflects salary growth and mentor allowance without changing side-hustle income', () => {
    const salaryOnly = simulateBalanceRun('salary_only', 18, 654)
    const growth = simulateBalanceRun('salary_growth', 18, 654)
    const mentor = simulateBalanceRun('mentor_route', 18, 654)

    expect(growth.totalIncomeJpy).toBeGreaterThan(salaryOnly.totalIncomeJpy)
    expect(mentor.totalIncomeJpy).toBeGreaterThan(salaryOnly.totalIncomeJpy)
    expect(growth.cumulativeSideIncomeJpy).toBe(0)
    expect(mentor.cumulativeSideIncomeJpy).toBe(0)
  })

})
