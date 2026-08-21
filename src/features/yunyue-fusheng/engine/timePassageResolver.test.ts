import { describe, expect, it } from 'vitest'
import { createInitialGameSaveState } from '../data/initialState'
import { monthlyEventDefinitions } from '../data/monthlyEvents'
import type { GameSaveState, MonthlyPlan } from '../types/game'
import { createMonthlyPlan } from './monthPlanning'
import { settleMonth } from './monthSettlement'
import { resolveEmploymentMonth } from './incomeResolver'
import { applyMonthOpeningRecovery } from './recoveryResolver'
import { resolveTimePassage } from './timePassageResolver'

function settledState(elapsedMonth: number, year: number, month: number, debtRmb = 100_000): GameSaveState {
  const initial = createInitialGameSaveState('zh')
  const plan: MonthlyPlan = {
    ...createMonthlyPlan({ ...initial.stats, debtRmb }, { elapsedMonth, year, month }, () => 0.5),
    stagePolicy: 'balanced',
  }
  const settled = settleMonth(
    { ...initial.stats, debtRmb },
    { elapsedMonth, year, month },
    plan,
    initial.livingProfile,
  )
  return {
    ...initial,
    screen: 'month-settlement',
    year,
    month,
    stats: settled.stats,
    livingProfile: settled.livingProfile,
    monthlySettlements: [settled.settlement],
    completedEventIds: monthlyEventDefinitions.map((definition) => definition.event.id),
    progress: { ...initial.progress, elapsedMonths: elapsedMonth },
  }
}

function settleNextVisibleMonth(state: GameSaveState): GameSaveState {
  const calendar = state.month === 12 ? { year: state.year + 1, month: 1 } : { year: state.year, month: state.month + 1 }
  const elapsedMonth = state.progress.elapsedMonths + 1
  const recovery = applyMonthOpeningRecovery(state.stats, state.monthlySettlements.at(-1) ?? null)
  const employment = resolveEmploymentMonth(state.employment, recovery.stats, elapsedMonth, state.flags)
  const openingStats = { ...recovery.stats, salaryJpy: employment.income.totalIncomeJpy }
  const plan = createMonthlyPlan(openingStats, { ...calendar, elapsedMonth }, () => 0.5,
    recovery.actionPointModifier + employment.actionPointModifier, {
      income: employment.income,
      foodLifestyle: state.livingProfile.foodLifestyle,
      smokingLevel: state.livingProfile.smokingLevel,
    })
  const result = settleMonth(openingStats, { ...calendar, elapsedMonth }, plan, state.livingProfile)
  return {
    ...state,
    ...calendar,
    stats: result.stats,
    employment: employment.employment,
    livingProfile: result.livingProfile,
    monthlySettlements: [...state.monthlySettlements, result.settlement],
    progress: { ...state.progress, elapsedMonths: elapsedMonth },
  }
}

describe('time passage resolver', () => {
  it('keeps the first three months detailed and then settles two or three hidden months', () => {
    expect(resolveTimePassage(settledState(2, 2024, 9), () => 0.5).passage).toBeNull()

    const resolved = resolveTimePassage(settledState(3, 2024, 10), () => 0.5)
    expect(resolved.passage).toMatchObject({
      causeId: 'quiet',
      fromElapsedMonth: 3,
      toElapsedMonth: 6,
      skippedMonths: 3,
    })
    expect(resolved.state.monthlySettlements.map((settlement) => settlement.elapsedMonth)).toEqual([3, 4, 5, 6])
    expect(resolved.state.progress.elapsedMonths).toBe(6)
  })

  it('stops before month 12 and month 18 instead of skipping a hard checkpoint', () => {
    const beforeAnnualReport = resolveTimePassage(settledState(10, 2025, 5), () => 0.5)
    expect(beforeAnnualReport.passage?.toElapsedMonth).toBe(11)
    expect(beforeAnnualReport.state.progress.elapsedMonths).toBe(11)

    const beforeStageEnding = resolveTimePassage(settledState(17, 2026, 1), () => 0.5)
    expect(beforeStageEnding.passage).toBeNull()
    expect(beforeStageEnding.state.progress.elapsedMonths).toBe(17)
  })

  it('stops hidden settlement as soon as debt reaches zero', () => {
    const state = settledState(4, 2024, 11, 9_000)
    const resolved = resolveTimePassage(state, () => 0.5)
    expect(resolved.passage?.skippedMonths).toBe(1)
    expect(resolved.state.stats.debtRmb).toBe(0)
    expect(resolved.state.progress.debtClearedMonth).toBe(5)
  })

  it('selects a state-driven disruptive cause without allowing refresh rerolls', () => {
    const state = settledState(4, 2024, 11)
    state.stats = { ...state.stats, health: 30 }
    const values = [0.99, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
    let index = 0
    const resolved = resolveTimePassage(state, () => values[index++] ?? 0.5)
    expect(resolved.passage?.causeId).toBe('illness')
    expect(resolved.passage?.skippedMonths).toBeGreaterThan(0)
  })

  it('compresses the ordinary first 18 months into nine visible operation rounds', () => {
    let state = settledState(3, 2024, 10, 1_000_000)
    state = {
      ...state,
      stats: { ...state.stats, health: 100, mental: 100, stress: 0, workTrust: 0 },
      livingProfile: { ...state.livingProfile, foodLifestyle: 'balanced' },
    }
    const visibleMonths = [1, 2, 3]
    while (state.progress.elapsedMonths < 18) {
      if (state.progress.elapsedMonths !== 12) {
        state = resolveTimePassage(state, () => 0.5).state
      }
      if (state.progress.elapsedMonths >= 18) break
      state = settleNextVisibleMonth(state)
      visibleMonths.push(state.progress.elapsedMonths)
    }
    expect(visibleMonths).toEqual([1, 2, 3, 7, 11, 12, 13, 17, 18])
  })
})
