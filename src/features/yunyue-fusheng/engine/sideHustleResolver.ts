import type {
  GameEffects,
  LocalizedText,
  MonthlyActionContext,
  MonthlyActionDefinition,
  MonthlyActionProvider,
  SideHustleActionOutcome,
  SideHustleRouteId,
  SideHustleState,
} from '../types/game'

type SideHustleRouteConfig = {
  label: LocalizedText
  actionLabel: LocalizedText
  description: LocalizedText
  unlockDescription: LocalizedText
  actionPointCost: number
  baseIncomeJpy: number
  incomePerLevelJpy: number
  baseExperience: number
  effects: GameEffects
}

export const sideHustleRouteIds: readonly SideHustleRouteId[] = [
  'freelance',
  'it_materials',
  'content_account',
  'own_product',
]

export const sideHustleRouteConfigs: Record<SideHustleRouteId, SideHustleRouteConfig> = {
  freelance: {
    label: { zh: '接私活', ja: '個人案件' },
    actionLabel: { zh: '承接小型修正', ja: '小規模な修正を請ける' },
    description: { zh: '把现场能力换成一份有边界的交付。', ja: '現場力を、範囲の決まった納品に変える。' },
    unlockDescription: { zh: '技术≥40、日语≥70', ja: '技術40以上・日本語70以上' },
    actionPointCost: 3,
    baseIncomeJpy: 12_000,
    incomePerLevelJpy: 4_000,
    baseExperience: 4,
    effects: { tech: 1, workplace: 1, stress: 5, mental: -2 },
  },
  it_materials: {
    label: { zh: 'IT资料', ja: 'IT資料' },
    actionLabel: { zh: '整理一份资料', ja: '資料を一つ整える' },
    description: { zh: '把走过的流程整理成别人也能使用的材料。', ja: '経験した流れを、他人も使える資料に整える。' },
    unlockDescription: { zh: '技术≥38、职场≥32', ja: '技術38以上・職場32以上' },
    actionPointCost: 2,
    baseIncomeJpy: 6_000,
    incomePerLevelJpy: 3_000,
    baseExperience: 3,
    effects: { product: 2, tech: 1, stress: 2, mental: -1 },
  },
  content_account: {
    label: { zh: '内容账号', ja: '発信アカウント' },
    actionLabel: { zh: '更新一期内容', ja: '一本発信する' },
    description: { zh: '把当下的理解写成一段能被看见的内容。', ja: '今の理解を、誰かに届く形で一本残す。' },
    unlockDescription: { zh: '第2月以后、日语≥75', ja: '2か月目以降・日本語75以上' },
    actionPointCost: 2,
    baseIncomeJpy: 2_000,
    incomePerLevelJpy: 2_000,
    baseExperience: 3,
    effects: { japanese: 1, product: 1, stress: 3, socialBattery: -4 },
  },
  own_product: {
    label: { zh: '自己的产品', ja: '自分のプロダクト' },
    actionLabel: { zh: '打磨一个可用版本', ja: '使える版を一つ磨く' },
    description: { zh: '不再只交付时间，开始积累属于自己的东西。', ja: '時間だけでなく、自分に残るものを積み上げる。' },
    unlockDescription: { zh: '第5月以后，产品≥20或资料/内容均Lv2', ja: '5か月目以降・プロダクト20以上、またはIT資料/発信が共にLv2' },
    actionPointCost: 3,
    baseIncomeJpy: 4_000,
    incomePerLevelJpy: 6_000,
    baseExperience: 4,
    effects: { product: 3, tech: 1, stress: 4, health: -1 },
  },
}

export function experienceRequiredForNextLevel(level: number) {
  return 6 + level * 4
}

export function isSideHustleUnlockEligible(routeId: SideHustleRouteId, context: MonthlyActionContext) {
  const { elapsedMonth, stats, sideHustles } = context
  switch (routeId) {
    case 'freelance':
      return stats.tech >= 40 && stats.japanese >= 70
    case 'it_materials':
      return stats.tech >= 38 && stats.workplace >= 32
    case 'content_account':
      return elapsedMonth >= 2 && stats.japanese >= 75
    case 'own_product':
      return elapsedMonth >= 5 && (
        stats.product >= 20
        || (
          sideHustles.routes.it_materials.level >= 2
          && sideHustles.routes.content_account.level >= 2
        )
      )
  }
}

export function unlockEligibleSideHustles(
  state: SideHustleState,
  context: MonthlyActionContext,
): SideHustleState {
  const routes = { ...state.routes }
  let changed = false
  for (const routeId of sideHustleRouteIds) {
    const route = routes[routeId]
    if (route.unlockedAtMonth !== null || !isSideHustleUnlockEligible(routeId, context)) continue
    routes[routeId] = { ...route, unlockedAtMonth: context.elapsedMonth }
    changed = true
  }
  return changed ? { ...state, routes } : state
}

function sideHustleAction(routeId: SideHustleRouteId, context: MonthlyActionContext): MonthlyActionDefinition | null {
  const unlocked = context.sideHustles.routes[routeId].unlockedAtMonth !== null
    || isSideHustleUnlockEligible(routeId, context)
  if (!unlocked) return null

  const route = context.sideHustles.routes[routeId]
  const config = sideHustleRouteConfigs[routeId]
  const contentSynergy = context.sideHustles.routes.content_account.level >= 2
    && (routeId === 'it_materials' || routeId === 'own_product')
  const materialSynergy = routeId === 'own_product'
    && context.sideHustles.routes.it_materials.level >= 2
  const freelanceSynergy = routeId === 'own_product'
    && context.sideHustles.routes.freelance.level >= 2
  const productSynergy = routeId === 'content_account'
    && context.sideHustles.routes.own_product.level >= 2
  const baseIncome = config.baseIncomeJpy + route.level * config.incomePerLevelJpy
  const incomeJpy = Math.floor(baseIncome * (contentSynergy ? 1.2 : 1))
  const experience = config.baseExperience + (freelanceSynergy || productSynergy ? 1 : 0)

  return {
    id: `side_hustle_${routeId}`,
    source: 'sidejob',
    label: config.actionLabel,
    description: config.description,
    actionPointCost: config.actionPointCost - (materialSynergy ? 1 : 0),
    effects: { ...config.effects, cashJpy: incomeJpy },
    sideHustle: { routeId, experience, incomeJpy },
  }
}

export const sideHustleMonthlyActionProvider: MonthlyActionProvider = (context) => sideHustleRouteIds
  .map((routeId) => sideHustleAction(routeId, context))
  .filter((action): action is MonthlyActionDefinition => action !== null)

export function applySideHustleOutcome(
  state: SideHustleState,
  outcome: SideHustleActionOutcome,
  elapsedMonth: number,
): SideHustleState {
  const current = state.routes[outcome.routeId]
  let experience = current.experience + outcome.experience
  let level = current.level
  while (experience >= experienceRequiredForNextLevel(level)) {
    experience -= experienceRequiredForNextLevel(level)
    level += 1
  }
  const route = {
    ...current,
    unlockedAtMonth: current.unlockedAtMonth ?? elapsedMonth,
    level,
    experience,
    totalIncomeJpy: current.totalIncomeJpy + outcome.incomeJpy,
    completedActions: current.completedActions + 1,
  }
  return {
    routes: { ...state.routes, [outcome.routeId]: route },
    totalIncomeJpy: state.totalIncomeJpy + outcome.incomeJpy,
  }
}
