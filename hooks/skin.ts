import type { Home } from '../types'
import { activeCat } from './game'
import { coatPixel } from './genes'
import { css } from './theme'
import type { Flavor } from './theme'

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

export type Span = { text: string; color?: string; isBold?: boolean }

// Coat sample points (pane sprite coordinates) for the badge's tail, body and head glyphs.
const TAIL: [number, number] = [2, 8]
const BODY: [number, number] = [6, 7]
const HEAD: [number, number] = [10, 2]
const LEVELS = '▁▂▃▄▅▆▇█'
export const meterGlyph = (n: number) => LEVELS[Math.min(7, Math.max(0, Math.floor(n / 12.5)))] as string
const meterColor = (n: number, f: Flavor) => css(n < 35 ? f.red : n < 70 ? f.yellow : f.green)

// The prompt-line badge: the active cat drawn in its own coat, then its needs as tiny meters.
export const catBadge = (home: Home | null | undefined, f: Flavor): Span[] => {
  if (!home) return []
  const cat = activeCat(home)
  const fur = ([x, y]: [number, number], ch: string) => css(coatPixel(cat.genes, f, ch, x, y) ?? f.peach)
  const spans: Span[] = [{ text: 'ᓚ', color: fur(TAIL, 'd') }, { text: 'ᘏ', color: fur(BODY, 'f') }, { text: 'ᗢ', color: fur(HEAD, 'f') }]
  if (cat.genes.isShiny) spans.push({ text: '✧', color: css(f.mauve) })
  spans.push({ text: ` ${cat.name}`, isBold: true })
  if (cat.isAsleep) spans.push({ text: ' ᶻᶻ', color: css(f.lavender) })
  const needs: [string, number, number][] = [['∝', cat.hunger, f.peach], ['♥', cat.joy, f.pink], ['ϟ', cat.energy, f.yellow]]
  for (const [icon, n, color] of needs) spans.push({ text: ` ${icon}`, color: css(color) }, { text: meterGlyph(n), color: meterColor(n, f) })
  spans.push({ text: ` ¢${Math.floor(home.coins)}`, color: css(f.yellow) })
  return spans
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
