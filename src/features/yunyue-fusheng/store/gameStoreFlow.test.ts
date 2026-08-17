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
    expect(useGameStore.getState().screen).toBe('event')
    expect(useGameStore.getState().progress.elapsedMonths).toBe(13)
    expect(useGameStore.getState().monthlyEventSlot).toMatchObject({
      elapsedMonth: 13,
      status: 'pending',
    })
  })

  it('continues to month 19 after the month-18 stage ending', () => {
    setMonthlyState({ elapsedMonths: 18 })
    useGameStore.getState().completeMonth()
    expect(useGameStore.getState().screen).toBe('month-settlement')
    useGameStore.getState().continueAfterMonthSettlement()
    expect(useGameStore.getState().screen).toBe('stage-ending')
    expect(useGameStore.getState().progress.finalEnding).toBeNull()

    useGameStore.getState().continueAfterStageEnding()
    expect(useGameStore.getState().screen).toBe('event')
    expect(useGameStore.getState().progress.elapsedMonths).toBe(19)
    expect(useGameStore.getState().progress.resolvedStageEndingMonths).toContain(18)
    expect(useGameStore.getState().monthlyEventSlot).toMatchObject({
      elapsedMonth: 19,
      status: 'pending',
    })
  })

  it('enters the debt-free month immediately after early debt clearance', () => {
    setMonthlyState({ elapsedMonths: 10, debtRmb: 1_000 })
    useGameStore.getState().completeMonth()
    expect(useGameStore.getState().screen).toBe('month-settlement')
    useGameStore.getState().continueAfterMonthSettlement()
    expect(useGameStore.getState().screen).toBe('debt-free-month')
    expect(useGameStore.getState().progress.debtClearedMonth).toBe(10)
    expect(useGameStore.getState().progress.elapsedMonths).toBe(11)
    expect(useGameStore.getState().monthlyEventSlot).toBeNull()
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

  it('runs a side hustle through AP spending, income, progression and month settlement', () => {
    setMonthlyState({ elapsedMonths: 2 })
    const cashBefore = useGameStore.getState().stats.cashJpy
    const stressBefore = useGameStore.getState().stats.stress
    useGameStore.getState().prepareMonth()

    expect(useGameStore.getState().sideHustles.routes.content_account.unlockedAtMonth).toBe(2)
    const actionPointsBefore = useGameStore.getState().monthlyPlan?.actionPointsRemaining ?? 0
    useGameStore.getState().performMonthlyAction('side_hustle_content_account')

    expect(useGameStore.getState().stats.cashJpy).toBe(cashBefore + 2_000)
    expect(useGameStore.getState().stats.stress).toBe(stressBefore + 3)
    expect(useGameStore.getState().monthlyPlan?.actionPointsRemaining).toBe(actionPointsBefore - 2)
    expect(useGameStore.getState().sideHustles.totalIncomeJpy).toBe(2_000)
    expect(useGameStore.getState().sideHustles.routes.content_account.experience).toBe(3)

    useGameStore.getState().completeMonth()
    expect(useGameStore.getState().monthlySettlements.at(-1)?.sideHustleIncomeJpy).toBe(2_000)
    expect(useGameStore.getState().screen).toBe('month-settlement')
  })

  it('does not reroll a selected monthly event while preparing the same month', () => {
    const state = useGameStore.getState()
    useGameStore.setState({
      ...state,
      screen: 'preview',
      progress: { ...state.progress, elapsedMonths: 1 },
    })

    useGameStore.getState().enterNextMonth()
    const selectedSlot = useGameStore.getState().monthlyEventSlot
    expect(selectedSlot).toMatchObject({ elapsedMonth: 2, status: 'pending' })

    useGameStore.getState().prepareMonth()
    expect(useGameStore.getState().monthlyEventSlot).toEqual(selectedSlot)
  })

  it('runs the read-the-air trigger through three stages and returns to the month', () => {
    const state = useGameStore.getState()
    useGameStore.setState({
      screen: 'event',
      currentEventId: 'monthly-work-read-the-air',
      resolution: null,
      monthlyEventSlot: {
        elapsedMonth: 4,
        kind: 'minigame',
        eventId: 'monthly-work-read-the-air',
        status: 'pending',
        miniGame: { type: 'read_the_air', configId: 'read-the-air-v1' },
      },
      progress: { ...state.progress, elapsedMonths: 4 },
    })

    useGameStore.getState().chooseOption('enter-meeting')
    useGameStore.getState().advance()
    expect(useGameStore.getState()).toMatchObject({
      screen: 'monthly-minigame',
      activeMiniGame: { stageIndex: 0, result: null },
    })
    expect(useGameStore.getState().activeMiniGame?.deadlineAt).not.toBeNull()

    useGameStore.getState().chooseMonthlyMiniGameOption('confirm-decision')
    useGameStore.getState().chooseMonthlyMiniGameOption('confirm-owner-and-done')
    useGameStore.getState().chooseMonthlyMiniGameOption('summarize-and-leave')
    expect(useGameStore.getState().activeMiniGame?.result).toMatchObject({ grade: 'S', score: 9 })
    expect(useGameStore.getState().monthlyEventSlot?.status).toBe('mini_game_pending')

    useGameStore.getState().continueAfterMonthlyMiniGame()
    expect(useGameStore.getState().screen).toBe('monthly-cycle')
    expect(useGameStore.getState().activeMiniGame).toBeNull()
    expect(useGameStore.getState().monthlyEventSlot?.status).toBe('completed')
  })

  it('accepts staged timeouts as a D minigame result', () => {
    const state = useGameStore.getState()
    useGameStore.setState({
      screen: 'event',
      currentEventId: 'monthly-work-read-the-air',
      resolution: null,
      monthlyEventSlot: {
        elapsedMonth: 4,
        kind: 'minigame',
        eventId: 'monthly-work-read-the-air',
        status: 'pending',
        miniGame: { type: 'read_the_air', configId: 'read-the-air-v1' },
      },
      progress: { ...state.progress, elapsedMonths: 4 },
    })
    useGameStore.getState().chooseOption('enter-meeting')
    useGameStore.getState().advance()
    useGameStore.getState().timeoutMonthlyMiniGame()
    useGameStore.getState().timeoutMonthlyMiniGame()
    useGameStore.getState().timeoutMonthlyMiniGame()

    expect(useGameStore.getState().activeMiniGame?.result).toMatchObject({ grade: 'D', score: 0 })
    expect(useGameStore.getState().flags).toContain('read_air_timed_out')
  })

  it('allows deliberate overdraft to -2 AP and records one negative AP month', () => {
    const state = useGameStore.getState()
    useGameStore.setState({
      screen: 'monthly-cycle',
      monthlyPlan: {
        elapsedMonth: 2,
        year: 2024,
        month: 9,
        openingCashJpy: state.stats.cashJpy,
        actionPointsGranted: 5,
        actionPointsRemaining: 0,
        exchangeRate: state.stats.exchangeRate,
        selectedActions: [],
        extraPaymentRmb: 0,
      },
    })

    useGameStore.getState().performMonthlyAction('rest')
    useGameStore.getState().performMonthlyAction('rest')
    useGameStore.getState().performMonthlyAction('rest')
    expect(useGameStore.getState().monthlyPlan?.actionPointsRemaining).toBe(-2)

    useGameStore.getState().completeMonth()
    expect(useGameStore.getState().monthlySettlements.at(-1)).toMatchObject({
      actionPointsOverdrawn: 2,
      negativeActionPointMonth: true,
    })
  })

  it('applies rest and low-intensity value again at the following month opening', () => {
    const state = useGameStore.getState()
    useGameStore.setState({
      screen: 'monthly-cycle',
      monthlyPlan: {
        elapsedMonth: 2,
        year: 2024,
        month: 9,
        openingCashJpy: state.stats.cashJpy,
        actionPointsGranted: 6,
        actionPointsRemaining: 6,
        exchangeRate: state.stats.exchangeRate,
        selectedActions: [],
        extraPaymentRmb: 0,
      },
      progress: { ...state.progress, elapsedMonths: 2 },
    })
    useGameStore.getState().performMonthlyAction('rest')
    useGameStore.getState().performMonthlyAction('rest')
    useGameStore.getState().completeMonth()
    const stressAfterSettlement = useGameStore.getState().stats.stress
    const recoveryDebtAfterSettlement = useGameStore.getState().stats.recoveryDebt

    useGameStore.getState().continueAfterMonthSettlement()
    expect(useGameStore.getState().stats.stress).toBeLessThan(stressAfterSettlement)
    expect(useGameStore.getState().stats.recoveryDebt).toBeLessThan(recoveryDebtAfterSettlement)
  })

  it('reduces the next monthly AP roll under severe accumulated pressure', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    const state = useGameStore.getState()
    useGameStore.setState({
      screen: 'preview',
      stats: {
        ...state.stats,
        stress: 90,
        recoveryDebt: 75,
        health: 20,
        mental: 20,
      },
    })

    useGameStore.getState().enterNextMonth()
    expect(useGameStore.getState().monthlyPlan?.actionPointsGranted).toBe(2)
    random.mockRestore()
  })
})
