import { expect, test } from 'claude-code/testing'

import type { Home } from '../types'
import { HOLD_MAX_MS, think, thinkWithEvents } from './brain'
import { BEHAVIORS } from './content'
import { adopt, migrate, newHome } from './game'
import { bondKey, DAILY_BOND_CAP } from './pair'
import { seeded } from './rng'
import { localDay } from './time'

const now = new Date(2026, 0, 2, 9).getTime()
const seconds = (id: string) => BEHAVIORS.find(b => b.id === id)!.seconds * 1000
const tuned = (home: Home, stats: { hunger?: number; joy?: number; energy?: number }) =>
  ({ ...home, cats: home.cats.map(c => ({ ...c, hunger: 80, joy: 80, energy: 80, isAsleep: false, ...stats })) })

test('a hungry cat eats one portion, then an empty bowl only gets a meow', () => {
  const home = tuned({ ...newHome(now), bowl: { food: 3 } }, { hunger: 20 })
  const planned = think(home, now, seeded(1))
  expect(planned.cats[0]!.intent?.id).toBe('eat-bowl')
  const eaten = think(planned, now + seconds('eat-bowl'), seeded(1))
  expect(eaten.cats[0]!.hunger).toBe(50)
  expect(eaten.bowl.food).toBe(2)
  expect(eaten.cats[0]!.intent).toBeUndefined()
  expect(eaten.cats[0]!.xp).toBe(2)
  const empty = think(tuned({ ...home, bowl: { food: 0 } }, { hunger: 20 }), now, seeded(1))
  expect(empty.cats[0]!.intent).toBeUndefined()
  expect(empty.log).toMatch(/meows at the empty bowl/)
  expect(empty.bowl.food).toBe(0)
})

test('eating uses the placed bowl portion and its bonuses', () => {
  const basic = tuned({ ...newHome(now), bowl: { food: 3 } }, { hunger: 20, joy: 40 })
  const eaten = think(think(basic, now, seeded(1)), now + seconds('eat-bowl'), seeded(1))
  expect(eaten.cats[0]!.hunger).toBe(50)
  expect(eaten.cats[0]!.joy).toBe(40)
  const golden = tuned({ ...newHome(now), decor: { ...newHome(now).decor, bowl: 'goldbowl' }, bowl: { food: 3 } }, { hunger: 20, joy: 40 })
  const fed = think(think(golden, now, seeded(1)), now + seconds('eat-bowl'), seeded(1))
  expect(fed.cats[0]!.hunger).toBe(60)
  expect(fed.cats[0]!.joy).toBe(45)
  expect(fed.cats[0]!.xp).toBe(3)
  expect(fed.log).toMatch(/munches from the Golden bowl\. \+3xp/)
})

test('a tired cat goes to sleep and a second cat at home earns a capped bond', () => {
  const tired = think(tuned(newHome(now), { energy: 10, joy: 90 }), now, seeded(1))
  expect(tired.cats[0]!.intent?.id).toBe('nap-bed')
  expect(think(tired, now + seconds('nap-bed'), seeded(1)).cats[0]!.isAsleep).toBe(true)
  const pair = tuned(adopt({ ...newHome(now), coins: 1000 }, now, seeded(1)), { joy: 40 })
  const started = think({ ...pair, bowl: { food: 0 } }, now, seeded(3))
  const actor = started.cats.find(c => c.intent?.id === 'play-buddy')!
  expect(actor.intent?.with).toBeTruthy()
  const done = think(started, now + seconds('play-buddy'), seeded(3))
  const key = bondKey(actor.id, actor.intent!.with!)
  expect(done.bonds[key]!.points).toBeGreaterThan(0)
  const capped = think({ ...started, bonds: { [key]: { points: DAILY_BOND_CAP, day: localDay(now), today: DAILY_BOND_CAP } } }, now + seconds('play-buddy'), seeded(3))
  expect(capped.bonds[key]!.points).toBe(DAILY_BOND_CAP)
})

test('thinkWithEvents emits plan, done and an empty bowl', () => {
  const hungry = tuned({ ...newHome(now), bowl: { food: 3 } }, { hunger: 20 })
  const planned = thinkWithEvents(hungry, now, seeded(1))
  expect(planned.events).toContainEqual({ on: 'plan', catId: hungry.cats[0]!.id, about: ['eat-bowl'] })
  const eaten = thinkWithEvents(planned.home, now + seconds('eat-bowl'), seeded(1))
  expect(eaten.events.some(e => e.on === 'done' && e.about?.[0] === 'eat-bowl')).toBe(true)
  const empty = thinkWithEvents(tuned({ ...hungry, bowl: { food: 0 } }, { hunger: 20 }), now, seeded(1))
  expect(empty.events.some(e => e.on === 'bowl.empty')).toBe(true)
})

test('a held intent waits for the cat on screen, but only up to the cap', () => {
  const planned = think(tuned({ ...newHome(now), bowl: { food: 3 } }, { hunger: 20 }), now, seeded(1))
  const due = now + seconds('eat-bowl')
  const held = think(planned, due, seeded(1), () => true)
  expect(held.cats[0]!.intent?.id).toBe('eat-bowl')
  expect(held.bowl.food).toBe(3)
  expect(think(planned, due + HOLD_MAX_MS, seeded(1), () => true).bowl.food).toBe(2)
  expect(think(planned, due, seeded(1), () => false).bowl.food).toBe(2)
})

test('away cats are skipped and migrate drops an unknown intent', () => {
  const home = tuned({ ...newHome(now), bowl: { food: 5 } }, { hunger: 10 })
  const cat = { ...home.cats[0]!, intent: { id: 'eat-bowl', at: now - 60_000 } }
  const away = { ...home, cats: [cat], expeditions: { ...home.expeditions, runs: [{ id: 'r', exp: 'garden-patrol', cats: [cat.id], gear: [], startAt: now, endsAt: now + 60_000, seed: 1, loot: { coins: 0, materials: {}, critters: [] }, xp: 0, bond: 0 }] } }
  const skipped = think(away, now, seeded(1))
  expect(skipped.cats[0]).toEqual(cat)
  expect(skipped.bowl.food).toBe(5)
  const saved = { ...newHome(now), cats: [{ ...newHome(now).cats[0]!, intent: { id: 'not-a-behavior', at: 1 } }] }
  expect(migrate(saved, now).cats[0]!.intent).toBeUndefined()
})
