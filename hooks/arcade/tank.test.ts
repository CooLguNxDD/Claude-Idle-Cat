import { expect, test } from 'claude-code/testing'

import { GINGER } from '../genes'
import { FLAVORS } from '../theme'
import { STEP, frame } from './engine'
import { NO_MODS } from './game'
import type { Input } from './game'
import { tank } from './games/tank'
import type { TankState } from './games/tank'

const W = 48
const H = 32
const steps = (s: TankState, n: number, input: (s: TankState) => Input[] = () => []) => {
  for (let i = 0; i < n; i++) s = tank.step(s, STEP, input(s))
  return s
}

// Swats the crow, grabs coins, feeds the hungriest fish, and reinvests in fry.
const keeper = (s: TankState): Input[] => {
  if (s.crow && s.crow.warn <= 0) return [{ kind: 'down', x: s.crow.x + 3, y: s.crow.y + 2 }]
  const coin = s.coins.sort((a, b) => b.y - a.y)[0]
  if (coin) return [{ kind: 'down', x: coin.x, y: coin.y }]
  const hungry = s.fish.filter(f => !f.isDead && f.hunger > 0.5).sort((a, b) => b.hunger - a.hunger)[0]
  if (hungry && s.food.length === 0) return [{ kind: 'down', x: hungry.x + 2, y: hungry.y - 2 }]
  if (s.bank >= 40 && s.t < 40) return [{ kind: 'key', key: 'b' }]
  return []
}

test('feeding grows a fry into a fish that drops a coin you can click', async () => {
  let s = tank.init(2, NO_MODS, W, H)
  const fry = s.fish[0]!
  for (let n = 0; n < 2; n++) {
    fry.hunger = 0.9
    s.food = [{ x: fry.x + 2, y: fry.y + 1 }]
    s = steps(s, 3)
  }
  expect(fry.stage).toBe(1)
  fry.drop = 0
  s = steps(s, 1)
  const coin = s.coins[0]!
  s = tank.step(s, STEP, [{ kind: 'down', x: coin.x, y: coin.y }])
  expect(s.bank).toBe(5)
})

test('an unfed tank starves and an unswatted crow eats a fish', async () => {
  const idle = steps(tank.init(4, NO_MODS, W, H), 30 * 60)
  expect(idle.fish.every(f => f.isDead)).toBe(true)
  let s = tank.init(4, NO_MODS, W, H)
  s.t = 19.9
  s = steps(s, 10 * 60, st => (st.crow ? [] : st.fish.filter(f => f.hunger > 0.5 && !f.isDead).map(f => ({ kind: 'down' as const, x: f.x + 2, y: f.y - 2 }))))
  expect(s.fish.filter(f => f.isDead).length).toBeGreaterThan(0)
})

test('a good keeper earns a medal within the score limit', async () => {
  let s = tank.init(9, NO_MODS, W, H)
  const f = frame(W, H)
  for (let i = 0; i < 60 * 60 + 5 && !s.isOver; i++) {
    s = tank.step(s, STEP, i % 6 === 0 ? keeper(s) : [])
    if (i % 60 === 0) tank.draw(s, f, { f: FLAVORS.mocha, genes: GINGER, tick: i })
  }
  expect(tank.score(s)).toBeGreaterThan(tank.medals[0])
  expect(tank.score(s)).toBeLessThanOrEqual(tank.maxScore(60_000))
})
