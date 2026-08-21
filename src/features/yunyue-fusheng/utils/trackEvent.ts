export type GameTrackingEvent =
  | 'game_start'
  | 'language_change'
  | 'event_view'
  | 'event_choice'
  | 'monthly_action'
  | 'month_complete'
  | 'time_passage'
  | 'minigame_start'
  | 'minigame_choice'
  | 'minigame_timeout'
  | 'minigame_complete'
  | 'ending_reached'
  | 'boundary_unlocked'
  | 'game_restart'
  | 'game_exit'

export function trackEvent(event: GameTrackingEvent, payload: Record<string, unknown> = {}) {
  void event
  void payload
  // Reserved for a future privacy-reviewed analytics adapter.
}
