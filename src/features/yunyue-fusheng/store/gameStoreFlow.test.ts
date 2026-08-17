import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { finalEndingIds } from '../data/endingContent'
import { createInitialGameSaveState } from '../data/initialState'

const memory = new Map<string, string>()
vi.stubGlobal('window', {
  localStorage: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
    clear: () => memory.clear(),
  },
})

let useGameStore: typeof import('./gameStore')['useGameStore']

beforeAll(async () => {
  useGameStore = (await import('./gameStore')).useGameStore
})

beforeEach(() => {
  memory.clear()
  useGameStore.setState(createInitialGameSaveState('zh'))
})

function setMonthlyState(overrides: {
  elapsedMonths: number
  debtRmb?: number
  resolvedStageEndingMonths?: number[]
}) {
  const state = useGameStore.getState()
  useGameStore.setState({
    screen: 'monthly-cycle',
    monthlyPlan: null,
    stats: { ...state.stats, debtRmb: overrides.debtRmb ?? state.stats.debtRmb },
    progress: {
      ...state.progress,
      elapsedMonths: overrides.elapsedMonths,
      resolvedStageEndingMonths: overrides.resolvedStageEndingMonths ?? [],
    },
  })
}

describe('playable ending flow', () => {
  it('shows the month-12 report without triggering an ending, then continues to month 13', () => {
    setMonthlyState({ elapsedMonths: 12 })
    useGameStore.getState().completeMonth()
    expect(useGameStore.getState().screen).toBe('month-settlement')
    useGameStore.getState().continueAfterMonthSettlement()
    expect(useGameStore.getState().screen).toBe('annual-report')
    expect(useGameStore.getState().progress.stageEnding).toBeNull()
    expect(useGameStore.getState().progress.finalEnding).toBeNull()

    useGameStore.getState().completeAnnualReport()
    expect(useGameStore.getState().screen).toBe('monthly-cycle')
    expect(useGameStore.getState().progress.elapsedMonths).toBe(13)
  })

  it('continues to month 19 after the month-18 stage ending', () => {
    setMonthlyState({ elapsedMonths: 18 })
    useGameStore.getState().completeMonth()
    expect(useGameStore.getState().screen).toBe('month-settlement')
    useGameStore.getState().continueAfterMonthSettlement()
    expect(useGameStore.getState().screen).toBe('stage-ending')
    expect(useGameStore.getState().progress.finalEnding).toBeNull()

    useGameStore.getState().continueAfterStageEnding()
    expect(useGameStore.getState().screen).toBe('monthly-cycle')
    expect(useGameStore.getState().progress.elapsedMonths).toBe(19)
    expect(useGameStore.getState().progress.resolvedStageEndingMonths).toContain(18)
  })

  it('enters the debt-free month immediately after early debt clearance', () => {
    setMonthlyState({ elapsedMonths: 10, debtRmb: 1_000 })
    useGameStore.getState().completeMonth()
    expect(useGameStore.getState().screen).toBe('month-settlement')
    useGameStore.getState().continueAfterMonthSettlement()
    expect(useGameStore.getState().screen).toBe('debt-free-month')
    expect(useGameStore.getState().progress.debtClearedMonth).toBe(10)
    expect(useGameStore.getState().progress.elapsedMonths).toBe(11)
  })

  it('requires the debt-free month and 02:17 scene before a final ending', () => {
    setMonthlyState({ elapsedMonths: 10, debtRmb: 1_000 })
    useGameStore.getState().completeMonth()
    expect(useGameStore.getState().screen).toBe('month-settlement')
    useGameStore.getState().continueAfterMonthSettlement()
    expect(useGameStore.getState().progress.finalEnding).toBeNull()

    useGameStore.getState().chooseDebtFreeMonth('rest')
    expect(useGameStore.getState().screen).toBe('debt-free-scene')
    expect(useGameStore.getState().progress.finalEnding).toBeNull()

    useGameStore.getState().completeDebtFreeScene()
    expect(useGameStore.getState().screen).toBe('final-ending')
    expect(useGameStore.getState().progress.finalEnding).not.toBeNull()
  })

  it('simulates all eight final endings from the dev debug action', () => {
    for (const endingId of finalEndingIds) {
      useGameStore.setState(createInitialGameSaveState('zh'))
      useGameStore.getState().simulateFinalEnding(endingId)
      expect(useGameStore.getState().screen).toBe('final-ending')
      expect(useGameStore.getState().progress.finalEnding).toBe(endingId)
    }
  })

  it('creates one persistent monthly roll and spends action points through free actions', () => {
    setMonthlyState({ elapsedMonths: 2 })
    useGameStore.getState().prepareMonth()
    const firstPlan = useGameStore.getState().monthlyPlan
    expect(firstPlan).not.toBeNull()
    expect(firstPlan?.actionPointsGranted).toBeGreaterThanOrEqual(5)
    expect(firstPlan?.actionPointsGranted).toBeLessThanOrEqual(8)

    useGameStore.getState().prepareMonth()
    expect(useGameStore.getState().monthlyPlan).toEqual(firstPlan)

    useGameStore.getState().performMonthlyAction('rest')
    expect(useGameStore.getState().monthlyPlan?.actionPointsRemaining)
      .toBe((firstPlan?.actionPointsRemaining ?? 0) - 1)
    expect(useGameStore.getState().monthlyPlan?.selectedActions[0]?.actionId).toBe('rest')
  })
})
