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
  | 'time-passage'
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
  | { type: 'foodLifestyle'; value: FoodLifestyle }
  | { type: 'smokingLevel'; value: SmokingLevel }
  | { type: 'foodLifestyleMonths'; operator: ComparisonOperator; value: number }
  | { type: 'featureUnlock'; featureId: UnlockableFeatureId; state: UnlockState }
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
  title: LocalizedText
  resultTitle: LocalizedText
  stages: readonly MiniGameStageConfig[]
  results: Record<MiniGameGrade, Omit<MiniGameResult, 'score' | 'grade'>>
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
  monthlyCost?: { category: 'smoking'; amountJpy: number }
  unlockChanges?: FeatureUnlockChange[]
  monthlyActionGrants?: MonthlyActionGrant[]
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
  repeatable?: { cooldownMonths: number }
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
  livingProfile: LivingProfile
  eventOccurrences?: Record<string, number[]>
}

export type ChoiceHistoryEntry = {
  eventId: string
  optionId: string
  chosenAt: string
  elapsedMonth?: number
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

export type UnlockState = 'hidden' | 'discovered' | 'unlocked'

export type UnlockableFeatureId = 'side_hustle' | SideHustleRouteId

export type FeatureUnlockState = {
  state: UnlockState
  discoveredAtMonth: number | null
  unlockedAtMonth: number | null
  sourceEventId: string | null
}

export type FeatureUnlockChange = {
  featureId: UnlockableFeatureId
  state: Exclude<UnlockState, 'hidden'>
}

export type SideHustleRouteState = FeatureUnlockState & {
  level: number
  experience: number
  totalIncomeJpy: number
  completedActions: number
}

export type SideHustleState = {
  discovery: FeatureUnlockState
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

export type MonthlyActionAvailabilityStatus = 'available' | 'unavailable' | 'temporary'

export type MonthlyActionAvailability = {
  actionId: string
  status: MonthlyActionAvailabilityStatus
  reason?: LocalizedText
  sourceEventId?: string
}

export type MonthlyActionGrant = {
  actionId: string
  reason: LocalizedText
}

export type FoodLifestyle = 'survival' | 'frugal' | 'balanced' | 'comfortable'
export type SmokingLevel = 'none' | 'light' | 'regular' | 'heavy'

export type StagePolicyId = 'balanced' | 'recovery' | 'career' | 'study' | 'debt' | 'side_hustle'

export type TimePassageCauseId =
  | 'quiet'
  | 'illness'
  | 'project_crunch'
  | 'game_absorption'
  | 'side_hustle_sprint'

export type EmploymentState = {
  baseSalaryJpy: number
  roleAllowanceJpy: number
  mentorAllowanceJpy: number
  overtimeIncomeJpy: number
  isMentoringJunior: boolean
  lastSalaryReviewMonth: number
}

export type IncomeBreakdown = {
  baseSalaryJpy: number
  roleAllowanceJpy: number
  mentorAllowanceJpy: number
  overtimeIncomeJpy: number
  totalIncomeJpy: number
  raiseJpy: number
}

export type LivingProfile = {
  foodLifestyle: FoodLifestyle
  consecutiveFoodLifestyleMonths: number
  smokingLevel: SmokingLevel
  stressSmokingCount: number
}

export type FixedExpenseItem = {
  id: 'rent' | 'food' | 'utilities' | 'telecom' | 'transport' | 'smoking' | 'other_basic'
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
  income: IncomeBreakdown
  foodLifestyle: FoodLifestyle
  smokingLevel: SmokingLevel
  stagePolicy: StagePolicyId
  extraSmokingJpy: number
  actionAvailability: MonthlyActionAvailability[]
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
  livingEffects: GameEffects
  exchangeRate: number
  salaryJpy: number
  income: IncomeBreakdown
  sideHustleIncomeJpy: number
  stagePolicy: StagePolicyId
  foodLifestyle: FoodLifestyle
  smokingLevel: SmokingLevel
  foodCostJpy: number
  smokingCostJpy: number
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

export type TimePassageMonthSummary = {
  elapsedMonth: number
  year: number
  month: number
  debtRmbAfter: number
  cashJpyAfter: number
  healthAfter: number
  mentalAfter: number
  stressAfter: number
  actions: LocalizedText[]
}

export type TimePassageState = {
  causeId: TimePassageCauseId
  policy: StagePolicyId
  fromElapsedMonth: number
  toElapsedMonth: number
  skippedMonths: number
  statsBefore: GameStats
  statsAfter: GameStats
  months: TimePassageMonthSummary[]
  resumeEventId: string | null
}

export type TimePassageRecord = {
  causeId: TimePassageCauseId
  fromElapsedMonth: number
  toElapsedMonth: number
}

export type GameSaveState = {
  language: Language
  screen: GameScreen
  month: number
  year: number
  stats: GameStats
  flags: string[]
  completedEventIds: string[]
  eventOccurrences: Record<string, number[]>
  history: ChoiceHistoryEntry[]
  currentEventId: string | null
  resolution: ChoiceResolution | null
  startedAt: string | null
  progress: VolumeProgress
  activeMiniGame: MiniGameSession | null
  monthlyEventSlot: MonthlyEventSlotState | null
  sideHustles: SideHustleState
  employment: EmploymentState
  livingProfile: LivingProfile
  monthlyPlan: MonthlyPlan | null
  monthlySettlements: MonthSettlement[]
  timePassage: TimePassageState | null
  timePassageHistory: TimePassageRecord[]
  debtFreeChoiceId: string | null
}
