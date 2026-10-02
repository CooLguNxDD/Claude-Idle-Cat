import { expect, test } from 'claude-code/testing'

import { act, buy, checkIn, moodOf, newCat, normalize, priceOf, stageOf, tick } from './game'
import { COLS, ROWS, frameCells } from './sprite'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const noEvents = () => 0

test('stats decay and coins accrue while AFK, capped at 8h', async () => {
  const cat = newCat(0)
  const later = tick(cat, 2 * HOUR, noEvents)
  expect(later.hunger).toBeLessThan(cat.hunger)
  expect(later.coins).toBeGreaterThan(cat.coins)
  expect(tick(cat, 100 * HOUR, noEvents).coins).toBe(tick(cat, 8 * HOUR, noEvents).coins)
})

test('feeding costs coins and fills hunger; sleeping blocks play', async () => {
  const cat = { ...newCat(0), hunger: 40 }
  const fed = act(cat, 'feed', 1)
  expect(fed.coins).toBe(cat.coins - 5)
  expect(fed.hunger).toBe(70)
  expect(fed.effect?.kind).toBe('fish')
  const asleep = act(cat, 'nap', 1)
  expect(moodOf(asleep)).toBe('sleeping')
  expect(act(asleep, 'play', 1).joy).toBe(asleep.joy)
})

test('xp levels up and evolves the cat', async () => {
  let cat = newCat(0)
  for (let i = 0; i < 10; i++) cat = act({ ...cat, energy: 100 }, 'play', 1)
  expect(cat.level).toBe(2)
  expect(stageOf(5)).toBe('cat')
  expect(stageOf(10)).toBe('chonk')
})

test('shop prices grow and the auto-feeder feeds a hungry cat', async () => {
  const rich = { ...newCat(0), coins: 1000 }
  const once = buy(rich, 'feeder', 1)
  expect(once.upgrades.feeder).toBe(1)
  expect(priceOf(once, 'feeder')).toBeGreaterThan(priceOf(rich, 'feeder'))
  const fed = tick({ ...once, hunger: 10, lastTick: 0 }, 60_000, noEvents)
  expect(fed.hunger).toBeGreaterThan(30)
})

test('daily streak pays once per day and resets after a gap', async () => {
  const day1 = checkIn(newCat(0), 10 * DAY)
  expect(day1.bonus).toBeGreaterThan(0)
  expect(checkIn(day1.cat, 10 * DAY + HOUR).bonus).toBe(0)
  expect(checkIn(day1.cat, 11 * DAY).cat.streak).toBe(2)
  expect(checkIn(day1.cat, 13 * DAY).cat.streak).toBe(1)
})

test('old saves gain the new fields', async () => {
  const cat = normalize({ name: 'Tofu', coins: 3 }, 0)
  expect(cat.upgrades.bed).toBe(0)
  expect(cat.name).toBe('Tofu')
})

test('a scene frame packs every cell', async () => {
  const cells = frameCells({ ...newCat(0), effect: { kind: 'hearts', at: 0 } }, 500, 3, 22)
  expect(cells.length).toBe(Math.ceil((COLS * ROWS * 12) / 3) * 4)
})
