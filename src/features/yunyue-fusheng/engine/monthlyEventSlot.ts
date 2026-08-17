import type {
  EventContext,
  MonthlyEventDefinition,
  MonthlyEventSlotState,
} from '../types/game'
import { getAvailableEvents, pickWeightedEvent } from './eventSelection'

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
  const majorEvents = availableEvents.filter((event) => definitionById.get(event.id)?.kind === 'major')
  const selectedEvent = pickWeightedEvent(majorEvents.length > 0 ? majorEvents : availableEvents, random)
  if (!selectedEvent) return emptySlot(elapsedMonth)

  const definition = definitionById.get(selectedEvent.id)
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
