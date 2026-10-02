import { expect, test } from 'claude-code/testing'

import { GINGER } from '../genes'
import { FLAVORS } from '../theme'
import { STEP, frame } from './engine'
import { NO_MODS } from './game'
import type { Input } from './game'
import { COST, geometry, lanes } from './games/lanes'
import type { Card, LanesState } from './games/lanes'

const W = 112
const H = 64
const g = geometry(W, H)
const at = (lane: number, col: number): Input => ({ kind: 'down', x: g.left + col * g.cw + 4, y: g.top + lane * g.lh + 6 })
const steps = (s: LanesState, n: number, input: (s: LanesState) => Input[] = () => []) => {
  for (let i = 0; i < n && !s.isOver; i++) s = lanes.step(s, STEP, input(s))
  return s
}
const pickKey = (card: Card): Input => ({ kind: 'key', key: String(['yarn', 'nap', 'box'].indexOf(card) + 1) })

// Grabs catnip, follows the build plan, then boxes the busiest lane.
// Throwers at the back (col 1), nap walls in front (col 4), then a second row of throwers.
const plan: [Card, number, number][] = [
  ['yarn', 1, 1], ['yarn', 0, 1], ['yarn', 2, 1], ['nap', 1, 4], ['nap', 0, 4], ['nap', 2, 4],
  ['yarn', 1, 2], ['yarn', 0, 2], ['yarn', 2, 2],
]
const general = (s: LanesState): Input[] => {
  const drop = s.drops[0]
  if (drop) return [{ kind: 'down', x: drop.x + 2, y: drop.y + 2 }]
  const todo = plan.find(([, lane, col]) => !s.units.some(u => u.lane === lane && u.col === col) && !s.lost[lane])
  if (todo && s.catnip >= COST[todo[0]] && s.recharge[todo[0]] <= 0) return [pickKey(todo[0]), at(todo[1], todo[2])]
  const busy = [0, 1, 2].sort((a, b) => s.mice.filter(m => m.lane === b).length - s.mice.filter(m => m.lane === a).length)[0] ?? 0
  if (!todo && s.catnip >= COST.box + 30 && s.recharge.box <= 0 && s.mice.some(m => m.lane === busy)) return [pickKey('box'), at(busy, 5)]
  return []
}

test('an undefended yard loses its lanes', async () => {
  const s = steps(lanes.init(3, NO_MODS, W, H), 61 * 60)
  expect(s.lost.some(Boolean)).toBe(true)
  expect(lanes.score(s)).toBeLessThan(lanes.medals[0])
})

test('yarn throwers stop mice, box traps catch one, and napping cats dream catnip', async () => {
  let s = lanes.init(1, NO_MODS, W, H)
  s = lanes.step(s, STEP, [pickKey('yarn'), at(0, 0)])
  expect(s.units.length).toBe(1)
  expect(s.catnip).toBe(100 - COST.yarn)
  s.mice.push({ lane: 0, x: W - 20, hp: 3, isRat: false, bite: 0 })
  s = steps(s, 5 * 60)
  expect(s.repelled).toBe(1)
  s.recharge.box = 0
  s.catnip = 200
  s = lanes.step(s, STEP, [pickKey('box'), at(1, 3)])
  s = steps(s, 70)
  s.mice.push({ lane: 1, x: g.left + 3 * g.cw + g.cw - 4, hp: 7, isRat: true, bite: 0 })
  s = steps(s, 2)
  expect(s.repelled).toBe(2)
  expect(s.units.some(u => u.card === 'box')).toBe(false)
  const before = s.catnip
  s = lanes.step(s, STEP, [pickKey('nap'), at(2, 0)])
  s = steps(s, 8 * 60 + 10)
  expect(s.catnip).toBeGreaterThanOrEqual(before - COST.nap + 15)
})

test('a good general holds the yard for a medal within the score limit', async () => {
  let s = lanes.init(9, NO_MODS, W, H)
  const f = frame(W, H)
  for (let i = 0; i < 61 * 60 && !s.isOver; i++) {
    s = lanes.step(s, STEP, i % 10 === 0 ? general(s) : [])
    if (i % 60 === 0) lanes.draw(s, f, { f: FLAVORS.frappe, genes: GINGER, tick: i })
  }
  expect(lanes.score(s)).toBeGreaterThan(lanes.medals[1])
  expect(lanes.score(s)).toBeLessThanOrEqual(lanes.maxScore(60_000))
})

test('a narrow world gets five columns so every cell fits a cat', async () => {
  expect(geometry(68, H).cols).toBe(5)
  expect(geometry(68, H).cw).toBeGreaterThanOrEqual(12)
  expect(geometry(112, H).cols).toBe(7)
})
