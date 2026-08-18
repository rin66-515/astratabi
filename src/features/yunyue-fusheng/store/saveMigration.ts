import {
  createInitialGameSaveState,
  createInitialSideHustleState,
  initialEmploymentState,
  initialGameStats,
  initialLivingProfile,
  initialVolumeProgress,
} from '../data/initialState'
import { sideHustleRouteIds } from '../engine/sideHustleResolver'
import { MONTHLY_AP_OVERDRAFT_LIMIT } from '../engine/recoveryResolver'
import type {
  GameEffects,
  EmploymentState,
  FoodLifestyle,
  GameSaveState,
  GameScreen,
  GameStats,
  FixedExpenseItem,
  Language,
  LivingProfile,
  MonthSettlement,
  MiniGameResult,
  MiniGameSession,
  MiniGameType,
  MonthlyEventKind,
  MonthlyEventSlotState,
  MonthlyActionSelection,
  MonthlyPlan,
  SideHustleActionOutcome,
  SideHustleRouteId,
  SideHustleState,
  SmokingLevel,
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

function foodLifestyleOf(value: unknown): FoodLifestyle {
  return value === 'survival' || value === 'balanced' || value === 'comfortable' ? value : 'frugal'
}

function smokingLevelOf(value: unknown): SmokingLevel {
  return value === 'none' || value === 'light' || value === 'heavy' ? value : 'regular'
}

function migrateEmployment(value: unknown, legacySalaryJpy: number): EmploymentState {
  if (!isRecord(value)) return { ...initialEmploymentState, baseSalaryJpy: legacySalaryJpy }
  return {
    baseSalaryJpy: Math.max(0, finiteNumber(value.baseSalaryJpy, legacySalaryJpy)),
    roleAllowanceJpy: Math.max(0, finiteNumber(value.roleAllowanceJpy, 0)),
    mentorAllowanceJpy: Math.max(0, finiteNumber(value.mentorAllowanceJpy, 0)),
    overtimeIncomeJpy: Math.max(0, finiteNumber(value.overtimeIncomeJpy, 0)),
    isMentoringJunior: value.isMentoringJunior === true,
    lastSalaryReviewMonth: Math.max(0, Math.floor(finiteNumber(value.lastSalaryReviewMonth, 0))),
  }
}

function migrateLivingProfile(value: unknown): LivingProfile {
  if (!isRecord(value)) return { ...initialLivingProfile }
  return {
    foodLifestyle: foodLifestyleOf(value.foodLifestyle),
    consecutiveFoodLifestyleMonths: Math.max(0, Math.floor(finiteNumber(value.consecutiveFoodLifestyleMonths, 0))),
    smokingLevel: smokingLevelOf(value.smokingLevel),
    stressSmokingCount: Math.max(0, Math.floor(finiteNumber(value.stressSmokingCount, 0))),
  }
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
    || value === 'monthly-minigame'
    ? value
    : 'event'
}

function monthlyEventKindOf(value: unknown): MonthlyEventKind | null {
  return value === 'normal' || value === 'major' || value === 'minigame' ? value : null
}

function miniGameTypeOf(value: unknown): MiniGameType | null {
  return value === 'read_the_air' || value === 'incident_response' || value === 'design_review'
    ? value
    : null
}

function migrateMiniGameResult(value: unknown): MiniGameResult | null {
  if (!isRecord(value) || !isRecord(value.effects)) return null
  const grade = value.grade === 'S' || value.grade === 'A' || value.grade === 'B'
    || value.grade === 'C' || value.grade === 'D'
    ? value.grade
    : undefined
  const resultText = isRecord(value.resultText)
    && typeof value.resultText.zh === 'string'
    && typeof value.resultText.ja === 'string'
    ? { zh: value.resultText.zh, ja: value.resultText.ja }
    : undefined
  return {
    score: typeof value.score === 'number' && Number.isFinite(value.score) ? value.score : undefined,
    grade,
    effects: value.effects as GameEffects,
    flags: stringArray(value.flags),
    resultText,
  }
}

function migrateMiniGameSession(value: unknown): MiniGameSession | null {
  if (!isRecord(value)) return null
  const type = miniGameTypeOf(value.type)
  if (
    !type
    || typeof value.eventId !== 'string'
    || typeof value.configId !== 'string'
    || typeof value.stageIndex !== 'number'
    || !isRecord(value.answers)
  ) return null
  const answers = Object.fromEntries(
    Object.entries(value.answers).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
  const stageStartedAt = typeof value.stageStartedAt === 'string'
    ? value.stageStartedAt
    : new Date().toISOString()
  return {
    eventId: value.eventId,
    configId: value.configId,
    type,
    stageIndex: Math.max(0, Math.floor(value.stageIndex)),
    answers,
    stageStartedAt,
    deadlineAt: typeof value.deadlineAt === 'string' ? value.deadlineAt : null,
    result: migrateMiniGameResult(value.result),
  }
}

function migrateMonthlyEventSlot(value: unknown): MonthlyEventSlotState | null {
  if (!isRecord(value)) return null
  const kind = monthlyEventKindOf(value.kind)
  const eventId = typeof value.eventId === 'string' ? value.eventId : null
  const status = value.status === 'pending'
    || value.status === 'mini_game_pending'
    || value.status === 'completed'
    ? value.status
    : 'none'
  const miniGameType = isRecord(value.miniGame) ? miniGameTypeOf(value.miniGame.type) : null
  const miniGame = isRecord(value.miniGame)
    && miniGameType
    && typeof value.miniGame.configId === 'string'
    ? { type: miniGameType, configId: value.miniGame.configId }
    : null
  return {
    elapsedMonth: Math.max(1, finiteNumber(value.elapsedMonth, 1)),
    kind,
    eventId,
    status,
    miniGame,
  }
}

function sideHustleRouteIdOf(value: unknown): SideHustleRouteId | null {
  return typeof value === 'string' && sideHustleRouteIds.includes(value as SideHustleRouteId)
    ? value as SideHustleRouteId
    : null
}

function migrateSideHustleOutcome(value: unknown): SideHustleActionOutcome | undefined {
  if (!isRecord(value)) return undefined
  const routeId = sideHustleRouteIdOf(value.routeId)
  if (!routeId) return undefined
  return {
    routeId,
    experience: Math.max(0, finiteNumber(value.experience, 0)),
    incomeJpy: Math.max(0, finiteNumber(value.incomeJpy, 0)),
  }
}

function migrateSideHustles(value: unknown): SideHustleState {
  const fallback = createInitialSideHustleState()
  if (!isRecord(value) || !isRecord(value.routes)) return fallback
  const routes = { ...fallback.routes }
  for (const routeId of sideHustleRouteIds) {
    const route = value.routes[routeId]
    if (!isRecord(route)) continue
    routes[routeId] = {
      unlockedAtMonth: route.unlockedAtMonth === null
        ? null
        : Math.max(1, finiteNumber(route.unlockedAtMonth, 0)) || null,
      level: Math.max(0, Math.floor(finiteNumber(route.level, 0))),
      experience: Math.max(0, finiteNumber(route.experience, 0)),
      totalIncomeJpy: Math.max(0, finiteNumber(route.totalIncomeJpy, 0)),
      completedActions: Math.max(0, Math.floor(finiteNumber(route.completedActions, 0))),
    }
  }
  return {
    routes,
    totalIncomeJpy: Math.max(
      0,
      finiteNumber(value.totalIncomeJpy, Object.values(routes).reduce((sum, route) => sum + route.totalIncomeJpy, 0)),
    ),
  }
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
    sideHustle: migrateSideHustleOutcome(value.sideHustle),
  }
}

function migrateFixedExpenses(value: unknown): FixedExpenseItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry): FixedExpenseItem[] => {
    if (!isRecord(entry)) return []
    const id = entry.id === 'transport_daily' ? 'transport' : entry.id
    if (id !== 'rent' && id !== 'food' && id !== 'utilities' && id !== 'telecom'
      && id !== 'transport' && id !== 'smoking' && id !== 'other_basic') return []
    return [{ id, amountJpy: Math.max(0, finiteNumber(entry.amountJpy, 0)) }]
  })
}

function migrateMonthlyPlan(
  value: unknown,
  fallbackCashJpy: number,
  fallbackSalaryJpy: number,
  livingProfile: LivingProfile,
): MonthlyPlan | null {
  if (!isRecord(value)) return null
  const selectedActions = Array.isArray(value.selectedActions)
    ? value.selectedActions.map(migrateActionSelection).filter((action): action is MonthlyActionSelection => action !== null)
    : []
  const granted = Math.max(0, finiteNumber(value.actionPointsGranted, 0))
  return {
    elapsedMonth: Math.max(1, finiteNumber(value.elapsedMonth, 1)),
    year: finiteNumber(value.year, 2024),
    month: finiteNumber(value.month, 8),
    openingCashJpy: Math.max(0, finiteNumber(value.openingCashJpy, fallbackCashJpy)),
    actionPointsGranted: granted,
    actionPointsRemaining: Math.min(
      granted,
      Math.max(MONTHLY_AP_OVERDRAFT_LIMIT, finiteNumber(value.actionPointsRemaining, granted)),
    ),
    exchangeRate: Math.max(0, finiteNumber(value.exchangeRate, initialGameStats.exchangeRate)),
    income: isRecord(value.income)
      ? {
          baseSalaryJpy: Math.max(0, finiteNumber(value.income.baseSalaryJpy, fallbackSalaryJpy)),
          roleAllowanceJpy: Math.max(0, finiteNumber(value.income.roleAllowanceJpy, 0)),
          mentorAllowanceJpy: Math.max(0, finiteNumber(value.income.mentorAllowanceJpy, 0)),
          overtimeIncomeJpy: Math.max(0, finiteNumber(value.income.overtimeIncomeJpy, 0)),
          totalIncomeJpy: Math.max(0, finiteNumber(value.income.totalIncomeJpy, fallbackSalaryJpy)),
          raiseJpy: Math.max(0, finiteNumber(value.income.raiseJpy, 0)),
        }
      : {
          baseSalaryJpy: fallbackSalaryJpy,
          roleAllowanceJpy: 0,
          mentorAllowanceJpy: 0,
          overtimeIncomeJpy: 0,
          totalIncomeJpy: fallbackSalaryJpy,
          raiseJpy: 0,
        },
    foodLifestyle: foodLifestyleOf(value.foodLifestyle ?? livingProfile.foodLifestyle),
    smokingLevel: smokingLevelOf(value.smokingLevel ?? livingProfile.smokingLevel),
    extraSmokingJpy: Math.max(0, finiteNumber(value.extraSmokingJpy, 0)),
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
  const actionPointsGranted = Math.max(0, finiteNumber(value.actionPointsGranted, 0))
  const actionPointsSpent = Math.max(0, finiteNumber(value.actionPointsSpent, 0))
  const fixedExpenses = migrateFixedExpenses(value.fixedExpenses)
  return {
    elapsedMonth: Math.max(1, finiteNumber(value.elapsedMonth, 1)),
    year: finiteNumber(value.year, 2024),
    month: finiteNumber(value.month, 8),
    cashJpyBefore: Math.max(0, finiteNumber(value.cashJpyBefore, 0)),
    debtRmbBefore: Math.max(0, finiteNumber(value.debtRmbBefore, 0)),
    actionPointsGranted,
    actionPointsSpent,
    actionPointsOverdrawn: Math.max(0, finiteNumber(value.actionPointsOverdrawn, 0)),
    actionIntensity: Math.max(
      0,
      finiteNumber(value.actionIntensity, actionPointsGranted > 0 ? actionPointsSpent / actionPointsGranted : 0),
    ),
    negativeActionPointMonth: value.negativeActionPointMonth === true,
    consequenceEffects: isRecord(value.consequenceEffects) ? value.consequenceEffects as GameEffects : {},
    livingEffects: isRecord(value.livingEffects) ? value.livingEffects as GameEffects : {},
    exchangeRate: Math.max(0, finiteNumber(value.exchangeRate, initialGameStats.exchangeRate)),
    salaryJpy: Math.max(0, finiteNumber(value.salaryJpy, 0)),
    income: isRecord(value.income)
      ? {
          baseSalaryJpy: Math.max(0, finiteNumber(value.income.baseSalaryJpy, finiteNumber(value.salaryJpy, 0))),
          roleAllowanceJpy: Math.max(0, finiteNumber(value.income.roleAllowanceJpy, 0)),
          mentorAllowanceJpy: Math.max(0, finiteNumber(value.income.mentorAllowanceJpy, 0)),
          overtimeIncomeJpy: Math.max(0, finiteNumber(value.income.overtimeIncomeJpy, 0)),
          totalIncomeJpy: Math.max(0, finiteNumber(value.income.totalIncomeJpy, finiteNumber(value.salaryJpy, 0))),
          raiseJpy: Math.max(0, finiteNumber(value.income.raiseJpy, 0)),
        }
      : {
          baseSalaryJpy: Math.max(0, finiteNumber(value.salaryJpy, 0)),
          roleAllowanceJpy: 0,
          mentorAllowanceJpy: 0,
          overtimeIncomeJpy: 0,
          totalIncomeJpy: Math.max(0, finiteNumber(value.salaryJpy, 0)),
          raiseJpy: 0,
        },
    sideHustleIncomeJpy: Math.max(0, finiteNumber(value.sideHustleIncomeJpy, 0)),
    foodLifestyle: foodLifestyleOf(value.foodLifestyle),
    smokingLevel: smokingLevelOf(value.smokingLevel),
    foodCostJpy: Math.max(0, finiteNumber(
      value.foodCostJpy,
      fixedExpenses.find((expense) => expense.id === 'food')?.amountJpy ?? 0,
    )),
    smokingCostJpy: Math.max(0, finiteNumber(
      value.smokingCostJpy,
      fixedExpenses.find((expense) => expense.id === 'smoking')?.amountJpy ?? 0,
    )),
    fixedExpenses,
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
  const stats = migrateStats(persistedState.stats)
  const employment = migrateEmployment(persistedState.employment, stats.salaryJpy)
  const livingProfile = migrateLivingProfile(persistedState.livingProfile)
  const storedScreen = screenOf(persistedState.screen)
  const activeMiniGame = migrateMiniGameSession(persistedState.activeMiniGame)
  const migratedMonthlyEventSlot = migrateMonthlyEventSlot(persistedState.monthlyEventSlot)
  const recoverLegacyMiniGame = storedScreen === 'monthly-minigame' && activeMiniGame === null
  return {
    language,
    screen: recoverLegacyMiniGame ? 'monthly-cycle' : storedScreen,
    month: finiteNumber(persistedState.month, fallback.month),
    year: finiteNumber(persistedState.year, fallback.year),
    stats,
    flags: stringArray(persistedState.flags),
    completedEventIds: stringArray(persistedState.completedEventIds),
    history: Array.isArray(persistedState.history) ? persistedState.history as GameSaveState['history'] : [],
    currentEventId: typeof persistedState.currentEventId === 'string' ? persistedState.currentEventId : null,
    resolution: isRecord(persistedState.resolution) ? persistedState.resolution as GameSaveState['resolution'] : null,
    startedAt: typeof persistedState.startedAt === 'string' ? persistedState.startedAt : null,
    progress: migrateProgress(persistedState.progress),
    activeMiniGame,
    monthlyEventSlot: recoverLegacyMiniGame && migratedMonthlyEventSlot
      ? { ...migratedMonthlyEventSlot, status: 'completed' }
      : migratedMonthlyEventSlot,
    sideHustles: migrateSideHustles(persistedState.sideHustles),
    employment,
    livingProfile,
    monthlyPlan: migrateMonthlyPlan(persistedState.monthlyPlan, stats.cashJpy, stats.salaryJpy, livingProfile),
    monthlySettlements: Array.isArray(persistedState.monthlySettlements)
      ? persistedState.monthlySettlements.map(migrateSettlement).filter((settlement): settlement is MonthSettlement => settlement !== null)
      : [],
    debtFreeChoiceId: typeof persistedState.debtFreeChoiceId === 'string'
      ? persistedState.debtFreeChoiceId
      : null,
  }
}
