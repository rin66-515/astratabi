import type { Language, LocalizedText } from '../types/game'

export function localize(text: LocalizedText, language: Language) {
  return text[language]
}

export function text(zh: string, ja: string): LocalizedText {
  return { zh, ja }
}
