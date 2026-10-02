import { expect, test } from 'claude-code/testing'

import type { Home } from '../types'
import { DECAY_FLOOR, act, activeCat, adopt, checkIn, coinRate, migrate, moodOf, newHome, stageOf, switchTo,
  tick } from './game'
import { seeded } from './rng'
import { ROWS, frameCells } from './scene'
import { FLAVORS } from './theme'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const noEvents = () => 0
const rich = (home: Home): Home => ({ ...home, coins: 10_000 })

test('coins accrue while AFK, capped at 8h, and stats never drop below the floor', async () => {
  const home = newHome(0)
  const later = tick(home, 2 * HOUR, noEvents)
  expect(activeCat(later).hunger).toBeLessThan(activeCat(home).hunger)
  expect(later.coins).toBeGreaterThan(home.coins)
  expect(tick(home, 100 * HOUR, noEvents).coins).toBe(tick(home, 8 * HOUR, noEvents).coins)
  const away = activeCat(tick(home, 8 * HOUR, noEvents))
  expect(Math.min(away.hunger, away.joy, away.energy)).toBeGreaterThanOrEqual(DECAY_FLOOR)
  expect(moodOf(away)).toBe('grumpy')
})

test('feeding costs coins and fills hunger; sleeping blocks play', async () => {
  const home = newHome(0)
  const hungry = { ...home, cats: home.cats.map(c => ({ ...c, hunger: 40 })) }
  const fed = act(hungry, 'feed', 1)
  expect(fed.coins).toBe(hungry.coins - 5)
  expect(activeCat(fed).hunger).toBe(70)
  expect(fed.effect?.kind).toBe('fish')
  const asleep = act(hungry, 'nap', 1)
  expect(moodOf(activeCat(asleep))).toBe('sleeping')
  expect(activeCat(act(asleep, 'play', 1)).joy).toBe(activeCat(asleep).joy)
})

test('xp levels up and evolves the cat', async () => {
  let home = newHome(0)
  for (let i = 0; i < 10; i++) home = act({ ...home, cats: home.cats.map(c => ({ ...c, energy: 100 })) }, 'play', 1)
  expect(activeCat(home).level).toBe(2)
  expect(stageOf(5)).toBe('cat')
  expect(stageOf(10)).toBe('cat')
})

test('a placed auto-feeder feeds every hungry cat', async () => {
  const once: Home = { ...rich(newHome(0)), owned: [...newHome(0).owned, 'feeder'], decor: { ...newHome(0).decor, bowl: 'feeder' } }
  const two = adopt(once, 1, seeded(1))
  const hungry = { ...two, lastTick: 0, cats: two.cats.map(c => ({ ...c, hunger: 10 })) }
  expect(tick(hungry, 60_000, noEvents).cats.every(c => c.hunger > 30)).toBe(true)
})

test('adoption rolls genes, picks a free name and respects the house size', async () => {
  const two = adopt(rich(newHome(0)), 5, seeded(7))
  expect(two.cats.length).toBe(2)
  expect(two.activeId).toBe('c2')
  expect(two.cats[1]?.name).not.toBe('Mochi')
  expect(adopt(two, 6, seeded(8)).cats.length).toBe(2)
  expect(adopt(newHome(0), 5, seeded(7)).log).toMatch(/costs/)
  expect(activeCat(switchTo(two, 'mochi')).name).toBe('Mochi')
  expect(coinRate(two)).toBeGreaterThan(coinRate(newHome(0)))
})

test('daily streak pays once per day and resets after a gap', async () => {
  const day1 = checkIn(newHome(0), 10 * DAY)
  expect(day1.bonus).toBeGreaterThan(0)
  expect(checkIn(day1.home, 10 * DAY + HOUR).bonus).toBe(0)
  expect(checkIn(day1.home, 11 * DAY).home.streak).toBe(2)
  expect(checkIn(day1.home, 13 * DAY).home.streak).toBe(1)
})

test('a v0.2 save migrates into a household without losing progress', async () => {
  const v1 = {
    name: 'Mochi', hunger: 61, joy: 72, energy: 50, xp: 30, level: 9, coins: 812.5, isAsleep: false,
    lastTick: 5_000, frame: 900, log: 'Mochi purrs.', streak: 3, lastDay: 20_000,
    upgrades: { feeder: 1, toy: 2, bed: 0 }, effect: null,
  }
  const home = migrate(v1, 9_000)
  const cat = activeCat(home)
  expect(home.version).toBe(3)
  expect(home.coins).toBe(812.5)
  expect(home.streak).toBe(3)
  expect(home.decor.bowl).toBe('feeder')
  expect(home.decor.toy).toBe('wand')
  expect(home.owned).toContain('box')
  expect(cat.name).toBe('Mochi')
  expect(cat.level).toBe(9)
  expect(cat.xp).toBe(30)
  expect(cat.genes.coat).toBe('ginger')
  expect(migrate(home, 10_000)).toEqual(home)
  const v2 = { ...home, version: 2, maxCats: 2, upgrades: { bed: 3 } } as unknown
  const fromV2 = migrate(v2, 10_000)
  expect(fromV2.version).toBe(3)
  expect(fromV2.decor.bed).toBe('heated')
  expect(fromV2.nextId).toBe(2)
  expect('maxCats' in fromV2).toBe(false)
  expect(migrate(undefined, 1).cats.length).toBe(1)
})

test('a scene frame packs every cell at any width', async () => {
  const home = adopt(rich(newHome(0)), 0, seeded(3))
  for (const cols of [34, 56]) {
    const cells = frameCells({ home, now: 500, tick: 3, hour: 22, flavor: FLAVORS.mocha, cols })
    expect(cells.length).toBe(Math.ceil((cols * ROWS * 12) / 3) * 4)
  }
})
