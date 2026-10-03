import type { Personality, Rarity } from '../../types'
import type { Mood } from '../game'
import { COLOR_TOKENS, inkOf, mix } from '../theme'
import type { ColorName, Flavor } from '../theme'

// A theme colour: a token, `light` fur, the flavor's `ink`, or a mix of two shades, so every flavor works.
export type Shade = ColorName | 'light' | 'ink' | { mix: readonly [Shade, Shade, number] }

/** How a coat lays its dark and belly shades over the sprite; each kind is one rule in `genes/paint.ts`. */
export type Pattern =
  | { kind: 'solid' }
  | { kind: 'stripes' }
  | { kind: 'rosettes' }
  | { kind: 'points' }
  | { kind: 'bib' }
  | { kind: 'undercoat'; blend: number }
  | { kind: 'patches'; colors: readonly [Shade, Shade] }
  | { kind: 'stars'; star: Shade }

export type Breed = {
  id: string
  label: string
  rarity: Rarity
  fur: Shade
  dark: Shade
  belly: Shade
  pattern: Pattern
}

export const defineBreed = (breed: Breed): Breed => breed

export const shadeOf = (s: Shade, f: Flavor): number => {
  if (s === 'light') return f.isLight ? f.surface0 : f.text
  if (s === 'ink') return inkOf(f)
  if (typeof s === 'string') return f[s]
  return mix(shadeOf(s.mix[0], f), shadeOf(s.mix[1], f), s.mix[2])
}

const RARITY_IDS: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const PATTERN_KINDS: readonly Pattern['kind'][] = ['solid', 'stripes', 'rosettes', 'points', 'bib', 'undercoat', 'patches', 'stars']

const shadeProblem = (s: Shade, at: string): string[] => {
  if (s === 'light' || s === 'ink') return []
  if (typeof s === 'string') return (COLOR_TOKENS as readonly string[]).includes(s) ? [] : [`${at}: unknown colour ${s}`]
  const t = s.mix[2]
  return [...shadeProblem(s.mix[0], at), ...shadeProblem(s.mix[1], at),
    ...(t >= 0 && t <= 1 ? [] : [`${at}: mix amount ${t} is outside 0 to 1`])]
}

/** Every problem with a breed spec; empty means the registry can use it. */
export const breedProblems = (b: Breed): string[] => [
  ...(/^[a-z][a-z0-9-]*$/.test(b.id) ? [] : [`id ${b.id} must be lowercase kebab-case`]),
  ...(b.label.trim() ? [] : [`${b.id}: label is empty`]),
  ...(RARITY_IDS.includes(b.rarity) ? [] : [`${b.id}: unknown rarity ${b.rarity}`]),
  ...shadeProblem(b.fur, `${b.id}.fur`), ...shadeProblem(b.dark, `${b.id}.dark`), ...shadeProblem(b.belly, `${b.id}.belly`),
  ...(PATTERN_KINDS.includes(b.pattern.kind) ? [] : [`${b.id}: unknown pattern ${b.pattern.kind}`]),
  ...(b.pattern.kind === 'patches' ? b.pattern.colors.flatMap((c, i) => shadeProblem(c, `${b.id}.pattern.colors[${i}]`)) : []),
  ...(b.pattern.kind === 'stars' ? shadeProblem(b.pattern.star, `${b.id}.pattern.star`) : []),
]

/** Body poses the cat renderers know; a move picks one and adds travel and lift. */
export type PoseKind = 'sit' | 'walk' | 'run' | 'loaf' | 'sleep' | 'groom' | 'stretch' | 'crouch'
export const POSE_KINDS: readonly PoseKind[] = ['sit', 'walk', 'run', 'loaf', 'sleep', 'groom', 'stretch', 'crouch']

export type Move = {
  id: string
  label: string
  pose: PoseKind
  /** Frames in one loop of the pose at the 8 fps frame loop. */
  cycle: number
  /** Design units travelled per frame (4 per scene pixel); 0 stays put. */
  speed: number
  /** Design-unit y offset per cycle frame; negative is up. */
  lift?: readonly number[]
  seconds: readonly [number, number]
  when: { moods?: readonly Mood[]; personality?: Partial<Record<Personality, number>>; hours?: readonly [number, number]; weight: number }
  /** Moves that may follow; empty or missing means any. */
  next?: readonly string[]
}

export const defineMove = (move: Move): Move => move

/** Every problem with a move spec against the other moves; empty means the planner can use it. */
export const moveProblems = (m: Move, all: readonly Move[]): string[] => [
  ...(/^[a-z][a-z0-9-]*$/.test(m.id) ? [] : [`id ${m.id} must be lowercase kebab-case`]),
  ...(POSE_KINDS.includes(m.pose) ? [] : [`${m.id}: unknown pose ${m.pose}`]),
  ...(Number.isInteger(m.cycle) && m.cycle >= 1 && m.cycle <= 32 ? [] : [`${m.id}: cycle must be 1 to 32 frames`]),
  ...(m.speed >= 0 && m.speed <= 8 ? [] : [`${m.id}: speed must be 0 to 8 design units a frame`]),
  ...(m.lift && m.lift.length !== m.cycle ? [`${m.id}: lift needs one value per cycle frame`] : []),
  ...(m.lift?.some(y => y < -12 || y > 4) ? [`${m.id}: lift values stay between -12 and 4`] : []),
  ...(m.seconds[0] > 0 && m.seconds[0] <= m.seconds[1] && m.seconds[1] <= 120 ? [] : [`${m.id}: seconds must be 0 < min <= max <= 120`]),
  ...(m.when.weight >= 0 ? [] : [`${m.id}: weight must not be negative`]),
  ...(m.when.hours && !m.when.hours.every(h => Number.isInteger(h) && h >= 0 && h <= 24) ? [`${m.id}: hours are 0 to 24`] : []),
  ...(m.next ?? []).filter(id => !all.some(o => o.id === id)).map(id => `${m.id}: next names unknown move ${id}`),
]
