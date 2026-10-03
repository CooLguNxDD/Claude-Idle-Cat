import type { Home, Personality } from '../types'
import { MOVES } from './content'
import type { Move, PoseKind } from './content/types'
import { activeCat, moodOf } from './game'
import type { Mood } from './game'
import type { Rng } from './rng'
import { DESIGN } from './scene/fine/draw'

// Where the active cat is and what it is doing; x is its left edge in design units (4 per scene pixel).
export type Motion = { x: number; facing: 1 | -1; move: string; frame: number; left: number; target: number }
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
}
export type Pose = { kind: PoseKind; phase: number; facing: 1 | -1; lift: number }

export const FPS = 8
const NEAR = 4
const byId = new Map(MOVES.map(m => [m.id, m]))
const SIT: Move = byId.get('sit') ?? { id: 'sit', label: 'Sit', pose: 'sit', cycle: 16, speed: 0, seconds: [3, 8], when: { weight: 1 } }
const WALK = byId.get('walk') ?? { ...SIT, id: 'walk', pose: 'walk' as const, cycle: 8, speed: 1 }
const NAP = byId.get('nap-curl') ?? { ...SIT, id: 'nap-curl', pose: 'sleep' as const, cycle: 24, seconds: [20, 60] as const }
export const moveOf = (id: string): Move => byId.get(id) ?? SIT

export const startMotion = (x: number): Motion => ({ x, facing: -1, move: SIT.id, frame: 0, left: 0, target: x })

// A move with no moods suits any waking mood; only moves that list 'sleeping' run while the cat sleeps.
const isAllowed = (m: Move, ctx: MotionCtx) => {
  const { moods, hours } = m.when
  if (ctx.mood === 'sleeping' ? !moods?.includes('sleeping') : moods && !moods.includes(ctx.mood)) return false
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

// Walks head for the bowl when hungry and the bed when tired; other travel picks a fresh spot.
const targetOf = (m: Move, x: number, facing: 1 | -1, ctx: MotionCtx, rng: Rng) => {
  if (m.speed === 0) return x
  if (m.pose === 'walk' && ctx.hunger < 50) return clampX(ctx.spots.bowl, ctx)
  if (m.pose === 'walk' && ctx.energy < 40) return clampX(ctx.spots.bed, ctx)
  if (m.pose === 'crouch') return clampX(x + facing * m.speed * m.cycle, ctx)
  return clampX(ctx.minX + rng() * (ctx.maxX - ctx.minX), ctx)
}

const begin = (m: Move, base: Motion, ctx: MotionCtx, rng: Rng): Motion => {
  const [lo, hi] = m.seconds
  const target = targetOf(m, base.x, base.facing, ctx, rng)
  const facing = target > base.x + NEAR ? 1 : target < base.x - NEAR ? -1 : base.facing
  return { ...base, move: m.id, frame: 0, left: Math.round((lo + rng() * (hi - lo)) * FPS), target, facing }
}

/** One frame: keep going, or pick the next move when time runs out, the target is reached or the cat falls asleep. */
export const stepMotion = (m: Motion, ctx: MotionCtx, rng: Rng): Motion => {
  const cur = { ...m, x: clampX(m.x, ctx), target: clampX(m.target, ctx) }
  const move = moveOf(cur.move)
  const isAsleep = ctx.mood === 'sleeping'
  // A sleepy cat pads to its bed before curling up, and wakes straight into a new move.
  if (isAsleep && move.pose !== 'sleep' && !(move.id === WALK.id && cur.target === clampX(ctx.spots.bed, ctx))) {
    const bed = clampX(ctx.spots.bed, ctx)
    if (Math.abs(cur.x - bed) <= NEAR) return begin(NAP, cur, ctx, rng)
    return { ...cur, move: WALK.id, frame: 0, left: 30 * FPS, target: bed, facing: bed > cur.x ? 1 : -1 }
  }
  const isArrived = move.speed > 0 && Math.abs(cur.target - cur.x) < 0.01
  if (cur.left <= 0 || isArrived || (!isAsleep && move.pose === 'sleep')) {
    if (isAsleep && move.id === WALK.id) return begin(NAP, cur, ctx, rng)
    return begin(pickMove(move, ctx, rng), cur, ctx, rng)
  }
  const gap = cur.target - cur.x
  const dx = Math.sign(gap) * Math.min(move.speed, Math.abs(gap))
  return { ...cur, x: cur.x + dx, facing: dx > 0 ? 1 : dx < 0 ? -1 : cur.facing, frame: cur.frame + 1, left: cur.left - 1 }
}

export const poseOf = (m: Motion): Pose => {
  const move = moveOf(m.move)
  const at = m.frame % move.cycle
  return { kind: move.pose, phase: at / move.cycle, facing: m.facing, lift: move.lift?.[at] ?? 0 }
}

/** The planner's view of the household: the active cat's needs and where its bowl and bed sit in a yard `cols` wide. */
export const motionCtxOf = (home: Home, cols: number, hour: number): MotionCtx => {
  const cat = activeCat(home)
  const maxX = Math.max(0, (cols - 16) * DESIGN)
  return { mood: moodOf(cat), personality: cat.genes.personality, hour, hunger: cat.hunger, energy: cat.energy, minX: 0, maxX,
    spots: { bowl: (cols - 9 - 14) * DESIGN, bed: 0 } }
}
