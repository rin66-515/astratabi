import { describe, expect, it } from 'vitest'
import { createInitialGameSaveState } from '../data/initialState'
import type { GameSaveState } from '../types/game'
import { resolveMonthTransition } from './monthResolver'

function state(overrides: {
  stats?: Partial<GameSaveState['stats']>
  progress?: Partial<GameSaveState['progress']>
} = {}): GameSaveState {
  const initial = createInitialGameSaveState('zh')
  return {
    ...initial,
    stats: { ...initial.stats, ...overrides.stats },
    progress: { ...initial.progress, ...overrides.progress },
  }
}

describe('month transition rules', () => {
  it('shows only the first annual report at month 12 before continuing', () => {
    expect(resolveMonthTransition(state({ progress: { elapsedMonths: 12 } })))
      .toEqual({ kind: 'annual_report', year: 1 })
  })

  it('shows the annual report before entering a debt-free month at month 12', () => {
    const cleared = state({ stats: { debtRmb: 0 }, progress: { elapsedMonths: 12 } })
    expect(resolveMonthTransition(cleared)).toEqual({ kind: 'annual_report', year: 1 })
    expect(resolveMonthTransition({
      ...cleared,
      progress: { ...cleared.progress, completedAnnualReportYears: [1] },
    })).toEqual({ kind: 'debt_free_month' })
  })

  it('enters the debt-free month instead of a stage ending when debt clears at month 18', () => {
    expect(resolveMonthTransition(state({
      stats: { debtRmb: 0 },
      progress: { elapsedMonths: 18 },
    }))).toEqual({ kind: 'debt_free_month' })
  })

  it('shows a stage ending once at month 18 and then allows month 19', () => {
    expect(resolveMonthTransition(state({ progress: { elapsedMonths: 18 } })))
      .toEqual({ kind: 'stage_ending', endingId: 'stage_debt_continues' })
    expect(resolveMonthTransition(state({
      progress: { elapsedMonths: 19, resolvedStageEndingMonths: [18] },
    }))).toEqual({ kind: 'next_month' })
  })

  it('enters a debt-free month whenever later debt clearance occurs', () => {
    expect(resolveMonthTransition(state({
      stats: { debtRmb: 0 },
      progress: { elapsedMonths: 27, resolvedStageEndingMonths: [18] },
    }))).toEqual({ kind: 'debt_free_month' })
  })

  it('resolves a final ending only after the debt-free month completes', () => {
    expect(resolveMonthTransition(state({
      stats: { debtRmb: 0 },
      progress: {
        elapsedMonths: 28,
        resolvedStageEndingMonths: [18],
        debtFreeMonthStarted: true,
        debtFreeMonthCompleted: true,
      },
    }))).toEqual({ kind: 'final_ending', endingId: 'debt_free' })
  })
})
