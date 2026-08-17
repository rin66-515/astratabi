import type { GameEffects, GameStats, MonthSettlement } from '../types/game'
import { applyEffects } from './applyEffects'

export const MONTHLY_AP_OVERDRAFT_LIMIT = -2

export type MonthlyConsequence = {
  actionPointsSpent: number
  actionPointsOverdrawn: number
  actionIntensity: number
  negativeActionPointMonth: boolean
  effects: GameEffects
}

export type MonthOpeningRecovery = {
  stats: GameStats
  effects: GameEffects
  actionPointModifier: number
  restActions: number
}

function countRestActions(settlement: MonthSettlement | null) {
  return settlement?.actions.filter((action) => action.actionId === 'rest').length ?? 0
}

export function canPerformMonthlyAction(actionPointCost: number, actionPointsRemaining: number) {
  return actionPointCost > 0
    && actionPointsRemaining - actionPointCost >= MONTHLY_AP_OVERDRAFT_LIMIT
}

export function resolveMonthlyConsequence(
  actionPointsGranted: number,
  actionPointsRemaining: number,
): MonthlyConsequence {
  const actionPointsSpent = Math.max(0, actionPointsGranted - actionPointsRemaining)
  const actionPointsOverdrawn = Math.max(0, -actionPointsRemaining)
  const actionIntensity = actionPointsGranted > 0 ? actionPointsSpent / actionPointsGranted : 0
  let effects: GameEffects

  if (actionPointsOverdrawn > 0) {
    effects = {
      stress: 4 + actionPointsOverdrawn * 2,
      recoveryDebt: 3 + actionPointsOverdrawn * 3,
      mental: -2 * actionPointsOverdrawn,
      health: -actionPointsOverdrawn,
      lossOfControl: actionPointsOverdrawn,
    }
  } else if (actionIntensity <= 0.5) {
    effects = { stress: -3, recoveryDebt: -1 }
  } else if (actionIntensity <= 0.85) {
    effects = { stress: -1 }
  } else {
    effects = { stress: 1, recoveryDebt: 1 }
  }

  return {
    actionPointsSpent,
    actionPointsOverdrawn,
    actionIntensity,
    negativeActionPointMonth: actionPointsOverdrawn > 0,
    effects,
  }
}

export function getActionPointModifier(stats: GameStats, previousSettlement: MonthSettlement | null) {
  let modifier = 0
  if (stats.stress >= 85) modifier -= 3
  else if (stats.stress >= 70) modifier -= 2
  else if (stats.stress >= 60) modifier -= 1
  if (stats.recoveryDebt >= 70) modifier -= 1
  if (stats.health <= 25) modifier -= 1
  if (stats.mental <= 25) modifier -= 1
  if (countRestActions(previousSettlement) >= 2) modifier += 1
  return modifier
}

export function applyMonthOpeningRecovery(
  stats: GameStats,
  previousSettlement: MonthSettlement | null,
): MonthOpeningRecovery {
  if (!previousSettlement) {
    return {
      stats,
      effects: {},
      actionPointModifier: getActionPointModifier(stats, null),
      restActions: 0,
    }
  }

  const restActions = countRestActions(previousSettlement)
  const intensity = previousSettlement.actionIntensity
  const lowIntensityStressBonus = intensity <= 0.5 ? 2 : intensity <= 0.8 ? 1 : 0
  const recoveryDebtDrag = stats.recoveryDebt >= 60 ? 2 : stats.recoveryDebt >= 40 ? 1 : 0
  const pressureRelease = stats.stress >= 85 ? 3 : stats.stress >= 70 ? 2 : stats.stress >= 60 ? 1 : 0
  const stressRecovery = Math.max(
    1,
    4 + restActions * 2 + lowIntensityStressBonus + pressureRelease - recoveryDebtDrag,
  )
  const recoveryDebtRecovery = restActions * 2 + (intensity <= 0.5 ? 2 : intensity <= 0.8 ? 1 : 0)
  const effects: GameEffects = {
    stress: -stressRecovery,
    recoveryDebt: -recoveryDebtRecovery,
    health: restActions > 0 ? 1 : 0,
    mental: restActions > 0 || intensity <= 0.5 ? 1 : 0,
  }
  const recoveredStats = applyEffects(stats, effects)
  return {
    stats: recoveredStats,
    effects,
    actionPointModifier: getActionPointModifier(recoveredStats, previousSettlement),
    restActions,
  }
}
