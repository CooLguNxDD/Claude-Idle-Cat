import { expect, test } from 'claude-code/testing'

import type { Home } from '../types'
import { activeCat, adoptVisitor, coinRate, newHome, tick } from './game'
import { CATALOG, STOCK_SIZE, TIERS, buyFurniture, dailyStock, homeMods, maxCats, payLoan, place, takeLoan } from './home'
import { seeded } from './rng'
import { arrivalsPerHour, maxVisitors, stepVisitors } from './visitors'

const DAY = 86_400_000
// Local-clock times, so day boundaries match the game's local midnight.
const local = (day: number, hour = 9) => new Date(2026, 0, 1 + day, hour).getTime()
const HOUR = 3_600_000
const rich = (home: Home): Home => ({ ...home, coins: 100_000 })

test('the catalog is consistent', async () => {
  const ids = new Set(CATALOG.map(f => f.id))
  expect(ids.size).toBe(CATALOG.length)
  const slots = new Set(TIERS.flatMap(t => t.slots))
  for (const item of CATALOG) expect(slots.has(item.slot)).toBe(true)
})

test('the daily stock is stable within a day and changes across days', async () => {
  const today = dailyStock(local(10, 1)).map(f => f.id)
  expect(today.length).toBe(STOCK_SIZE)
  expect(dailyStock(local(10, 23)).map(f => f.id)).toEqual(today)
  const week = new Set(Array.from({ length: 7 }, (_, d) => dailyStock(local(10 + d)).map(f => f.id).join()))
  expect(week.size).toBeGreaterThan(1)
})

test('buying needs an open shop, stock and coins, then places the item', async () => {
  const now = 10 * DAY
  const item = dailyStock(now)[0]!
  expect(buyFurniture(rich(newHome(0)), item.id, now, 23).log).toMatch(/closed/)
  expect(buyFurniture(newHome(0), item.id, now, 12).log).toMatch(/costs/)
  const notStocked = CATALOG.find(f => f.price > 0 && !dailyStock(now).includes(f))!
  expect(buyFurniture(rich(newHome(0)), notStocked.id, now, 12).log).toMatch(/stock/)
  const bought = buyFurniture(rich(newHome(0)), item.id, now, 12)
  expect(bought.owned).toContain(item.id)
  if (TIERS[0]!.slots.includes(item.slot)) expect(bought.decor[item.slot]).toBe(item.id)
})

test('decor changes the rules', async () => {
  const home = { ...newHome(0), owned: [...newHome(0).owned, 'laser'] }
  const withLaser = place(home, 'laser')
  expect(homeMods(withLaser).coin).toBe(1.5)
  expect(coinRate(withLaser)).toBeGreaterThan(coinRate(home))
  expect(place(home, 'quilt').log).toMatch(/own/)
  expect(place({ ...home, owned: [...home.owned, 'quilt'] }, 'quilt').log).toMatch(/no rug spot/)
})

test('Tom Mew expands the house and income pays the loan back to exactly zero', async () => {
  const loaned = takeLoan(newHome(0))
  expect(loaned.tier).toBe(1)
  expect(maxCats(loaned)).toBe(3)
  expect(loaned.loan).toBe(TIERS[1]!.loan)
  expect(takeLoan(loaned).log).toMatch(/Pay off/)
  const later = tick({ ...loaned, cats: loaned.cats.map(c => ({ ...c, level: 30 })) }, 8 * HOUR, () => 0)
  expect(later.loan).toBeLessThan(loaned.loan)
  let paid = later
  for (let i = 0; i < 50; i++) paid = tick({ ...paid, lastTick: 0 }, 8 * HOUR, () => 0)
  expect(paid.loan).toBe(0)
  expect(payLoan(paid, 100).log).toMatch(/No loan/)
  expect(payLoan({ ...rich(loaned) }, 100).loan).toBe(TIERS[1]!.loan - 100)
})

test('decor pulls more strays, who stay, leave gifts and can be adopted', async () => {
  const bare = { ...newHome(0), decor: {} }
  expect(arrivalsPerHour(newHome(0))).toBeGreaterThan(arrivalsPerHour(bare))
  const rng = seeded(11)
  let home = stepVisitors(newHome(0), 0, 60 * 24, rng)
  expect(home.visitors.length).toBe(maxVisitors(home))
  expect(home.coins).toBeGreaterThan(newHome(0).coins)
  const visitor = home.visitors[0]!
  const adopted = adoptVisitor(home, visitor.id, 1)
  expect(adopted.cats.length).toBe(2)
  expect(activeCat(adopted).genes).toEqual(visitor.genes)
  expect(adopted.visitors.find(v => v.id === visitor.id)).toBeUndefined()
  expect(adoptVisitor({ ...adopted, visitors: [visitor] }, visitor.id, 2).log).toMatch(/full/)
  home = stepVisitors(home, visitor.leavesAt + 1, 0, () => 0.99)
  expect(home.visitors.find(v => v.id === visitor.id)).toBeUndefined()
  expect(home.log).toMatch(/gift/)
})
