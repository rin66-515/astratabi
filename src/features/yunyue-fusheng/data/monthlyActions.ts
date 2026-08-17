import type {
  MonthlyActionContext,
  MonthlyActionDefinition,
  MonthlyActionProvider,
} from '../types/game'

const coreMonthlyActions: readonly MonthlyActionDefinition[] = [
  {
    id: 'rest',
    source: 'core',
    label: { zh: '休息', ja: '休む' },
    description: { zh: '把时间还给身体。', ja: '時間を身体に返す。' },
    actionPointCost: 1,
    effects: { health: 2, mental: 2, recoveryDebt: -1 },
  },
  {
    id: 'study_japanese',
    source: 'core',
    label: { zh: '日语学习', ja: '日本語を学ぶ' },
    description: { zh: '整理现场表达与听力。', ja: '現場表現と聞き取りを整える。' },
    actionPointCost: 2,
    effects: { japanese: 2, mental: -1 },
  },
  {
    id: 'study_tech',
    source: 'core',
    label: { zh: '技术学习', ja: '技術を学ぶ' },
    description: { zh: '把一个不懂的点查清楚。', ja: '分からない点を一つ調べ切る。' },
    actionPointCost: 2,
    effects: { tech: 2, stress: 1 },
  },
  {
    id: 'organize_work',
    source: 'core',
    label: { zh: '职场整理', ja: '仕事を整える' },
    description: { zh: '复盘本月工作与沟通。', ja: '今月の仕事と会話を振り返る。' },
    actionPointCost: 1,
    effects: { workplace: 1, workTrust: 1 },
  },
  {
    id: 'take_a_walk',
    source: 'core',
    label: { zh: '散步留白', ja: '余白を歩く' },
    description: { zh: '不解决问题，只出去走走。', ja: '問題を解かず、ただ外を歩く。' },
    actionPointCost: 1,
    effects: { freedom: 1, mental: 1 },
  },
]

export const coreMonthlyActionProvider: MonthlyActionProvider = () => coreMonthlyActions

export function getAvailableMonthlyActions(
  context: MonthlyActionContext,
  additionalProviders: readonly MonthlyActionProvider[] = [],
): readonly MonthlyActionDefinition[] {
  const actions = [
    ...coreMonthlyActionProvider(context),
    ...additionalProviders.flatMap((provider) => provider(context)),
  ]
  const seen = new Set<string>()
  return actions.filter((action) => {
    if (seen.has(action.id)) return false
    seen.add(action.id)
    return true
  })
}
