import type {
  LocalizedText,
  MonthlyActionAvailability,
  MonthlyActionDefinition,
  MonthlyActionGrant,
  MonthlyActionContext,
  MonthlyPlan,
} from '../types/game'

const text = (zh: string, ja: string): LocalizedText => ({ zh, ja })

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function pressurePenalty(context: MonthlyActionContext) {
  let penalty = 0
  if (context.stats.health < 35) penalty += 0.22
  if (context.stats.mental < 35) penalty += 0.24
  if (context.stats.stress >= 75) penalty += 0.18
  if (context.stats.recoveryDebt >= 65) penalty += 0.2
  return penalty
}

function availabilityChance(action: MonthlyActionDefinition, context: MonthlyActionContext, actionPointsGranted: number) {
  if (action.id === 'rest') return 1
  let chance = action.source === 'sidejob' ? 0.72 : 0.86
  chance -= pressurePenalty(context)
  if (actionPointsGranted <= 3 && action.actionPointCost >= 2) chance -= 0.18
  if (action.id === 'take_a_walk') chance += context.stats.stress >= 65 ? 0.16 : 0
  if (action.id === 'study_japanese') chance += context.stats.japanese < 80 ? 0.08 : -0.04
  if (action.id === 'study_tech') chance += context.stats.tech < 50 ? 0.08 : -0.03
  if (action.id === 'organize_work') chance += context.stats.workplace < 45 ? 0.06 : 0
  if (action.sideHustle?.routeId === 'freelance') chance -= 0.2
  if (action.sideHustle?.routeId === 'content_account') chance += context.flags.includes('content_real_question_answered') ? 0.12 : -0.06
  if (action.sideHustle?.routeId === 'own_product') chance += context.stats.product >= 35 ? 0.1 : -0.12
  return clamp(chance, 0.08, 0.96)
}

function unavailableReason(action: MonthlyActionDefinition, context: MonthlyActionContext): LocalizedText {
  if (context.stats.health < 30 || context.stats.recoveryDebt >= 80) {
    return text('身体只够应付必要的事情。', '身体は、必要なことをこなすだけで精一杯だ。')
  }
  if (context.stats.mental < 30) {
    if (action.id === 'study_tech' || action.sideHustle?.routeId === 'own_product') {
      return text('最近不太想碰代码。', '最近は、あまりコードに触れたくない。')
    }
    return text('知道该做什么，只是这个月没有力气开始。', '何をすべきかは分かる。ただ、今月は始める力がない。')
  }
  if (action.sideHustle?.routeId === 'freelance') {
    return text('这个月没有合适的私活。', '今月は、条件の合う個人案件がない。')
  }
  if (action.sideHustle?.routeId === 'content_account') {
    return text('这个月没有特别想写下来的东西。', '今月は、どうしても書き残したいことが浮かばない。')
  }
  if (action.sideHustle?.routeId === 'it_materials') {
    return text('手边的经验还没有整理到可以成篇。', '手元の経験は、まだ一つの資料にまとまらない。')
  }
  if (action.sideHustle?.routeId === 'own_product') {
    return text('眼前的问题还没有长成一个产品。', '目の前の問題は、まだプロダクトの形になっていない。')
  }
  if (action.id === 'study_tech') return text('最近不太想碰代码。', '最近は、あまりコードに触れたくない。')
  if (action.id === 'study_japanese') return text('这个月听了太多话，暂时不想再背新的表达。', '今月は言葉を聞きすぎて、新しい表現を覚える気になれない。')
  if (action.id === 'organize_work') return text('这个月的工作还乱成一团，暂时复盘不出结论。', '今月の仕事はまだ散らかっていて、振り返る形にならない。')
  return text('这件事这个月暂时没有展开。', '今月は、そのことが動き出さなかった。')
}

export function resolveMonthlyActionAvailability(
  actions: readonly MonthlyActionDefinition[],
  context: MonthlyActionContext,
  actionPointsGranted: number,
  random: () => number = Math.random,
): MonthlyActionAvailability[] {
  return actions.map((action) => {
    const available = random() < availabilityChance(action, context, actionPointsGranted)
    return available
      ? { actionId: action.id, status: 'available' as const }
      : { actionId: action.id, status: 'unavailable' as const, reason: unavailableReason(action, context) }
  })
}

export function isMonthlyActionAvailable(plan: MonthlyPlan, actionId: string) {
  if (!plan.actionAvailability || plan.actionAvailability.length === 0) return true
  const status = plan.actionAvailability.find((entry) => entry.actionId === actionId)?.status
  return status === 'available' || status === 'temporary'
}

export function grantMonthlyAction(
  plan: MonthlyPlan | null,
  grant: MonthlyActionGrant,
  sourceEventId: string,
): MonthlyPlan | null {
  if (!plan) return null
  const next: MonthlyActionAvailability = {
    actionId: grant.actionId,
    status: 'temporary',
    reason: grant.reason,
    sourceEventId,
  }
  return {
    ...plan,
    actionAvailability: [
      ...plan.actionAvailability.filter((entry) => entry.actionId !== grant.actionId),
      next,
    ],
  }
}
