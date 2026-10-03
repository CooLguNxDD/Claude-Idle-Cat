import type { Rarity } from '../../types'
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
