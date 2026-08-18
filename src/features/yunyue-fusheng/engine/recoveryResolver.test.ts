import { describe, expect, it } from 'vitest'
import { initialGameStats } from '../data/initialState'
import type { MonthSettlement } from '../types/game'
import {
  applyMonthOpeningRecovery,
  canPerformMonthlyAction,
  getActionPointModifier,
  resolveMonthlyConsequence,
} from './recoveryResolver'

function settlement(overrides: Partial<MonthSettlement> = {}): MonthSettlement {
  return {
    elapsedMonth: 2,
    year: 2024,
    month: 9,
    cashJpyBefore: 0,
    debtRmbBefore: 0,
    actionPointsGranted: 6,
    actionPointsSpent: 6,
    actionPointsOverdrawn: 0,
    actionIntensity: 1,
    negativeActionPointMonth: false,
    consequenceEffects: {},
    livingEffects: {},
    exchangeRate: 0.048,
    salaryJpy: 0,
    income: { baseSalaryJpy: 0, roleAllowanceJpy: 0, mentorAllowanceJpy: 0, overtimeIncomeJpy: 0, totalIncomeJpy: 0, raiseJpy: 0 },
    sideHustleIncomeJpy: 0,
    foodLifestyle: 'frugal',
    smokingLevel: 'regular',
    foodCostJpy: 42_000,
    smokingCostJpy: 16_000,
    fixedExpenses: [],
    fixedExpensesJpy: 0,
    interestRmb: 0,
    minimumPaymentRmb: 0,
    extraPaymentRmb: 0,
    paymentRmb: 0,
    paymentJpy: 0,
    cashJpyAfter: 0,
    debtRmbAfter: 0,
    actions: [],
    ...overrides,
  }
}

describe('recovery and monthly consequence', () => {
  it('allows deliberate monthly overdraft only down to -2 AP', () => {
    expect(canPerformMonthlyAction(3, 1)).toBe(true)
    expect(canPerformMonthlyAction(1, -1)).toBe(true)
    expect(canPerformMonthlyAction(1, -2)).toBe(false)
    expect(canPerformMonthlyAction(3, 0)).toBe(false)
  })

  it('adds delayed costs for a negative AP month', () => {
    expect(resolveMonthlyConsequence(6, -2)).toEqual({
      actionPointsSpent: 8,
      actionPointsOverdrawn: 2,
      actionIntensity: 8 / 6,
      negativeActionPointMonth: true,
      effects: { stress: 8, recoveryDebt: 9, mental: -4, health: -2, lossOfControl: 2 },
    })
  })

  it('makes unused capacity and rest valuable in the following month', () => {
    const previous = settlement({
      actionPointsSpent: 3,
      actionIntensity: 0.5,
      actions: [
        { actionId: 'rest', source: 'core', label: { zh: '休息', ja: '休む' }, actionPointCost: 1, effects: {} },
        { actionId: 'rest', source: 'core', label: { zh: '休息', ja: '休む' }, actionPointCost: 1, effects: {} },
      ],
    })
    const result = applyMonthOpeningRecovery({ ...initialGameStats, stress: 65, recoveryDebt: 50 }, previous)

    expect(result.effects).toMatchObject({ stress: -10, recoveryDebt: -6, health: 1, mental: 1 })
    expect(result.actionPointModifier).toBe(1)
  })

  it('reduces future action capacity under accumulated pressure', () => {
    expect(getActionPointModifier({
      ...initialGameStats,
      stress: 90,
      recoveryDebt: 75,
      health: 20,
      mental: 20,
    }, null)).toBe(-6)
  })
})
