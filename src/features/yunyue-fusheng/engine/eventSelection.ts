import type { EventContext, GameEvent } from '../types/game'
import { checkConditions } from './checkCondition'

export function getAvailableEvents(events: readonly GameEvent[], context: EventContext): GameEvent[] {
  return events.filter((event) => (
    !context.completedEventIds.includes(event.id)
    && (event.month === undefined || event.month === context.month)
    && checkConditions(event.conditions, context)
  ))
}

export function pickWeightedEvent(events: readonly GameEvent[], random = Math.random): GameEvent | null {
  if (events.length === 0) return null

  const totalWeight = events.reduce((total, event) => total + Math.max(0, event.weight ?? 1), 0)
  if (totalWeight <= 0) return events[0]

  let cursor = random() * totalWeight
  for (const event of events) {
    cursor -= Math.max(0, event.weight ?? 1)
    if (cursor < 0) return event
  }
  return events.at(-1) ?? null
}

export function pickNextStoryEvent(events: readonly GameEvent[], context: EventContext): GameEvent | null {
  const available = getAvailableEvents(events, context)
  const ordered = available.filter((event) => event.order !== undefined).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  return ordered[0] ?? pickWeightedEvent(available)
}
