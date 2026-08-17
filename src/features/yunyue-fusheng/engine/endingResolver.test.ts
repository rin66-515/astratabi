import { describe, expect, it } from 'vitest'
import { createInitialGameSaveState } from '../data/initialState'
import { createEndingDebugState } from '../data/endingDebugScenarios'
import { finalEndingIds } from '../data/endingContent'
import type { GameSaveState } from '../types/game'
import { resolveEnding, resolveFinalEnding, resolveStageEnding } from './endingResolver'

function state(overrides: {
  stats?: Partial<GameSaveState['stats']>
  progress?: Partial<GameSaveState['progress']>
  flags?: string[]
} = {}): GameSaveState {
  const initial = createInitialGameSaveState('zh')
  return {
    ...initial,
    stats: { ...initial.stats, ...overrides.stats },
    progress: { ...initial.progress, ...overrides.progress },
    flags: overrides.flags ?? initial.flags,
  }
}

describe('stage ending resolver', () => {
  it('does not treat the first annual report as a stage ending', () => {
    expect(resolveStageEnding(state({ progress: { elapsedMonths: 12 } }))).toBeNull()
  })

  it('resolves a non-terminal stage ending at month 18 when debt remains', () => {
    expect(resolveStageEnding(state({ progress: { elapsedMonths: 18 } }))).toBe('stage_debt_continues')
  })

  it('does not repeat a resolved stage deadline', () => {
    const result = resolveStageEnding(state({
      progress: { elapsedMonths: 19, resolvedStageEndingMonths: [18] },
    }))
    expect(result).toBeNull()
  })

  it('does not delay the month-18 checkpoint into a later month', () => {
    expect(resolveStageEnding(state({ progress: { elapsedMonths: 19 } }))).toBeNull()
  })

  it('can describe a new path without treating remaining debt as game over', () => {
    const result = resolveEnding(state({
      stats: { product: 55 },
      progress: { elapsedMonths: 18 },
    }))
    expect(result).toEqual({ kind: 'stage', endingId: 'stage_new_path' })
  })
})

describe('final ending resolver', () => {
  it('keeps final endings locked until the debt-free month is complete', () => {
    const current = state({ stats: { debtRmb: 0 } })
    expect(resolveFinalEnding(current)).toBeNull()
    expect(resolveEnding(current)).toEqual({ kind: 'debt_free_month' })
  })

  it('can resolve burnout after fast debt clearance', () => {
    const result = resolveFinalEnding(state({
      stats: { debtRmb: 0, health: 18, boundary: 20 },
      progress: { debtFreeMonthStarted: true, debtFreeMonthCompleted: true },
    }))
    expect(result).toBe('burnout')
  })

  it('keeps yuzhe as the highest-priority safe and free final ending', () => {
    const result = resolveFinalEnding(state({
      stats: {
        debtRmb: 0,
        boundary: 80,
        freedom: 80,
        health: 70,
        mental: 70,
        product: 50,
        recoveryDebt: 20,
        lossOfControl: 10,
      },
      progress: { debtFreeMonthStarted: true, debtFreeMonthCompleted: true },
    }))
    expect(result).toBe('yuzhe')
  })

  it('uses separate ids for stage and final versions of the same theme', () => {
    const stage = resolveStageEnding(state({
      stats: { workTrust: 70, boundary: 20, freedom: 20 },
      progress: { elapsedMonths: 18 },
    }))
    const final = resolveFinalEnding(state({
      stats: { debtRmb: 0, workTrust: 70, boundary: 20, freedom: 20 },
      progress: { debtFreeMonthStarted: true, debtFreeMonthCompleted: true },
    }))
    expect(stage).toBe('stage_golden_cage')
    expect(final).toBe('golden_cage')
  })

  it('resolves all eight debug scenarios through the real resolver', () => {
    const base = createInitialGameSaveState('zh')
    for (const endingId of finalEndingIds) {
      expect(resolveFinalEnding(createEndingDebugState(base, endingId))).toBe(endingId)
    }
  })
})
