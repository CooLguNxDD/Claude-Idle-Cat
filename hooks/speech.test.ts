import { expect, test } from 'claude-code/testing'
import type { Cat, Home } from '../types'
import { thinkWithEvents } from './brain'
import { fillBowl } from './bowl'
import { act, giveGift, newCat, newHome } from './game'
import { GIFTS } from './friends'
import { eventsOf, quoteOf, speak } from './speech'
import { seeded } from './rng'
import { localDay } from './time'

const now = new Date(2026, 0, 2, 12).getTime()
const cat = (personality: Cat['genes']['personality'], extra: Partial<Cat> = {}): Cat =>
  ({ ...newCat('c1', 'Mochi', { coat: 'grey', eyes: 'green', personality, isShiny: false }, now), ...extra })
const home = (personality: Cat['genes']['personality'] = 'playful', extra: Partial<Home> = {}, catExtra: Partial<Cat> = {}): Home =>
  ({ ...newHome(now), ...extra, cats: [cat(personality, catExtra)] })

test('speak filters trigger, about, personality, mood, bond and hours', () => {
  const eat = speak(home(), { on: 'plan', catId: 'c1', about: ['eat-bowl'] }, now, 12, seeded(1), [])
  expect(eat?.text).toMatch(/bowl|kibble|eat/i)
  expect(eat?.priority).toBe(2)
  const nap = speak(home(), { on: 'plan', catId: 'c1', about: ['nap-bed'] }, now, 12, seeded(1), [])
  expect(nap?.text).toMatch(/bed|nap|pillow|horizontal/i)
  const lines = (n: number, run: (i: number) => string | undefined) => Array.from({ length: n }, (_, i) => run(i) ?? '')
  expect(lines(12, i => speak(home('greedy'), { on: 'done', catId: 'c1', about: ['eat-bowl'] }, now, 12, seeded(i), [])?.text).some(t => /more|portion|seconds|finished/i.test(t))).toBe(true)
  expect(lines(12, i => speak(home('playful', {}, { hunger: 10 }), { on: 'idle', catId: 'c1' }, now, 12, seeded(i), [])?.text).some(t => /bowl|hmph|fine|feed/i.test(t))).toBe(true)
  expect(lines(12, i => speak(home(), { on: 'idle', catId: 'c1' }, now, 23, seeded(i), [])?.text).some(t => /quiet|night|stars|bugs/i.test(t))).toBe(true)
  expect(lines(12, i => speak(home(), { on: 'idle', catId: 'c1' }, now, 12, seeded(i), [])?.text).every(t => !/house is finally quiet/.test(t))).toBe(true)
  expect(lines(8, i => speak(home(), { on: 'pair.end', catId: 'c1', role: 'lead', buddyId: 'c2' }, now, 12, seeded(i), [])?.text).every(t => !/Stay close/.test(t))).toBe(true)
  const closeHome = { ...home(), cats: [cat('playful'), cat('lazy', { id: 'c2', name: 'Nori' })], bonds: { 'c1|c2': { points: 80, day: localDay(now), today: 0 } } }
  expect(lines(12, i => speak(closeHome, { on: 'pair.end', catId: 'c1', role: 'lead', buddyId: 'c2', vars: { buddy: 'Nori' } }, now, 12, seeded(i), [])?.text).some(t => /Stay close|Best nap|again|like you/.test(t))).toBe(true)
})

test('speak skips recent lines and lines with an unfilled token', () => {
  const recent = ['Purr engine: online.', 'Again. Right there.', 'Chin scratch detected.', 'I will allow this.', 'That was the good spot.']
  const said = speak(home(), { on: 'pet', catId: 'c1' }, now, 12, seeded(1), recent)
  expect(said?.text).toBe('Okay. More. Briefly.')
  const blocked = ['{food} portions. Noted.', 'The bowl has a future.', 'Fish sound. I heard that.', 'Refill accepted. Grudgingly.', 'More food. Correct choice.', 'Bowl status: less tragic.']
  expect(speak(home(), { on: 'fill', catId: 'c1' }, now, 12, seeded(1), blocked.slice(1))).toBeNull()
  const filled = speak(home(), { on: 'fill', catId: 'c1', vars: { food: '4' } }, now, 12, seeded(9), blocked.slice(1))
  expect(filled?.text).toBe('4 portions. Noted.')
  expect(filled?.until).toBeGreaterThanOrEqual(now + 4_000)
  expect(filled?.until).toBeLessThanOrEqual(now + 9_000)
  expect(speak(home(), { on: 'pet', catId: 'c1' }, now, 12, seeded(1), [])?.priority).toBe(3)
})

test('eventsOf notices care, gifts, waking and strays', () => {
  const before = home('greedy')
  expect(eventsOf(before, act(before, 'pet', now), now)[0]?.on).toBe('pet')
  expect(eventsOf(before, act(before, 'play', now), now)[0]?.on).toBe('play')
  const filled = fillBowl({ ...before, coins: 100 }, 2, now)
  expect(eventsOf(before, filled, now)[0]).toMatchObject({ on: 'fill', vars: { food: '5' } })
  const gifted = giveGift({ ...before, coins: 100 }, 'tuna', now)
  expect(eventsOf(before, gifted, now)[0]?.on).toBe('gift.loved')
  const plain = giveGift({ ...home('lazy'), coins: 100 }, 'tuna', now)
  expect(eventsOf(home('lazy'), plain, now)[0]?.on).toBe('gift')
  const up = { ...before, effect: { kind: 'levelup' as const, at: now } }
  expect(eventsOf(before, up, now)[0]?.on).toBe('levelup')
  const asleep = home('lazy', {}, { isAsleep: true })
  expect(eventsOf(asleep, { ...asleep, cats: [{ ...asleep.cats[0]!, isAsleep: false }] }, now).some(e => e.on === 'wake')).toBe(true)
  const stray = { ...before, visitors: [{ id: 'v1', name: 'Pip', genes: before.cats[0]!.genes, arrivedAt: now, leavesAt: now + 1, gift: 1 }] }
  expect(eventsOf(before, stray, now).some(e => e.on === 'stray')).toBe(true)
  expect(GIFTS.length).toBeGreaterThan(0)
})

test('quoteOf changes across the hour on a gift day and stays put within it', () => {
  const gifted = home('lazy', {}, { lastGift: { id: 'pillow', day: localDay(now) } })
  const hour = quoteOf(gifted, null, now, 15).text
  expect(quoteOf(gifted, null, now + 1000, 15).text).toBe(hour)
  const lines = new Set(Array.from({ length: 24 }, (_, h) => quoteOf(gifted, null, now, h).text))
  expect(lines.size).toBeGreaterThan(1)
  expect([...lines].every(line => line === 'Oh, a tiny pillow. Thanks.')).toBe(false)
  const fresh = speak(gifted, { on: 'pet', catId: 'c1' }, now, 15, seeded(1), [])!
  expect(quoteOf(gifted, fresh, now, 3).text).toBe(fresh.text)
})
