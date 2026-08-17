import { describe, expect, it } from 'vitest'
import { balanceStrategyIds, runBalanceStudy, simulateBalanceRun, summarizeBalanceRuns } from './sideHustleBalance'

describe('side hustle balance simulation', () => {
  it('is deterministic for the same seed and keeps the reference route unchanged', () => {
    const first = simulateBalanceRun('reference_no_extra', 24, 12345)
    const second = simulateBalanceRun('reference_no_extra', 24, 12345)

    expect(first).toEqual(second)
    expect(first.debtClearedMonth).toBe(23)
    expect(first.cumulativeSideIncomeJpy).toBe(0)
    expect(first.averageActionPointsSpent).toBe(0)
  })

  it('summarizes every strategy at 12, 18 and 24 months', () => {
    const report = runBalanceStudy(12)

    expect(report).toHaveLength(balanceStrategyIds.length * 3)
    expect(new Set(report.map((row) => row.horizonMonths))).toEqual(new Set([12, 18, 24]))
    expect(report.every((row) => row.runs === 12)).toBe(true)
    expect(report.every((row) => row.debtClearRate >= 0 && row.debtClearRate <= 1)).toBe(true)
  })

  it('calculates percentiles and route progression from repeated runs', () => {
    const runs = Array.from({ length: 50 }, (_, index) => simulateBalanceRun('mixed', 18, index + 1))
    const summary = summarizeBalanceRuns(runs)

    expect(summary.cumulativeSideIncomeJpy.p10).toBeLessThanOrEqual(summary.cumulativeSideIncomeJpy.median)
    expect(summary.cumulativeSideIncomeJpy.median).toBeLessThanOrEqual(summary.cumulativeSideIncomeJpy.p90)
    expect(Object.values(summary.medianRouteLevels).some((level) => level > 0)).toBe(true)
  })
})
