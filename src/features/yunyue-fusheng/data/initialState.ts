import type { GameSaveState, GameStats, Language, SideHustleState, VolumeProgress } from '../types/game'

export const DEFAULT_STAGE_DEADLINE_MONTHS = 18

export const initialGameStats: GameStats = {
  debtRmb: 100_000,
  cashJpy: 260_000,
  salaryJpy: 255_000,
  exchangeRate: 0.048,
  minimumPaymentRmb: 5_000,
  debtInterestRate: 0.006,
  actionPoints: 7,
  health: 65,
  mental: 65,
  socialBattery: 60,
  freedom: 10,
  japanese: 75,
  tech: 35,
  workplace: 30,
  product: 10,
  stress: 30,
  recoveryDebt: 20,
  lossOfControl: 10,
  obsession: 20,
  lifePoverty: 20,
  workTrust: 0,
  debtStress: 70,
  observerActivity: 20,
  boundary: 10,
}

export const initialVolumeProgress: VolumeProgress = {
  phase: 'normal',
  elapsedMonths: 1,
  stageDeadlineMonths: DEFAULT_STAGE_DEADLINE_MONTHS,
  debtClearedMonth: null,
  completedAnnualReportYears: [],
  resolvedStageEndingMonths: [],
  debtFreeMonthStarted: false,
  debtFreeMonthCompleted: false,
  stageEnding: null,
  finalEnding: null,
}

export function createInitialSideHustleState(): SideHustleState {
  return {
    routes: {
      freelance: { unlockedAtMonth: null, level: 0, experience: 0, totalIncomeJpy: 0, completedActions: 0 },
      it_materials: { unlockedAtMonth: null, level: 0, experience: 0, totalIncomeJpy: 0, completedActions: 0 },
      content_account: { unlockedAtMonth: null, level: 0, experience: 0, totalIncomeJpy: 0, completedActions: 0 },
      own_product: { unlockedAtMonth: null, level: 0, experience: 0, totalIncomeJpy: 0, completedActions: 0 },
    },
    totalIncomeJpy: 0,
  }
}

export function createInitialGameSaveState(language: Language): GameSaveState {
  return {
    language,
    screen: 'event',
    month: 8,
    year: 2024,
    stats: { ...initialGameStats },
    flags: [],
    completedEventIds: [],
    history: [],
    currentEventId: 'main-00-arrival',
    resolution: null,
    startedAt: null,
    progress: { ...initialVolumeProgress },
    activeMiniGame: null,
    sideHustles: createInitialSideHustleState(),
    monthlyPlan: null,
    monthlySettlements: [],
    debtFreeChoiceId: null,
  }
}
