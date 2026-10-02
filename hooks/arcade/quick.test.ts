import { expect, test } from 'claude-code/testing'

import { GINGER } from '../genes'
import { FLAVORS } from '../theme'
import { STEP, frame } from './engine'
import { NO_MODS } from './game'
import type { Game, Input } from './game'
import { fishCatch } from './games/catch'
import type { CatchState } from './games/catch'
import { laser } from './games/laser'
import type { LaserState } from './games/laser'
import { whack } from './games/whack'
import type { WhackState } from './games/whack'

const W = 48
const H = 32
const play = <S>(game: Game<S>, bot: (s: S, i: number) => Input[] = () => []) => {
  let s = game.init(11, NO_MODS, W, H)
  const f = frame(W, H)
  for (let i = 0; i < game.seconds * 60 + 5 && !game.isOver(s); i++) {
    s = game.step(s, STEP, bot(s, i))
    if (i % 30 === 0) game.draw(s, f, { f: FLAVORS.latte, genes: GINGER, tick: i })
  }
  return s
}

test('Fish Catch: a bowl that follows the fish wins a medal, an idle one does not', async () => {
  const idle = play(fishCatch)
  const good = play(fishCatch, (s: CatchState) => {
    const next = s.drops.filter(d => d.kind === 'fish' || d.kind === 'gold').sort((a, b) => b.y - a.y)[0]
    return next ? [{ kind: 'move', x: next.x + 3, y: 0 }] : []
  })
  expect(fishCatch.score(good)).toBeGreaterThan(fishCatch.medals[0])
  expect(fishCatch.score(good)).toBeGreaterThan(fishCatch.score(idle))
  expect(fishCatch.score(good)).toBeLessThanOrEqual(fishCatch.maxScore(fishCatch.seconds * 1000))
})

test('Fish Catch: three cucumbers end the round', async () => {
  let s = fishCatch.init(1, NO_MODS, W, H)
  for (let n = 0; n < 3; n++) {
    s.drops.push({ kind: 'cucumber', x: s.bowl - 3, y: H - 10, vy: 30 })
    for (let i = 0; i < 30; i++) s = fishCatch.step(s, STEP, [])
  }
  expect(s.lives).toBe(0)
  expect(fishCatch.isOver(s)).toBe(true)
})

test('Laser Chase: clicking on the dot scores, combos multiply, and a miss resets the combo', async () => {
  let s: LaserState = laser.init(3, NO_MODS, W, H)
  for (let n = 0; n < 3; n++) {
    s = laser.step(s, STEP, [{ kind: 'down', x: s.dot.x, y: s.dot.y }])
    s.dot.pause = 1
    for (let i = 0; i < 30; i++) s = laser.step(s, STEP, [])
  }
  expect(s.catches).toBe(3)
  expect(s.points).toBe(10 + 20 + 30)
  s.dot = { ...s.dot, x: 2, y: 2, pause: 1 }
  s = laser.step(s, STEP, [{ kind: 'down', x: W - 2, y: H - 2 }])
  for (let i = 0; i < 30; i++) s = laser.step(s, STEP, [])
  expect(s.combo).toBe(0)
  const good = play(laser, (st: LaserState, i) => (i % 30 === 0 ? [{ kind: 'down', x: st.dot.x, y: st.dot.y }] : []))
  expect(laser.score(good)).toBeGreaterThan(laser.medals[0])
  expect(laser.score(good)).toBeLessThanOrEqual(laser.maxScore(laser.seconds * 1000))
  expect(laser.score(play(laser))).toBe(0)
})

test('Whack-a-Mouse: bopping mice scores and the slipper costs points', async () => {
  const good = play(whack, (s: WhackState) =>
    s.holes.flatMap((p, i) => (p && !p.isHit && p.kind !== 'slipper' && p.up > 0.15 ? [{ kind: 'key' as const, key: String(i + 1) }] : [])))
  expect(whack.score(good)).toBeGreaterThan(whack.medals[1])
  expect(whack.score(good)).toBeLessThanOrEqual(whack.maxScore(whack.seconds * 1000))
  let s = whack.init(5, NO_MODS, W, H)
  s.points = 50
  s.holes[4] = { kind: 'slipper', up: 0.5, life: 1, isHit: false }
  s = whack.step(s, STEP, [{ kind: 'key', key: '5' }])
  expect(s.points).toBe(30)
  s.holes[0] = { kind: 'mouse', up: 0.5, life: 1, isHit: false }
  s = whack.step(s, STEP, [{ kind: 'down', x: 2, y: 4 }])
  expect(s.points).toBe(40)
})
