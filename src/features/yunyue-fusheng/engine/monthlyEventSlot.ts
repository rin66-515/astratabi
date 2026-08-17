import type {
  EventContext,
  MonthlyEventDefinition,
  MonthlyEventSlotState,
} from '../types/game'
import { checkConditions } from './checkCondition'
import { getAvailableEvents } from './eventSelection'

function emptySlot(elapsedMonth: number): MonthlyEventSlotState {
  return {
    elapsedMonth,
    kind: null,
    eventId: null,
    status: 'none',
    miniGame: null,
  }
}

export function selectMonthlyEventSlot(
  definitions: readonly MonthlyEventDefinition[],
  context: EventContext,
  elapsedMonth: number,
  random: () => number = Math.random,
): MonthlyEventSlotState {
  const definitionById = new Map(definitions.map((definition) => [definition.event.id, definition]))
  const availableEvents = getAvailableEvents(
    definitions.map((definition) => definition.event),
    context,
  )
  const availableDefinitions = availableEvents
    .map((event) => definitionById.get(event.id))
    .filter((definition): definition is MonthlyEventDefinition => Boolean(definition))
  const majorDefinitions = availableDefinitions.filter((definition) => definition.kind === 'major')
  const selectionPool = majorDefinitions.length > 0 ? majorDefinitions : availableDefinitions
  const weightedDefinitions = selectionPool.map((definition) => {
    const dynamicMultiplier = (definition.weightRules ?? []).reduce((multiplier, rule) => (
      checkConditions(rule.conditions, context) ? multiplier * Math.max(0, rule.multiplier) : multiplier
    ), 1)
    return {
      definition,
      weight: Math.max(0, definition.event.weight ?? 1) * dynamicMultiplier,
    }
  })
  const totalWeight = weightedDefinitions.reduce((total, candidate) => total + candidate.weight, 0)
  let cursor = random() * totalWeight
  const selectedDefinition = totalWeight <= 0
    ? weightedDefinitions[0]?.definition
    : weightedDefinitions.find((candidate) => {
      cursor -= candidate.weight
      return cursor < 0
    })?.definition ?? weightedDefinitions.at(-1)?.definition
  const selectedEvent = selectedDefinition?.event ?? null
  if (!selectedEvent) return emptySlot(elapsedMonth)

  const definition = selectedDefinition
  if (!definition) return emptySlot(elapsedMonth)
  if (definition.kind === 'minigame' && !selectedEvent.miniGame) {
    throw new Error(`Monthly minigame event ${selectedEvent.id} requires a miniGame trigger`)
  }
  return {
    elapsedMonth,
    kind: definition.kind,
    eventId: selectedEvent.id,
    status: 'pending',
    miniGame: selectedEvent.miniGame ? { ...selectedEvent.miniGame } : null,
  }
}

export function completeMonthlyEventSlot(slot: MonthlyEventSlotState): MonthlyEventSlotState {
  if (slot.status !== 'pending') return slot
  return {
    ...slot,
    status: slot.kind === 'minigame' ? 'mini_game_pending' : 'completed',
  }
}

export function completeMonthlyMiniGameSlot(slot: MonthlyEventSlotState): MonthlyEventSlotState {
  return slot.status === 'mini_game_pending' ? { ...slot, status: 'completed' } : slot
}
