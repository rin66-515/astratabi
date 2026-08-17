import type { FinalEndingId, GameSaveState, GameStats } from '../types/game'

const commonFinalStats: Partial<GameStats> = {
  debtRmb: 0,
  health: 65,
  mental: 65,
  freedom: 35,
  product: 10,
  workTrust: 20,
  boundary: 15,
  recoveryDebt: 20,
  lossOfControl: 10,
}

const scenarioStats: Record<FinalEndingId, Partial<GameStats>> = {
  debt_free: {},
  burnout: { health: 15 },
  golden_cage: { workTrust: 70, boundary: 20, freedom: 20 },
  escape_paradise: { lossOfControl: 75 },
  rooted_abroad: { workTrust: 50, health: 60, mental: 60 },
  new_path: { product: 55 },
  boundary_awakened: { boundary: 75, freedom: 55 },
  yuzhe: {
    boundary: 82,
    freedom: 82,
    health: 72,
    mental: 72,
    product: 55,
    recoveryDebt: 18,
    lossOfControl: 8,
  },
}

export function createEndingDebugState(base: GameSaveState, endingId: FinalEndingId): GameSaveState {
  return {
    ...base,
    stats: { ...base.stats, ...commonFinalStats, ...scenarioStats[endingId] },
    progress: {
      ...base.progress,
      phase: 'debt_free_month',
      debtClearedMonth: base.progress.debtClearedMonth ?? base.progress.elapsedMonths,
      debtFreeMonthStarted: true,
      debtFreeMonthCompleted: true,
      stageEnding: null,
      finalEnding: null,
    },
  }
}
