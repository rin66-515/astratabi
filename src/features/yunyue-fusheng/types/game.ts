export type Language = 'zh' | 'ja'

export type LocalizedText = {
  zh: string
  ja: string
}

export type GameScreen = 'event' | 'month-intro' | 'month-summary' | 'preview'

export type GameStats = {
  debtRmb: number
  cashJpy: number
  salaryJpy: number
  exchangeRate: number
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

export type EventCategory = 'main' | 'work' | 'health' | 'finance' | 'social' | 'life'

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
  effects?: GameEffects
  addFlags?: string[]
  removeFlags?: string[]
  response?: LocalizedText[]
  consequences?: ConditionalConsequence[]
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
  options: EventOption[]
}

export type EventContext = {
  month: number
  stats: GameStats
  flags: string[]
  completedEventIds: string[]
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
