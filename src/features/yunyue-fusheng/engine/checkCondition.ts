import type { ComparisonOperator, EventCondition, EventContext } from '../types/game'

function compare(left: number, operator: ComparisonOperator, right: number) {
  switch (operator) {
    case 'eq': return left === right
    case 'neq': return left !== right
    case 'gt': return left > right
    case 'gte': return left >= right
    case 'lt': return left < right
    case 'lte': return left <= right
  }
}

export function checkCondition(condition: EventCondition, context: EventContext): boolean {
  switch (condition.type) {
    case 'stat':
      return compare(context.stats[condition.stat], condition.operator, condition.value)
    case 'flag':
      return context.flags.includes(condition.flag) === (condition.present ?? true)
    case 'completedEvent':
      return context.completedEventIds.includes(condition.eventId) === (condition.completed ?? true)
    case 'month':
      return compare(context.month, condition.operator, condition.value)
  }
}

export function checkConditions(conditions: EventCondition[] = [], context: EventContext): boolean {
  return conditions.every((condition) => checkCondition(condition, context))
}
