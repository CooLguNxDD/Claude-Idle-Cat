import { expect, test } from 'claude-code/testing'

import { MOVES } from './content'
import { moveProblems, POSE_KINDS } from './content/types'
import { newHome } from './game'
import { FPS, motionCtxOf, moveOf, pickMove, poseOf, startMotion, stepMotion } from './motion'
import type { Motion, MotionCtx } from './motion'
import { seeded } from './rng'
import { frameCells, frameImage } from './scene'
import { CLASSIC_X } from './scene/cats'
import { FLAVORS } from './theme'

const ctx = (over: Partial<MotionCtx> = {}): MotionCtx => ({ mood: 'happy', personality: 'playful', hour: 12, hunger: 90,
  energy: 90, minX: 0, maxX: 160, spots: { bowl: 140, bed: 0 }, landmarks: [], ...over })
const YARD = [{ kind: 'tower' as const, x: 300, w: 48 }, { kind: 'tunnel' as const, x: 400, w: 88 }, { kind: 'pipe' as const, x: 560, w: 64 }]
const run = (m: Motion, c: MotionCtx, frames: number, seed = 7) => {
  const rng = seeded(seed)
  const seen: Motion[] = []
  for (let i = 0; i < frames; i++) seen.push(m = stepMotion(m, c, rng))
  return seen
}

test('every move file is valid and the planner can pick it', () => {
  for (const move of MOVES) expect(moveProblems(move, MOVES)).toEqual([])
  const picked = new Set<string>()
  const rng = seeded(3)
  for (const mood of ['happy', 'ok', 'grumpy', 'sleeping'] as const) for (const personality of ['lazy', 'playful', 'shy'] as const)
    for (const hour of [3, 7, 15, 22]) for (let i = 0; i < 200; i++) picked.add(pickMove(undefined, ctx({ mood, personality, hour, maxX: 800, landmarks: YARD }), rng).id)
  expect([...picked].sort()).toEqual(MOVES.map(m => m.id).sort())
})

test('the validator names bad moves', () => {
  const bad = { ...moveOf('hop'), id: 'Bad', cycle: 4, next: ['nowhere'] }
  expect(moveProblems(bad, MOVES).length).toBe(3)
})

test('the cat roams inside the yard, faces where it walks and repeats from the same seed', () => {
  const c = ctx()
  const path = run(startMotion(CLASSIC_X), c, 40 * FPS)
  expect(path.every(m => m.x >= c.minX && m.x <= c.maxX)).toBe(true)
  expect(new Set(path.map(m => m.move)).size).toBeGreaterThan(2)
  expect(new Set(path.map(m => Math.round(m.x))).size).toBeGreaterThan(5)
  for (let i = 1; i < path.length; i++) {
    const dx = path[i]!.x - path[i - 1]!.x
    if (dx !== 0) expect(path[i]!.facing).toBe(dx > 0 ? 1 : -1)
  }
  expect(run(startMotion(CLASSIC_X), c, 200).map(m => m.x)).toEqual(run(startMotion(CLASSIC_X), c, 200).map(m => m.x))
})

test('a sleeping cat pads to its bed and naps; waking starts a new move', () => {
  const asleep = ctx({ mood: 'sleeping', spots: { bowl: 140, bed: 10 } })
  const path = run({ ...startMotion(120), move: 'zoomies', left: 99 }, asleep, 20 * FPS)
  expect(path[0]!.move).toBe('walk')
  const last = path[path.length - 1]!
  expect(last.move).toBe('nap-curl')
  expect(Math.abs(last.x - 10)).toBeLessThanOrEqual(4)
  expect(stepMotion(last, ctx(), seeded(1)).move).not.toBe('nap-curl')
})

test('a hungry cat walks toward its bowl', () => {
  const toBowl = run(startMotion(20), ctx({ hunger: 20, mood: 'grumpy' }), 60 * FPS).find(m => moveOf(m.move).pose === 'walk')
  expect(toBowl?.target).toBe(140)
})

test('poses report cycle phase, facing and lift', () => {
  const hop: Motion = { ...startMotion(40), move: 'hop', frame: 4, left: 5, facing: 1 }
  const pose = poseOf(hop)
  expect(pose.kind).toBe('sit')
  expect(pose.phase).toBe(0.5)
  expect(pose.lift).toBe(-6)
  expect(POSE_KINDS).toContain(poseOf({ ...hop, move: 'no-such-move' }).kind)
})

test('every pose draws in both renderers, facing both ways, and the classic spot stays the default', () => {
  const home = newHome(0)
  const base = { home, now: 0, tick: 3, hour: 12, flavor: FLAVORS.mocha, cols: 48 }
  const classic = frameImage(base).rgba
  expect(frameImage({ ...base, motion: startMotion(CLASSIC_X) }).rgba).toBe(classic)
  const images = new Set<string>()
  for (const move of MOVES) for (const facing of [1, -1] as const) {
    const motion: Motion = { ...startMotion(60), move: move.id, frame: Math.floor(move.cycle / 2), facing }
    images.add(frameImage({ ...base, motion }).rgba)
    expect(frameCells({ ...base, motion }).length).toBeGreaterThan(0)
  }
  expect(images.size).toBeGreaterThan(MOVES.length)
  expect(images.has(classic)).toBe(false)
})

test('the planner context reads the world: its width, bowl, bed and unlocked landmarks', () => {
  const home = newHome(0)
  const c = motionCtxOf(home, 48, 9)
  expect(c.maxX).toBe((80 - 16) * 4)
  expect(c.spots.bowl).toBe((60 - 14) * 4)
  expect(c.landmarks).toEqual([])
  expect(motionCtxOf({ ...home, tier: 2 }, 48, 9).landmarks.map(l => l.kind)).toEqual(['tower', 'tunnel', 'pipe'])
  expect(c.mood).toBe('happy')
})

test('a seek move walks to the tower and perches on top, and a tunnel dash hides the cat until the far mouth', () => {
  const c = ctx({ maxX: 800, landmarks: YARD })
  let m: Motion = { ...startMotion(100), move: 'tower-perch', left: 80, target: 300 + (48 - 56) / 2, stage: 'go', facing: 1 }
  const rng = seeded(5)
  for (let i = 0; i < 200 && m.stage === 'go'; i++) m = stepMotion(m, c, rng)
  expect(m.stage).toBe('stay')
  expect(m.y).toBe(-28)
  expect(poseOf(m).lift).toBe(-28)
  let t: Motion = { ...startMotion(320), move: 'tunnel-dash', left: 40, target: 400 - 28, stage: 'go', facing: 1 }
  const hidden: boolean[] = []
  for (let i = 0; i < 300 && t.move === 'tunnel-dash'; i++) hidden.push((t = stepMotion(t, c, rng)).isHidden)
  expect(hidden).toContain(true)
  expect(t.isHidden).toBe(false)
  expect(t.x).toBeGreaterThan(400 + 44)
})

test('seek moves are skipped in a yard without their landmark', () => {
  const rng = seeded(9)
  for (let i = 0; i < 500; i++) expect(pickMove(undefined, ctx(), rng).seek).toBeUndefined()
})
