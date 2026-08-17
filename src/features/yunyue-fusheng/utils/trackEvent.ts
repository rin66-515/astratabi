export type GameTrackingEvent =
  | 'game_start'
  | 'language_change'
  | 'event_view'
  | 'event_choice'
  | 'month_complete'
  | 'game_restart'
  | 'game_exit'

export function trackEvent(event: GameTrackingEvent, payload: Record<string, unknown> = {}) {
  void event
  void payload
  // Reserved for a future privacy-reviewed analytics adapter.
}
