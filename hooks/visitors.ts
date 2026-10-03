import type { Home, Personality, Visitor } from '../types'
import { track } from './collection'
import { PERSONALITIES, rollGenes } from './genes'
import { baitOf, homeMods } from './home'
import { pick, weighted } from './rng'
import type { Rng } from './rng'

const HOUR = 3_600_000
const BASE_PER_HOUR = 0.12
const STRAYS = ['Smokey', 'Patches', 'Whiskers', 'Professor', 'Captain', 'Noodle', 'Pickles', 'Marbles', 'Biscotti',
  'Sir Fluff', 'Clementine', 'Oreo', 'Jellybean', 'Pumpkin', 'Domino', 'Toast', 'Momo', 'Peaches']

// The yard fits a few strays, however big the house gets.
export const maxVisitors = (home: Home) => 1 + Math.min(home.tier, 3)
export const arrivalsPerHour = (home: Home) => BASE_PER_HOUR * (1 + baitOf(home).total / 8)

const giftFor = (home: Home, personality: Personality, rng: Rng) =>
  Math.round((10 + 10 * rng()) * (1 + home.tier) * homeMods(home).gift * (personality === 'shy' ? 1.5 : 1))

// Strays come and go with real time: gifts are paid as they leave.
export const stepVisitors = (home: Home, now: number, minutes: number, rng: Rng): Home => {
  let next = home
  const leaving = home.visitors.filter(v => v.leavesAt <= now)
  if (leaving.length > 0) {
    const gifts = leaving.reduce((sum, v) => sum + v.gift, 0)
    const names = leaving.map(v => v.name).join(' and ')
    next = { ...next, coins: next.coins + gifts, visitors: home.visitors.filter(v => v.leavesAt > now),
      log: `${names} left a gift: +${gifts}c`, effect: { kind: 'coins', at: now } }
  }

  const expected = (minutes / 60) * arrivalsPerHour(home)
  let arrivals = Math.floor(expected + rng())
  const { likes } = baitOf(home)
  const weights = Object.fromEntries(PERSONALITIES.map(p => [p, 1 + (likes[p] ?? 0)])) as Record<Personality, number>
  let missed = 0
  while (arrivals-- > 0) {
    const genes = { ...rollGenes(rng), personality: weighted(rng, weights) }
    const gift = giftFor(home, genes.personality, rng)
    // Long absences: extra strays visited and left already, paying their gift.
    if (next.visitors.length >= maxVisitors(home)) {
      missed += gift
      continue
    }
    const taken = new Set([...next.visitors.map(v => v.name), ...next.cats.map(c => c.name)])
    const free = STRAYS.filter(n => !taken.has(n))
    const visitor: Visitor = {
      id: `v${next.nextId}`, name: pick(rng, free.length ? free : STRAYS), genes,
      arrivedAt: now, leavesAt: now + (2 + 4 * rng()) * HOUR, gift,
    }
    next = track({ ...next, nextId: next.nextId + 1, visitors: [...next.visitors, visitor], effect: { kind: 'visitor', at: now },
      log: `${visitor.name} the ${genes.coat} cat wandered into the yard!${genes.isShiny ? ' ✨' : ''}` }, 'visitor', 1, now)
  }
  if (missed > 0) next = { ...next, coins: next.coins + missed, log: `Strays visited while you were away: +${missed}c` }
  return next
}
