import type { Home, Personality } from '../types'
import { MOVES } from './content'
import { LANDMARK_PERCH } from './content/types'
import type { LandmarkKind, Move, PoseKind } from './content/types'
import { activeCat, moodOf } from './game'
import type { Mood } from './game'
import type { Rng } from './rng'
import { DESIGN } from './scene/fine/draw'
import { landmarksOf, worldCols, worldOf } from './world'

/**
 * Where the active cat is and what it is doing, in design units (4 per scene pixel): x is its left edge, y its
 * height off the floor (negative is up). A seek move goes to a landmark, then stays on it or runs through it.
 */
export type Motion = { x: number; y: number; facing: 1 | -1; move: string; frame: number; left: number; target: number
  stage: 'free' | 'go' | 'stay' | 'through'; isHidden: boolean }
export type MotionCtx = {
  mood: Mood
  personality: Personality
  hour: number
  hunger: number
  energy: number
  /** Range the cat's left edge may roam, in design units. */
  minX: number
  maxX: number
  spots: { bowl: number; bed: number }
  /** Unlocked landmarks, in design units. */
  landmarks: readonly { kind: LandmarkKind; x: number; w: number }[]
}
export type Pose = { kind: PoseKind; phase: number; facing: 1 | -1; lift: number }

export const FPS = 8
const NEAR = 4
// The cat's sprite is 14 scene pixels wide.
const CAT_W = 14 * DESIGN
const byId = new Map(MOVES.map(m => [m.id, m]))
const SIT: Move = byId.get('sit') ?? { id: 'sit', label: 'Sit', pose: 'sit', cycle: 16, speed: 0, seconds: [3, 8], when: { weight: 1 } }
const WALK = byId.get('walk') ?? { ...SIT, id: 'walk', pose: 'walk' as const, cycle: 8, speed: 1 }
const NAP = byId.get('nap-curl') ?? { ...SIT, id: 'nap-curl', pose: 'sleep' as const, cycle: 24, seconds: [20, 60] as const }
export const moveOf = (id: string): Move => byId.get(id) ?? SIT

export const startMotion = (x: number): Motion =>
  ({ x, y: 0, facing: -1, move: SIT.id, frame: 0, left: 0, target: x, stage: 'free', isHidden: false })

// A move with no moods suits any waking mood; only moves that list 'sleeping' run while the cat sleeps.
const isAllowed = (m: Move, ctx: MotionCtx) => {
  const { moods, hours } = m.when
  if (ctx.mood === 'sleeping' ? !moods?.includes('sleeping') : moods && !moods.includes(ctx.mood)) return false
  if (m.seek && !ctx.landmarks.some(l => l.kind === m.seek)) return false
  if (!hours) return true
  const [from, to] = hours
  return from <= to ? ctx.hour >= from && ctx.hour < to : ctx.hour >= from || ctx.hour < to
}
const weightOf = (m: Move, ctx: MotionCtx) => m.when.weight * (m.when.personality?.[ctx.personality] ?? 1)

/** Weighted pick among the moves allowed now, preferring the previous move's `next` list. */
export const pickMove = (prev: Move | undefined, ctx: MotionCtx, rng: Rng): Move => {
  const allowed = MOVES.filter(m => isAllowed(m, ctx) && weightOf(m, ctx) > 0)
  const follow = allowed.filter(m => !prev?.next?.length || prev.next.includes(m.id))
  const pool = follow.length ? follow : allowed
  const total = pool.reduce((sum, m) => sum + weightOf(m, ctx), 0)
  let roll = rng() * total
  for (const m of pool) {
    roll -= weightOf(m, ctx)
    if (roll < 0) return m
  }
  return pool[pool.length - 1] ?? (ctx.mood === 'sleeping' ? NAP : SIT)
}

const clampX = (x: number, ctx: MotionCtx) => Math.max(ctx.minX, Math.min(ctx.maxX, x))

// The nearest landmark of a kind, and where the cat stands to use it: centred on a perch, at the near mouth of a tunnel.
const landmarkFor = (kind: LandmarkKind, x: number, ctx: MotionCtx) => {
  const near = ctx.landmarks.filter(l => l.kind === kind)
    .sort((a, b) => Math.abs(a.x + a.w / 2 - x) - Math.abs(b.x + b.w / 2 - x))[0]
  if (!near) return null
  const isFromLeft = x + CAT_W / 2 < near.x + near.w / 2
  const entry = LANDMARK_PERCH[kind] ? near.x + (near.w - CAT_W) / 2 : isFromLeft ? near.x - CAT_W / 2 : near.x + near.w - CAT_W / 2
  const exit = isFromLeft ? near.x + near.w - CAT_W / 2 : near.x - CAT_W / 2
  return { entry: clampX(entry, ctx), exit: clampX(exit, ctx), perch: LANDMARK_PERCH[kind] }
}

// Walks head for the bowl when hungry and the bed when tired; other travel picks a fresh spot.
const targetOf = (m: Move, x: number, facing: 1 | -1, ctx: MotionCtx, rng: Rng) => {
  if (m.seek) return landmarkFor(m.seek, x, ctx)?.entry ?? x
  if (m.speed === 0) return x
  if (m.pose === 'walk' && ctx.hunger < 50) return clampX(ctx.spots.bowl, ctx)
  if (m.pose === 'walk' && ctx.energy < 40) return clampX(ctx.spots.bed, ctx)
  if (m.pose === 'crouch') return clampX(x + facing * m.speed * m.cycle, ctx)
  return clampX(ctx.minX + rng() * (ctx.maxX - ctx.minX), ctx)
}

const toward = (target: number, x: number, facing: 1 | -1) => (target > x + NEAR ? 1 : target < x - NEAR ? -1 : facing)

const begin = (m: Move, base: Motion, ctx: MotionCtx, rng: Rng): Motion => {
  const [lo, hi] = m.seconds
  const target = targetOf(m, base.x, base.facing, ctx, rng)
  return { ...base, y: 0, isHidden: false, stage: m.seek ? 'go' : 'free', move: m.id, frame: 0,
    left: Math.round((lo + rng() * (hi - lo)) * FPS), target, facing: toward(target, base.x, base.facing) }
}

// A seek move that reached its landmark perches on it, or dives into the tunnel and heads for the far mouth.
const arrive = (m: Motion, move: Move, ctx: MotionCtx): Motion => {
  const spot = move.seek ? landmarkFor(move.seek, m.x, ctx) : null
  if (!spot) return { ...m, left: 0 }
  if (spot.perch) return { ...m, stage: 'stay', y: spot.perch, frame: 0 }
  return { ...m, stage: 'through', isHidden: true, target: spot.exit, facing: toward(spot.exit, m.x, m.facing) }
}

// A sleepy cat walks for as long as the trip to its bed takes, however wide the yard.
const toBed = (cur: Motion, bed: number): Motion => ({ ...cur, y: 0, isHidden: false, stage: 'free', move: WALK.id, frame: 0,
  left: Math.ceil(Math.abs(bed - cur.x) / WALK.speed) + 30 * FPS, target: bed, facing: bed > cur.x ? 1 : -1 })

/** One frame: keep going, or pick the next move when time runs out, the target is reached or the cat falls asleep. */
export const stepMotion = (m: Motion, ctx: MotionCtx, rng: Rng): Motion => {
  const cur = { ...m, x: clampX(m.x, ctx), target: clampX(m.target, ctx) }
  const move = moveOf(cur.move)
  const isAsleep = ctx.mood === 'sleeping'
  const bed = clampX(ctx.spots.bed, ctx)
  // A sleepy cat pads to its bed before curling up, and wakes straight into a new move.
  if (isAsleep && move.pose !== 'sleep' && !(move.id === WALK.id && cur.target === bed && cur.stage === 'free')) {
    return Math.abs(cur.x - bed) <= NEAR ? begin(NAP, cur, ctx, rng) : toBed(cur, bed)
  }
  const isTravelling = cur.stage === 'go' || cur.stage === 'through' || (cur.stage === 'free' && move.speed > 0)
  const isArrived = isTravelling && Math.abs(cur.target - cur.x) < 0.01
  if (isArrived && cur.stage === 'go') return arrive(cur, move, ctx)
  if (cur.left <= 0 || isArrived || (!isAsleep && move.pose === 'sleep')) {
    if (isAsleep && move.id === WALK.id) return Math.abs(cur.x - bed) <= NEAR ? begin(NAP, cur, ctx, rng) : toBed(cur, bed)
    return begin(pickMove(move, ctx, rng), cur, ctx, rng)
  }
  const speed = cur.stage === 'go' ? Math.max(WALK.speed, move.speed * 0.6) : isTravelling ? move.speed : 0
  const gap = cur.target - cur.x
  const dx = Math.sign(gap) * Math.min(speed, Math.abs(gap))
  // Travel to a landmark does not use up the time spent on it.
  const left = cur.stage === 'go' ? cur.left : cur.left - 1
  return { ...cur, x: cur.x + dx, facing: dx > 0 ? 1 : dx < 0 ? -1 : cur.facing, frame: cur.frame + 1, left }
}

export const poseOf = (m: Motion): Pose => {
  const move = cur(m)
  const at = m.frame % move.cycle
  return { kind: move.pose, phase: at / move.cycle, facing: m.facing, lift: m.y + (m.stage === 'go' ? 0 : move.lift?.[at] ?? 0) }
}
// On the way to a landmark the cat walks, whatever it will do there.
const cur = (m: Motion) => (m.stage === 'go' ? WALK : moveOf(m.move))

/** The planner's view of the household: the active cat's needs, its world's bowl, bed, landmarks and width. */
export const motionCtxOf = (home: Home, paneCols: number, hour: number): MotionCtx => {
  const cat = activeCat(home)
  const world = worldOf(home)
  const cols = worldCols(world, home.tier, paneCols)
  return { mood: moodOf(cat), personality: cat.genes.personality, hour, hunger: cat.hunger, energy: cat.energy, minX: 0,
    maxX: Math.max(0, (cols - 16) * DESIGN),
    spots: { bowl: (world.slots.bowl - 14) * DESIGN, bed: world.slots.bed * DESIGN },
    landmarks: landmarksOf(world, home.tier).map(l => ({ kind: l.kind, x: l.x * DESIGN, w: l.w * DESIGN })) }
}
