import type { Eyes, Marking, Personality, Rarity, Silhouette, Slot } from '../../types'
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
  available?: Availability
}

export type Availability = { months: readonly number[] }

export const availabilityProblems = (a: Availability | undefined, at: string): string[] =>
  !a || (a.months.length > 0 && a.months.every(m => Number.isInteger(m) && m >= 1 && m <= 12))
    ? [] : [`${at}: months must be a nonempty list of integers from 1 to 12`]

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
  ...availabilityProblems(b.available, `${b.id}.available`),
  ...(/^[a-z][a-z0-9-]*$/.test(b.id) ? [] : [`id ${b.id} must be lowercase kebab-case`]),
  ...(b.label.trim() ? [] : [`${b.id}: label is empty`]),
  ...(RARITY_IDS.includes(b.rarity) ? [] : [`${b.id}: unknown rarity ${b.rarity}`]),
  ...shadeProblem(b.fur, `${b.id}.fur`), ...shadeProblem(b.dark, `${b.id}.dark`), ...shadeProblem(b.belly, `${b.id}.belly`),
  ...(PATTERN_KINDS.includes(b.pattern.kind) ? [] : [`${b.id}: unknown pattern ${b.pattern.kind}`]),
  ...(b.pattern.kind === 'patches' ? b.pattern.colors.flatMap((c, i) => shadeProblem(c, `${b.id}.pattern.colors[${i}]`)) : []),
  ...(b.pattern.kind === 'stars' ? shadeProblem(b.pattern.star, `${b.id}.pattern.star`) : []),
]

/** Body poses the cat renderers know; a move picks one and adds travel and lift. */
export type PoseKind = 'sit' | 'walk' | 'run' | 'loaf' | 'sleep' | 'groom' | 'stretch' | 'crouch' | 'knead' | 'spin' | 'arch'
export const POSE_KINDS: readonly PoseKind[] = ['sit', 'walk', 'run', 'loaf', 'sleep', 'groom', 'stretch', 'crouch', 'knead', 'spin', 'arch']

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
  /** Walks to this landmark first, then perches on it or runs through it; skipped where the yard has none. */
  seek?: LandmarkKind
  isScripted?: boolean
  turn?: number
  prop?: 'cup'
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
  ...(m.seek && !LANDMARK_KINDS.includes(m.seek) ? [`${m.id}: unknown landmark ${m.seek}`] : []),
  ...(m.turn !== undefined && (!Number.isInteger(m.turn) || m.turn < 1 || m.turn > m.cycle) ? [`${m.id}: turn is a frame interval within the cycle`] : []),
  ...(m.prop && (m.prop !== 'cup' || m.seek !== 'shelf') ? [`${m.id}: cup props seek the shelf`] : []),
  ...(m.seek && m.speed === 0 ? [`${m.id}: a seek move needs a speed to get there`] : []),
]

/** Far scenery drawn behind the fence; parallax 0 stays put, 1 moves with the yard. */
export type LayerKind = 'hills' | 'trees' | 'rooftops' | 'cabins' | 'neon-city' | 'station-windows' | 'ocean'
export const LAYER_KINDS: readonly LayerKind[] = ['hills', 'trees', 'rooftops', 'cabins', 'neon-city', 'station-windows', 'ocean']
export type SceneStyle = 'snowy-cabin' | 'neon-alley' | 'space-station' | 'beach-pier'
export const SCENE_STYLES: readonly SceneStyle[] = ['snowy-cabin', 'neon-alley', 'space-station', 'beach-pier']
/** Things the cat can visit; each kind's size and perch live in `scene/landmarks.ts`. */
export type LandmarkKind = 'tower' | 'tunnel' | 'pipe' | 'window' | 'shelf'
export const LANDMARK_KINDS: readonly LandmarkKind[] = ['tower', 'tunnel', 'pipe', 'window', 'shelf']
// Width per landmark kind in design units, used for world boundary and overlap checks.
export const LANDMARK_WIDTH: Record<LandmarkKind, number> = { tower: 12, tunnel: 22, pipe: 16, window: 14, shelf: 14 }
/** How far above the floor a cat sits on each landmark, in design units (negative is up); 0 means it runs through. */
export const LANDMARK_PERCH: Record<LandmarkKind, number> = { tower: -28, tunnel: 0, pipe: -30, window: -16, shelf: -20 }
export const TIER_KEYS = ['cottage', 'house', 'manor'] as const

export type World = {
  id: string
  label: string
  scene?: SceneStyle
  /** Yard width in scene columns for each house tier; it only grows. */
  width: Record<(typeof TIER_KEYS)[number], number>
  layers: readonly { kind: LayerKind; parallax: number; tint: Shade }[]
  /** Scene x of each furniture slot; all sit inside the cottage width. */
  slots: Record<Slot, number>
  /** Scene x of each landmark and the tier (0 cottage, 1 house, 2 manor) that unlocks it. */
  landmarks: readonly { kind: LandmarkKind; x: number; tier: 0 | 1 | 2 }[]
  /** Fence-top spots for the other cats and visiting strays, in scene x. */
  perches: readonly number[]
}

export const defineWorld = (world: World): World => world

const SLOTS: readonly Slot[] = ['bowl', 'bed', 'toy', 'rug', 'plant', 'hanging']

/** Every problem with a world spec; empty means the yard can draw it. */
export const worldProblems = (w: World): string[] => {
  const widths = TIER_KEYS.map(k => w.width[k])
  const out: string[] = []
  if (w.scene && !SCENE_STYLES.includes(w.scene)) out.push(`${w.id}: unknown scene style ${w.scene}`)
  if (!/^[a-z][a-z0-9-]*$/.test(w.id)) out.push(`id ${w.id} must be lowercase kebab-case`)
  if (widths.some(n => !Number.isInteger(n) || n < 56 || n > 320)) out.push(`${w.id}: widths are whole columns from 56 to 320`)
  if (widths.some((n, i) => i > 0 && n < widths[i - 1]!)) out.push(`${w.id}: widths must not shrink with the tier`)
  for (const layer of w.layers) {
    if (!LAYER_KINDS.includes(layer.kind)) out.push(`${w.id}: unknown layer ${layer.kind}`)
    if (!(layer.parallax >= 0 && layer.parallax < 1)) out.push(`${w.id}: layer parallax is 0 to below 1`)
    out.push(...shadeProblem(layer.tint, `${w.id}.layers.${layer.kind}`))
  }
  for (const slot of SLOTS) {
    const x = w.slots[slot]
    if (!(Number.isInteger(x) && x >= 0 && x <= w.width.cottage - 14)) out.push(`${w.id}: slot ${slot} must sit inside the cottage`)
  }
  for (const l of w.landmarks) {
    if (!LANDMARK_KINDS.includes(l.kind)) out.push(`${w.id}: unknown landmark ${l.kind}`)
    else if (l.x < 0 || l.x + LANDMARK_WIDTH[l.kind] > widths[l.tier]!) out.push(`${w.id}: ${l.kind} at ${l.x} is outside the tier ${l.tier} yard`)
  }
  const spans = w.landmarks.filter(l => LANDMARK_KINDS.includes(l.kind))
    .map(l => [l.x, l.x + LANDMARK_WIDTH[l.kind]] as const).sort((a, b) => a[0] - b[0])
  if (spans.some((s, i) => i > 0 && s[0] < spans[i - 1]![1])) out.push(`${w.id}: landmarks overlap`)
  if (w.perches.some(x => x < 0 || x + 7 > w.width.cottage)) out.push(`${w.id}: perches must sit inside the cottage`)
  return out
}

/** A named character: fixed genes plus a bio and catchphrase. It visits as a rare stray and can be adopted. */
export type NamedCat = {
  id: string
  name: string
  genes: { coat: string; eyes: Eyes; personality: Personality; marking?: Marking; silhouette?: Silhouette }
  bio: string
  catchphrase: string
  /** Chance (0 to 1) that a stray arriving in one of `worlds` (all worlds when missing) is this cat. */
  appears: { odds: number; worlds?: readonly string[]; available?: Availability }
}

export const defineCat = (cat: NamedCat): NamedCat => cat

/** Every problem with a named cat against the registries; empty means it can visit. */
export const catProblems = (c: NamedCat, coats: readonly string[], worlds: readonly string[], all: readonly NamedCat[]): string[] => [
  ...availabilityProblems(c.appears.available, `${c.id}.appears.available`),
  ...(/^[a-z][a-z0-9-]*$/.test(c.id) ? [] : [`id ${c.id} must be lowercase kebab-case`]),
  ...(c.name.trim() && c.name.length <= 20 ? [] : [`${c.id}: name must be 1 to 20 characters`]),
  ...(all.filter(o => o.name === c.name).length > 1 ? [`${c.id}: another named cat is called ${c.name}`] : []),
  ...(coats.includes(c.genes.coat) ? [] : [`${c.id}: unknown coat ${c.genes.coat}`]),
  ...(c.bio.length <= 80 && c.catchphrase.length <= 40 ? [] : [`${c.id}: bio stays under 80 and catchphrase under 40 characters`]),
  ...(c.appears.odds > 0 && c.appears.odds <= 0.25 ? [] : [`${c.id}: appears.odds is above 0 and at most 0.25`]),
  ...(c.appears.worlds ?? []).filter(w => !worlds.includes(w)).map(w => `${c.id}: unknown world ${w}`),
]

export * from './progression'
