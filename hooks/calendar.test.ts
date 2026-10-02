import { expect, test } from 'claude-code/testing'

import { buyCatnip, buyPrice, celebrate, festivalOf, isBirthday, marketNow, seasonOf, sellCatnip, sellPrice, spoil,
  weekOf } from './calendar'
import { newCat, newHome } from './game'
import { GINGER } from './genes'
import { dailyStock, furniture } from './home'

const DAY = 86_400_000
const local = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h).getTime()
// 2026-10-04 is a Sunday.
const SUNDAY = local(2026, 10, 4)

test('seasons and festivals map to the right months', async () => {
  expect([1, 4, 7, 10, 12].map(seasonOf)).toEqual(['winter', 'spring', 'summer', 'autumn', 'winter'])
  expect(festivalOf(10)).toBe('pumpkins')
  expect(festivalOf(12)).toBe('lights')
  expect(festivalOf(6)).toBeNull()
})

test('birthdays come yearly and are celebrated once', async () => {
  const cat = newCat('c1', 'Mochi', GINGER, local(2025, 10, 4))
  expect(isBirthday(cat, local(2026, 10, 4, 15))).toBe(true)
  expect(isBirthday(cat, local(2026, 10, 5))).toBe(false)
  expect(isBirthday(cat, local(2025, 10, 4, 20))).toBe(false)
  const home = { ...newHome(0), cats: [cat] }
  const party = celebrate(home, local(2026, 10, 4, 15))
  expect(party.coins).toBeGreaterThan(home.coins)
  expect(celebrate(party, local(2026, 10, 4, 18))).toBe(party)
})

test('Daisy sells on Sunday mornings; Nyan buys during the week', async () => {
  expect(new Date(SUNDAY).getDay()).toBe(0)
  expect(marketNow(SUNDAY, 9, true).kind).toBe('buy')
  expect(marketNow(SUNDAY + 5 * 3_600_000, 14, true).kind).toBe('closed')
  expect(marketNow(SUNDAY + DAY, 10, true).kind).toBe('sell')
  expect(marketNow(SUNDAY + DAY, 23, false).kind).toBe('closed')
  const price = buyPrice(SUNDAY)
  expect(price).toBeGreaterThanOrEqual(90)
  expect(price).toBeLessThanOrEqual(110)
  for (let d = 1; d <= 6; d++) expect(sellPrice(SUNDAY + d * DAY, 10)).toBeGreaterThan(0)
})

test('catnip bought on Sunday sells in the week and spoils after Saturday', async () => {
  const home = { ...newHome(0), coins: 10_000 }
  const bought = buyCatnip(home, 10, SUNDAY, 9, true)
  expect(bought.catnip.qty).toBe(10)
  expect(bought.coins).toBe(10_000 - 10 * buyPrice(SUNDAY))
  expect(buyCatnip(home, 10, SUNDAY + DAY, 10, true).log).toMatch(/Sunday/)
  const sold = sellCatnip(bought, SUNDAY + 3 * DAY, 10, true)
  expect(sold.catnip.qty).toBe(0)
  expect(sold.coins).toBe(bought.coins + 10 * sellPrice(SUNDAY + 3 * DAY, 10))
  expect(weekOf(SUNDAY + 7 * DAY)).toBe(weekOf(SUNDAY) + 1)
  const spoiled = spoil(bought, SUNDAY + 7 * DAY)
  expect(spoiled.catnip.qty).toBe(0)
  expect(spoiled.log).toMatch(/spoiled/)
})

test('seasonal furniture is stocked only in its months', async () => {
  const seasonal = ['beachball', 'sakura', 'jackolantern', 'snowglobe']
  for (let d = 0; d < 365; d += 3) {
    const t = local(2026, 1, 1) + d * DAY
    const month = new Date(t).getMonth() + 1
    for (const item of dailyStock(t)) {
      if (seasonal.includes(item.id)) expect(furniture(item.id)?.months?.includes(month)).toBe(true)
    }
  }
})
