import type { Home } from '../types'
import { activeCat, moodOf } from './game'

export type SpinnerMode = 'requesting' | 'responding' | 'thinking' | 'tool-input' | 'tool-use'
export type SkinLevel = 'full' | 'light' | 'off'

export const SPINNER_WORDS: Record<SpinnerMode, string[]> = {
  thinking: ['Purring', 'Pondering', 'Loafing'],
  requesting: ['Meowing', 'Pawing'],
  responding: ['Kneading', 'Chirping'],
  'tool-input': ['Stalking'],
  'tool-use': ['Pouncing', 'Batting', 'Zooming'],
}
const DONE_WORDS = ['Purred', 'Napped', 'Kneaded', 'Pounced', 'Groomed']

// Same engine word gives the same cat word, so a turn's spinner doesn't flicker.
const hashOf = (s: string) => [...s].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7)

export const spinnerWord = (mode: SpinnerMode, engineWord: string): string => {
  const words = SPINNER_WORDS[mode] ?? SPINNER_WORDS.thinking
  return words[hashOf(engineWord) % words.length] as string
}

export const doneWord = (engineWord: string): string => DONE_WORDS[hashOf(engineWord) % DONE_WORDS.length] as string

export const skinLevel = (setting: unknown): SkinLevel => (setting === 'light' || setting === 'off' ? setting : 'full')

export const hintTail = (home: Home | null | undefined): string => {
  if (!home) return ''
  const cat = activeCat(home)
  return `🐱 ${cat.name} · ${moodOf(cat)} · ${Math.floor(home.coins)}c`
}

const CAT = '=^.^='

// One band row of exactly `columns` cells: the cat padding right, paw prints behind it, wrapping at the edge.
export const walkFrame = (tick: number, columns: number): string => {
  const span = Math.max(columns - CAT.length, 1)
  const at = tick % span
  const trail = Array.from({ length: at }, (_, i) => (i % 2 ? ' ' : '·')).join('')
  return (trail + CAT).padEnd(columns, ' ').slice(0, columns)
}

const PAWS: Record<string, string> = { Read: '🐟', Grep: '🐟', Glob: '🐟', Edit: '🧶', Write: '🧶', Bash: '🐭' }
export const pawPrefix = (tool: string): string => PAWS[tool] ?? '🐾'

// Rewords the run-in-background pill and keeps the person's own key binding.
export const catHint = (hint: string): string => hint.replace(/run in background/i, 'let the cat wander off')
