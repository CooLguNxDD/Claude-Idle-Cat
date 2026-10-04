import { expect, test } from 'claude-code/testing'

import type { Home } from '../types'
import { fillBowl } from './bowl'
import { newHome, tick } from './game'

const rich = (home: Home): Home => ({ ...home, coins: 10_000 })

test('fill spends 5c a portion, stops at the cap and refuses a short purse', () => {
  const home = { ...newHome(0), coins: 100, bowl: { food: 0 } }
  const one = fillBowl(home, 1, 1)
  expect(one.coins).toBe(95)
  expect(one.bowl.food).toBe(1)
  expect(one.miles.counts.feed).toBe(1)
  const top = fillBowl(home, 100, 1)
  expect(top.bowl.food).toBe(10)
  expect(top.coins).toBe(50)
  expect(fillBowl({ ...home, coins: 4 }, 1, 1).bowl).toEqual({ food: 0 })
  expect(fillBowl({ ...home, bowl: { food: 10 } }, 1, 1).log).toMatch(/full/)
})

test('the auto-feeder refills an empty bowl and leaves a stocked one alone', () => {
  const once: Home = { ...rich(newHome(0)), owned: [...newHome(0).owned, 'feeder'], decor: { ...newHome(0).decor, bowl: 'feeder' }, bowl: { food: 0 }, lastTick: 0 }
  expect(tick(once, 60_000, () => 0).bowl.food).toBe(1)
  expect(tick({ ...once, bowl: { food: 4 } }, 60_000, () => 0).bowl.food).toBe(4)
})
