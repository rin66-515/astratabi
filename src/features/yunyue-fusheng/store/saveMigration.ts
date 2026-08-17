import { createInitialGameSaveState, initialGameStats, initialVolumeProgress } from '../data/initialState'
import type {
  GameEffects,
  GameSaveState,
  GameScreen,
  GameStats,
  Language,
  MonthSettlement,
  MonthlyActionSelection,
  MonthlyPlan,
  StatKey,
  VolumeProgress,
} from '../types/game'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
    : []
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function migrateStats(value: unknown): GameStats {
  if (!isRecord(value)) return { ...initialGameStats }
  const stats = { ...initialGameStats }
  for (const key of Object.keys(initialGameStats) as StatKey[]) {
    stats[key] = finiteNumber(value[key], initialGameStats[key])
  }
  return stats
}

function migrateProgress(value: unknown): VolumeProgress {
  if (!isRecord(value)) return { ...initialVolumeProgress }
  return {
    phase: value.phase === 'annual_report'
      || value.phase === 'stage_ending'
      || value.phase === 'debt_free_month'
      || value.phase === 'final_ending'
      ? value.phase
      : 'normal',
    elapsedMonths: finiteNumber(value.elapsedMonths, initialVolumeProgress.elapsedMonths),
    stageDeadlineMonths: finiteNumber(value.stageDeadlineMonths, initialVolumeProgress.stageDeadlineMonths),
    debtClearedMonth: value.debtClearedMonth === null
      ? null
      : finiteNumber(value.debtClearedMonth, initialVolumeProgress.debtClearedMonth ?? 0) || null,
    completedAnnualReportYears: numberArray(value.completedAnnualReportYears),
    resolvedStageEndingMonths: numberArray(value.resolvedStageEndingMonths),
    debtFreeMonthStarted: value.debtFreeMonthStarted === true,
    debtFreeMonthCompleted: value.debtFreeMonthCompleted === true,
    stageEnding: typeof value.stageEnding === 'string' ? value.stageEnding as VolumeProgress['stageEnding'] : null,
    finalEnding: typeof value.finalEnding === 'string' ? value.finalEnding as VolumeProgress['finalEnding'] : null,
  }
}

function languageOf(value: unknown): Language {
  return value === 'ja' ? 'ja' : 'zh'
}

function screenOf(value: unknown): GameScreen {
  return value === 'month-intro'
    || value === 'month-summary'
    || value === 'preview'
    || value === 'monthly-cycle'
    || value === 'month-settlement'
    || value === 'annual-report'
    || value === 'stage-ending'
    || value === 'debt-free-month'
    || value === 'debt-free-scene'
    || value === 'final-ending'
    ? value
    : 'event'
}

function migrateActionSelection(value: unknown): MonthlyActionSelection | null {
  if (!isRecord(value) || typeof value.actionId !== 'string') return null
  return {
    actionId: value.actionId,
    source: value.source === 'sidejob' ? 'sidejob' : 'core',
    label: isRecord(value.label)
      && typeof value.label.zh === 'string'
      && typeof value.label.ja === 'string'
      ? { zh: value.label.zh, ja: value.label.ja }
      : { zh: value.actionId, ja: value.actionId },
    actionPointCost: Math.max(0, finiteNumber(value.actionPointCost, 0)),
    effects: isRecord(value.effects) ? value.effects as GameEffects : {},
  }
}

function migrateMonthlyPlan(value: unknown): MonthlyPlan | null {
  if (!isRecord(value)) return null
  const selectedActions = Array.isArray(value.selectedActions)
    ? value.selectedActions.map(migrateActionSelection).filter((action): action is MonthlyActionSelection => action !== null)
    : []
  const granted = Math.max(0, finiteNumber(value.actionPointsGranted, 0))
  return {
    elapsedMonth: Math.max(1, finiteNumber(value.elapsedMonth, 1)),
    year: finiteNumber(value.year, 2024),
    month: finiteNumber(value.month, 8),
    actionPointsGranted: granted,
    actionPointsRemaining: Math.min(granted, Math.max(0, finiteNumber(value.actionPointsRemaining, granted))),
    exchangeRate: Math.max(0, finiteNumber(value.exchangeRate, initialGameStats.exchangeRate)),
    selectedActions,
    extraPaymentRmb: Math.max(0, finiteNumber(value.extraPaymentRmb, 0)),
  }
}

function migrateSettlement(value: unknown): MonthSettlement | null {
  if (!isRecord(value)) return null
  const actions = Array.isArray(value.actions)
    ? value.actions.map(migrateActionSelection).filter((action): action is MonthlyActionSelection => action !== null)
    : []
  const paymentRmb = Math.max(0, finiteNumber(value.paymentRmb, 0))
  return {
    elapsedMonth: Math.max(1, finiteNumber(value.elapsedMonth, 1)),
    year: finiteNumber(value.year, 2024),
    month: finiteNumber(value.month, 8),
    cashJpyBefore: Math.max(0, finiteNumber(value.cashJpyBefore, 0)),
    debtRmbBefore: Math.max(0, finiteNumber(value.debtRmbBefore, 0)),
    actionPointsGranted: Math.max(0, finiteNumber(value.actionPointsGranted, 0)),
    actionPointsSpent: Math.max(0, finiteNumber(value.actionPointsSpent, 0)),
    exchangeRate: Math.max(0, finiteNumber(value.exchangeRate, initialGameStats.exchangeRate)),
    salaryJpy: Math.max(0, finiteNumber(value.salaryJpy, 0)),
    fixedExpenses: Array.isArray(value.fixedExpenses)
      ? value.fixedExpenses as MonthSettlement['fixedExpenses']
      : [],
    fixedExpensesJpy: Math.max(0, finiteNumber(value.fixedExpensesJpy, 0)),
    interestRmb: Math.max(0, finiteNumber(value.interestRmb, 0)),
    minimumPaymentRmb: Math.max(0, finiteNumber(value.minimumPaymentRmb, paymentRmb)),
    extraPaymentRmb: Math.max(0, finiteNumber(value.extraPaymentRmb, 0)),
    paymentRmb,
    paymentJpy: Math.max(0, finiteNumber(value.paymentJpy, 0)),
    cashJpyAfter: Math.max(0, finiteNumber(value.cashJpyAfter, 0)),
    debtRmbAfter: Math.max(0, finiteNumber(value.debtRmbAfter, 0)),
    actions,
  }
}

export function migrateGameSave(persistedState: unknown, persistedVersion: number): GameSaveState {
  void persistedVersion
  if (!isRecord(persistedState)) return createInitialGameSaveState('zh')

  const language = languageOf(persistedState.language)
  const fallback = createInitialGameSaveState(language)
  return {
    language,
    screen: screenOf(persistedState.screen),
    month: finiteNumber(persistedState.month, fallback.month),
    year: finiteNumber(persistedState.year, fallback.year),
    stats: migrateStats(persistedState.stats),
    flags: stringArray(persistedState.flags),
    completedEventIds: stringArray(persistedState.completedEventIds),
    history: Array.isArray(persistedState.history) ? persistedState.history as GameSaveState['history'] : [],
    currentEventId: typeof persistedState.currentEventId === 'string' ? persistedState.currentEventId : null,
    resolution: isRecord(persistedState.resolution) ? persistedState.resolution as GameSaveState['resolution'] : null,
    startedAt: typeof persistedState.startedAt === 'string' ? persistedState.startedAt : null,
    progress: migrateProgress(persistedState.progress),
    activeMiniGame: null,
    monthlyPlan: migrateMonthlyPlan(persistedState.monthlyPlan),
    monthlySettlements: Array.isArray(persistedState.monthlySettlements)
      ? persistedState.monthlySettlements.map(migrateSettlement).filter((settlement): settlement is MonthSettlement => settlement !== null)
      : [],
    debtFreeChoiceId: typeof persistedState.debtFreeChoiceId === 'string'
      ? persistedState.debtFreeChoiceId
      : null,
  }
}
