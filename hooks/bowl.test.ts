import { expect, test } from 'claude-code/testing'

import type { Home } from '../types'
import { FURNITURE } from './content'
import { bowlOf, fillBowl, normalizeBowl } from './bowl'
import { newHome, tick } from './game'

const rich = (home: Home): Home => ({ ...home, coins: 10_000 })

test('fill spends 5c a portion, stops at the cap and refuses a short purse', () => {
  const home = { ...newHome(0), coins: 100, bowl: { food: 0 } }
  const one = fillBowl(home, 1, 1)
  expect(one.coins).toBe(95)
  expect(one.bowl.food).toBe(1)
  expect(one.miles.counts.feed).toBe(1)
  const top = fillBowl(home, 100, 1)
  expect(top.bowl.food).toBe(8)
  expect(top.coins).toBe(60)
  expect(fillBowl({ ...home, coins: 4 }, 1, 1).bowl).toEqual({ food: 0 })
  expect(fillBowl({ ...home, bowl: { food: 8 } }, 1, 1).log).toMatch(/full/)
})

test('each placed bowl has its own cap, and an unknown id falls back to Basic', () => {
  const base = newHome(0)
  for (const item of FURNITURE.filter(f => f.slot === 'bowl')) {
    const home = { ...base, decor: { ...base.decor, bowl: item.id }, bowl: { food: 0 }, coins: 10_000 }
    expect(bowlOf(home)).toMatchObject({ name: item.name, ...item.bowl })
    expect(fillBowl(home, 100, 1).bowl.food).toBe(item.bowl!.cap)
  }
  const unknown = { ...base, decor: { ...base.decor, bowl: 'missing-bowl' } }
  expect(bowlOf(unknown)).toMatchObject({ name: 'Basic bowl', cap: 8, portion: 30 })
  expect(normalizeBowl({ food: 30 }).food).toBe(24)
})

test('a smaller bowl keeps overflow and is not refilled past its cap', () => {
  const home = { ...newHome(0), coins: 1000, bowl: { food: 12 } }
  const held = fillBowl(home, 5, 1)
  expect(held.bowl.food).toBe(12)
  expect(held.coins).toBe(1000)
  expect(held.log).toMatch(/full/)
})

test('the auto-feeder refills an empty bowl and leaves a stocked one alone', () => {
  const once: Home = { ...rich(newHome(0)), owned: [...newHome(0).owned, 'feeder'], decor: { ...newHome(0).decor, bowl: 'feeder' }, bowl: { food: 0 }, lastTick: 0 }
  expect(tick(once, 60_000, () => 0).bowl.food).toBe(1)
  expect(tick({ ...once, bowl: { food: 4 } }, 60_000, () => 0).bowl.food).toBe(4)
})
