export type Language = 'zh' | 'ja'

export type LocalizedText = {
  zh: string
  ja: string
}

export type GameScreen =
  | 'event'
  | 'monthly-minigame'
  | 'month-intro'
  | 'month-summary'
  | 'preview'
  | 'monthly-cycle'
  | 'month-settlement'
  | 'annual-report'
  | 'stage-ending'
  | 'debt-free-month'
  | 'debt-free-scene'
  | 'final-ending'

export type VolumePhase = 'normal' | 'annual_report' | 'stage_ending' | 'debt_free_month' | 'final_ending'

export type GameStats = {
  debtRmb: number
  cashJpy: number
  salaryJpy: number
  exchangeRate: number
  minimumPaymentRmb: number
  debtInterestRate: number
  actionPoints: number
  health: number
  mental: number
  socialBattery: number
  freedom: number
  japanese: number
  tech: number
  workplace: number
  product: number
  stress: number
  recoveryDebt: number
  lossOfControl: number
  obsession: number
  lifePoverty: number
  workTrust: number
  debtStress: number
  observerActivity: number
  boundary: number
}

export type StatKey = keyof GameStats
export type GameEffects = Partial<Record<StatKey, number>>

export type ComparisonOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'

export type EventCondition =
  | { type: 'stat'; stat: StatKey; operator: ComparisonOperator; value: number }
  | { type: 'flag'; flag: string; present?: boolean }
  | { type: 'completedEvent'; eventId: string; completed?: boolean }
  | { type: 'month'; operator: ComparisonOperator; value: number }
  | { type: 'elapsedMonth'; operator: ComparisonOperator; value: number }
  | {
    type: 'sideHustle'
    routeId: SideHustleRouteId
    field: 'level' | 'completedActions' | 'totalIncomeJpy'
    operator: ComparisonOperator
    value: number
  }

export type EventCategory = 'main' | 'work' | 'health' | 'finance' | 'social' | 'life' | 'institution' | 'family' | 'sidejob'

export type OptionTone = 'realistic' | 'jianghu' | 'absurd' | 'dao'

export type StageEndingId =
  | 'stage_debt_continues'
  | 'stage_burnout'
  | 'stage_golden_cage'
  | 'stage_escape_paradise'
  | 'stage_rooted_abroad'
  | 'stage_new_path'
  | 'stage_boundary_awakened'

export type FinalEndingId =
  | 'debt_free'
  | 'burnout'
  | 'golden_cage'
  | 'escape_paradise'
  | 'rooted_abroad'
  | 'new_path'
  | 'boundary_awakened'
  | 'yuzhe'

export type MiniGameType = 'read_the_air' | 'incident_response' | 'design_review'
export type MiniGameGrade = 'S' | 'A' | 'B' | 'C' | 'D'

export type MiniGameResult = {
  score?: number
  grade?: MiniGameGrade
  effects: GameEffects
  flags?: string[]
  resultText?: LocalizedText
}

export type MiniGameTimeout = {
  resultText: LocalizedText
  score?: number
  effects?: GameEffects
  flags?: string[]
  completesMiniGame?: boolean
}

export type MiniGameStageOption = {
  id: string
  label: LocalizedText
  response: LocalizedText
  score: number
  tone?: OptionTone
}

export type MiniGameStageConfig = {
  id: string
  speaker: LocalizedText
  prompt: LocalizedText[]
  timeLimitMs?: number
  timeout?: MiniGameTimeout
  options: readonly MiniGameStageOption[]
}

export type MiniGameConfig = {
  id: string
  type: MiniGameType
  stages: readonly MiniGameStageConfig[]
}

export type MiniGameTrigger = {
  type: MiniGameType
  configId: string
}

export type MiniGameSession = {
  eventId: string
  configId: string
  type: MiniGameType
  stageIndex: number
  answers: Record<string, string>
  stageStartedAt: string
  deadlineAt: string | null
  result: MiniGameResult | null
}

export type ConditionalConsequence = {
  conditions: EventCondition[]
  chance?: number
  effects?: GameEffects
  addFlags?: string[]
  response?: LocalizedText[]
}

export type EventOption = {
  id: string
  label: LocalizedText
  tone?: OptionTone
  effects?: GameEffects
  addFlags?: string[]
  removeFlags?: string[]
  response?: LocalizedText[]
  consequences?: ConditionalConsequence[]
  /** Existing MVP compatibility; migrate content to tone: 'jianghu' in the event integration slice. */
  fantasy?: boolean
}

export type GameEvent = {
  id: string
  title: LocalizedText
  category: EventCategory
  text: LocalizedText[]
  observer?: LocalizedText[]
  month?: number
  order?: number
  conditions?: EventCondition[]
  weight?: number
  onComplete?: GameScreen
  miniGame?: MiniGameTrigger
  options: EventOption[]
}

export type MonthlyEventKind = 'normal' | 'major' | 'minigame'

export type MonthlyEventDefinition = {
  kind: MonthlyEventKind
  event: GameEvent
  weightRules?: MonthlyEventWeightRule[]
}

export type MonthlyEventWeightRule = {
  conditions: EventCondition[]
  multiplier: number
}

export type MonthlyEventSlotStatus = 'none' | 'pending' | 'mini_game_pending' | 'completed'

export type MonthlyEventSlotState = {
  elapsedMonth: number
  kind: MonthlyEventKind | null
  eventId: string | null
  status: MonthlyEventSlotStatus
  miniGame: MiniGameTrigger | null
}

export type EventContext = {
  month: number
  elapsedMonth: number
  stats: GameStats
  flags: string[]
  completedEventIds: string[]
  sideHustles: SideHustleState
}

export type ChoiceHistoryEntry = {
  eventId: string
  optionId: string
  chosenAt: string
}

export type ChoiceResolution = {
  eventId: string
  optionId: string
  effects: GameEffects
  response: LocalizedText[]
}

export type VolumeProgress = {
  phase: VolumePhase
  elapsedMonths: number
  stageDeadlineMonths: number
  debtClearedMonth: number | null
  completedAnnualReportYears: number[]
  resolvedStageEndingMonths: number[]
  debtFreeMonthStarted: boolean
  debtFreeMonthCompleted: boolean
  stageEnding: StageEndingId | null
  finalEnding: FinalEndingId | null
}

export type MonthlyActionSource = 'core' | 'sidejob'

export type SideHustleRouteId = 'freelance' | 'it_materials' | 'content_account' | 'own_product'

export type SideHustleRouteState = {
  unlockedAtMonth: number | null
  level: number
  experience: number
  totalIncomeJpy: number
  completedActions: number
}

export type SideHustleState = {
  routes: Record<SideHustleRouteId, SideHustleRouteState>
  totalIncomeJpy: number
}

export type SideHustleActionOutcome = {
  routeId: SideHustleRouteId
  experience: number
  incomeJpy: number
}

export type MonthlyActionDefinition = {
  id: string
  source: MonthlyActionSource
  label: LocalizedText
  description: LocalizedText
  actionPointCost: number
  effects: GameEffects
  sideHustle?: SideHustleActionOutcome
}

export type MonthlyActionContext = {
  elapsedMonth: number
  stats: GameStats
  flags: string[]
  sideHustles: SideHustleState
}

export type MonthlyActionProvider = (context: MonthlyActionContext) => readonly MonthlyActionDefinition[]

export type MonthlyActionSelection = {
  actionId: string
  source: MonthlyActionSource
  label: LocalizedText
  actionPointCost: number
  effects: GameEffects
  sideHustle?: SideHustleActionOutcome
}

export type FixedExpenseItem = {
  id: 'rent' | 'food' | 'utilities' | 'telecom' | 'transport_daily'
  amountJpy: number
}

export type MonthlyPlan = {
  elapsedMonth: number
  year: number
  month: number
  openingCashJpy: number
  actionPointsGranted: number
  actionPointsRemaining: number
  exchangeRate: number
  selectedActions: MonthlyActionSelection[]
  extraPaymentRmb: number
}

export type MonthSettlement = {
  elapsedMonth: number
  year: number
  month: number
  cashJpyBefore: number
  debtRmbBefore: number
  actionPointsGranted: number
  actionPointsSpent: number
  actionPointsOverdrawn: number
  actionIntensity: number
  negativeActionPointMonth: boolean
  consequenceEffects: GameEffects
  exchangeRate: number
  salaryJpy: number
  sideHustleIncomeJpy: number
  fixedExpenses: FixedExpenseItem[]
  fixedExpensesJpy: number
  interestRmb: number
  minimumPaymentRmb: number
  extraPaymentRmb: number
  paymentRmb: number
  paymentJpy: number
  cashJpyAfter: number
  debtRmbAfter: number
  actions: MonthlyActionSelection[]
}

export type GameSaveState = {
  language: Language
  screen: GameScreen
  month: number
  year: number
  stats: GameStats
  flags: string[]
  completedEventIds: string[]
  history: ChoiceHistoryEntry[]
  currentEventId: string | null
  resolution: ChoiceResolution | null
  startedAt: string | null
  progress: VolumeProgress
  activeMiniGame: MiniGameSession | null
  monthlyEventSlot: MonthlyEventSlotState | null
  sideHustles: SideHustleState
  monthlyPlan: MonthlyPlan | null
  monthlySettlements: MonthSettlement[]
  debtFreeChoiceId: string | null
}
