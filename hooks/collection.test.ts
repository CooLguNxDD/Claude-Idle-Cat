import { EXPEDITIONS } from './content'
import { expect, test } from 'claude-code/testing'

import type { Home } from '../types'
import { ACHIEVEMENTS, MILES_SHOP, TASKS_PER_DAY, buyWithMiles, record, settle, tasksFor, track } from './collection'
import { CRITTERS, addToPocket, availableNow, critter, findCritters, isAvailable, sell } from './critters'
import { act, adopt, donateCritter, migrate, newHome } from './game'
import { furniture } from './home'
import { seeded } from './rng'

const DAY = 86_400_000
const rich = (home: Home): Home => ({ ...home, coins: 100_000, miles: { ...home.miles, total: 100_000 } })

test('critters follow the month and the hour', async () => {
  expect(isAvailable(critter('firefly')!, 7, 22)).toBe(true)
  expect(isAvailable(critter('firefly')!, 7, 12)).toBe(false)
  expect(isAvailable(critter('firefly')!, 1, 22)).toBe(false)
  expect(isAvailable(critter('moth')!, 3, 2)).toBe(true)
  expect(availableNow(1, 12).map(c => c.id)).toContain('snowmoth')
  expect(availableNow(1, 12).map(c => c.id)).not.toContain('cicada')
  for (let m = 1; m <= 12; m++) expect(availableNow(m, 12).length).toBeGreaterThan(0)
})

test('cats find more with better hunting odds', async () => {
  const home = newHome(0)
  const plain = findCritters(home, 60 * 24, 7, 22, seeded(1), [1]).length
  const keen = findCritters(home, 60 * 24, 7, 22, seeded(1), [3]).length
  expect(keen).toBeGreaterThan(plain)
})

test('donating fills the museum once per kind; extras can be sold', async () => {
  const home = addToPocket(newHome(0), ['moth', 'moth'])
  const one = donateCritter(home, 'moth', DAY)
  expect(one.museum).toEqual(['moth'])
  expect(one.pocket.moth).toBe(1)
  expect(one.miles.total).toBeGreaterThan(0)
  expect(donateCritter(one, 'moth', DAY).log).toMatch(/already/)
  const sold = sell(one, 'moth')
  expect(sold.coins).toBe(one.coins + critter('moth')!.value)
  expect(sold.pocket.moth).toBeUndefined()
  expect(sell(sold, 'moth').log).toMatch(/Nothing/)
})

test('daily tasks are stable per day, count actions and pay once', async () => {
  const tasks = tasksFor(5 * DAY)
  expect(tasks.length).toBe(TASKS_PER_DAY)
  expect(tasksFor(5 * DAY + 3_600_000)).toEqual(tasks)
  const task = tasks[0]!
  let home = newHome(0)
  for (let i = 0; i < task.goal; i++) home = track(home, task.counter, 1, 5 * DAY)
  expect(home.miles.done).toContain(task.id)
  const paid = home.miles.total
  home = track(home, task.counter, 1, 5 * DAY)
  expect(home.miles.done.filter(id => id === task.id).length).toBe(1)
  expect(home.miles.total).toBeGreaterThanOrEqual(paid)
  expect(track(home, task.counter, 1, 6 * DAY).miles.counts[task.counter]).toBe(1)
})

test('petting counts toward a pet task when it succeeds', async () => {
  const day = Array.from({ length: 60 }, (_, d) => d * DAY).find(t => tasksFor(t).some(x => x.id === 'pet3'))!
  let home = newHome(0)
  for (let i = 0; i < 3; i++) home = act(home, 'pet', day)
  expect(home.miles.done).toContain('pet3')
})

test('the book records what was seen and achievements pay once', async () => {
  const two = settle(adopt(rich(newHome(0)), 1, seeded(9)), 1)
  expect(two.book.coats.length).toBeGreaterThan(0)
  expect('family' in two.achievements).toBe(true)
  const total = two.miles.total
  expect(settle(two, 2).miles.total).toBe(total)
  expect(record(two)).toBe(two)
  expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length)
})

test('the miles shop sells furniture and a shiny charm', async () => {
  const home = rich(newHome(0))
  const bowl = buyWithMiles(home, 'goldbowl')
  expect(bowl.owned).toContain('goldbowl')
  expect(bowl.decor.bowl).toBe('goldbowl')
  expect(buyWithMiles(newHome(0), 'goldbowl').log).toMatch(/costs/)
  const charmed = buyWithMiles(home, 'charm')
  expect(charmed.shinyCharm).toBe(true)
  const adopted = adopt(charmed, 1, seeded(2))
  expect(adopted.cats[1]?.genes.isShiny).toBe(true)
  expect(adopted.shinyCharm).toBe(false)
  for (const item of MILES_SHOP) if (item.id !== 'charm') expect(furniture(item.id)?.miles).toBe(item.cost)
})

test('v3 saves without collection fields still load', async () => {
  const { book, miles, pocket, museum, achievements, shinyCharm, ...old } = newHome(0)
  const loaded = migrate(old, 1)
  expect(loaded.museum).toEqual([])
  expect(loaded.miles.total).toBe(0)
  expect(CRITTERS.length).toBe(16)
})

test('expedition achievements honor thresholds, seasonal exclusions and single payment', () => {
  const h = newHome(0), explorer = ACHIEVEMENTS.find(a => a.id === 'explorer')!, cartographer = ACHIEVEMENTS.find(a => a.id === 'cartographer')!, gourd = ACHIEVEMENTS.find(a => a.id === 'gourd-guardian')!
  const progress = (done: Record<string, number>) => ({ ...h, expeditions: { ...h.expeditions, done } })
  expect(explorer.test(progress({ 'garden-patrol': 9 }))).toBe(false)
  expect(explorer.test(progress({ 'garden-patrol': 10 }))).toBe(true)
  const every = Object.fromEntries(EXPEDITIONS.filter(e => !e.available).map(e => [e.id, 1]))
  expect(cartographer.test(progress(every))).toBe(true)
  expect(cartographer.test(progress({ ...every, riverbank: 0 }))).toBe(false)
  expect(gourd.test(progress({ 'material:pumpkin': 19 }))).toBe(false)
  const awarded = settle(progress({ ...every, 'garden-patrol': 10, 'material:pumpkin': 20 }), 1)
  expect(awarded.achievements).toHaveProperty('explorer'); expect(awarded.achievements).toHaveProperty('cartographer'); expect(awarded.achievements).toHaveProperty('gourd-guardian')
  expect(settle(awarded, 2).miles.total).toBe(awarded.miles.total)
})
