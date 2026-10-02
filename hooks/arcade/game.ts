// The contract every mini-game follows; games are pure so tests can step them.
import type { GameId, Genes } from '../../types'
import type { Flavor } from '../theme'
import type { Frame } from './engine'

export type { GameId }

// Keys arrive as presses only (terminals send no key-up); pointer positions are canvas pixels.
export type Input =
  | { kind: 'key'; key: string }
  | { kind: 'down' | 'move' | 'up'; x: number; y: number }

// Skill-tree branch points: they ease a game, never multiply its payout.
export type GameMods = { hunter: number; cuddler: number; dreamer: number }

export type Look = { f: Flavor; genes: Genes; tick: number }

export type Game<S> = {
  id: GameId
  name: string
  blurb: string
  controls: string
  seconds: number
  // Score marks for bronze, silver and gold.
  medals: readonly [number, number, number]
  init: (seed: number, mods: GameMods, w: number, h: number) => S
  step: (s: S, dt: number, input: readonly Input[]) => S
  draw: (s: S, f: Frame, look: Look) => void
  isOver: (s: S) => boolean
  score: (s: S) => number
  // The most a fair round of `ms` could score: posted scores above it are clamped.
  maxScore: (ms: number) => number
}

export const NO_MODS: GameMods = { hunter: 0, cuddler: 0, dreamer: 0 }
export const isKey = (input: readonly Input[], ...keys: string[]) =>
  input.some(i => i.kind === 'key' && keys.includes(i.key))
