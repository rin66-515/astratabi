import { describe, expect, it } from 'vitest'
import { initialEmploymentState, initialGameStats } from '../data/initialState'
import { resolveEmploymentMonth } from './incomeResolver'

describe('dynamic employment income', () => {
  it('does not guarantee a raise when work growth is insufficient', () => {
    const result = resolveEmploymentMonth(initialEmploymentState, initialGameStats, 6, [])
    expect(result.income.raiseJpy).toBe(0)
    expect(result.employment.lastSalaryReviewMonth).toBe(6)
  })

  it('adds a configured realistic raise at a six-month review', () => {
    const result = resolveEmploymentMonth(initialEmploymentState, {
      ...initialGameStats,
      workTrust: 20,
      tech: 56,
      workplace: 50,
    }, 6, [])
    expect(result.income.raiseJpy).toBe(15_000)
    expect(result.income.totalIncomeJpy).toBe(270_000)
  })

  it('adds the mentor allowance together with an ongoing AP cost', () => {
    const result = resolveEmploymentMonth(initialEmploymentState, initialGameStats, 7, ['mentoring_junior_active'])
    expect(result.employment.isMentoringJunior).toBe(true)
    expect(result.income.mentorAllowanceJpy).toBe(8_000)
    expect(result.income.totalIncomeJpy).toBe(263_000)
    expect(result.actionPointModifier).toBe(-1)
  })
})
