import { expect, test } from 'claude-code/testing'

import type { Home } from '../types'
import { DECAY_FLOOR, IDLE_SHARE, SPEND_CAP_MINUTES, act, activeCat, adopt, checkIn, coinRate, migrate, moodOf, newHome,
  nextCat, spendPay, stageOf, switchTo, tick, toolPay, turnPay } from './game'
import { seeded } from './rng'
import { ROWS, frameCells } from './scene'
import { FLAVORS } from './theme'

const HOUR = 3_600_000
const local = (day: number, hour = 9) => new Date(2026, 0, 1 + day, hour).getTime()
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
  expect(activeCat(nextCat(two)).name).toBe('Mochi')
  expect(activeCat(nextCat(nextCat(two))).id).toBe('c2')
  expect(nextCat(newHome(0)).log).toMatch(/only cat/)
  expect(coinRate(two)).toBeGreaterThan(coinRate(newHome(0)))
})

test('idle time pays a share of the full rate; Claude\'s work pays minutes of it', async () => {
  const home = newHome(0)
  expect(tick(home, 30 * 60_000, noEvents).coins - home.coins).toBe(coinRate(home) * IDLE_SHARE * 30)
  expect([toolPay(home), turnPay(home)]).toEqual([1, 3])
  const pro = { ...home, cats: home.cats.map(c => ({ ...c, level: 20 })) }
  expect(toolPay(pro)).toBeGreaterThan(toolPay(home))
  expect(turnPay(pro)).toBeGreaterThan(turnPay(home))
})

test('a reply\'s spend pays coins, never below zero and capped per reply', async () => {
  const home = { ...newHome(0), cats: newHome(0).cats.map(c => ({ ...c, level: 10 })) }
  expect(spendPay(home, 0)).toBe(0)
  expect(spendPay(home, -1)).toBe(0)
  expect(spendPay(home, 0.5)).toBeGreaterThan(spendPay(home, 0.1))
  expect(spendPay(home, 1_000)).toBe(Math.round(coinRate(home) * SPEND_CAP_MINUTES))
})

test('daily streak pays once per day and resets after a gap', async () => {
  const day1 = checkIn(newHome(0), local(10))
  expect(day1.bonus).toBeGreaterThan(0)
  expect(checkIn(day1.home, local(10, 23)).bonus).toBe(0)
  expect(checkIn(day1.home, local(11, 1)).home.streak).toBe(2)
  expect(checkIn(day1.home, local(13)).home.streak).toBe(1)
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
