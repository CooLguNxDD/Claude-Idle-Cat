import type { Home, Personality, Visitor } from '../types'
import { track } from './collection'
import { PERSONALITIES, rollGenes } from './genes'
import { baitOf, homeMods } from './home'
import { NAMED_CATS } from './content'
import type { NamedCat } from './content/types'
import { isContentAvailable } from './content/availability'
import { breedOf } from './adoption/registry'
import { pick, seeded, weighted } from './rng'
import { worldOf } from './world'
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

// A named cat may take a stray's place; its roll is seeded by the visit, so plain strays draw the same numbers as before.
const namedVisitor = (home: Home, now: number, taken: ReadonlySet<string>): NamedCat | null => {
  const world = worldOf(home).id
  const roll = seeded(home.nextId * 7919 + Math.floor(now / HOUR))
  for (const cat of NAMED_CATS) {
    if (!isContentAvailable(cat.appears.available, now) || !isContentAvailable(breedOf(cat.genes.coat).available, now)) continue
    if (taken.has(cat.name) || (cat.appears.worlds && !cat.appears.worlds.includes(world))) continue
    if (roll() < cat.appears.odds) return cat
  }
  return null
}

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
    const genes = { ...rollGenes(rng, now), personality: weighted(rng, weights) }
    const gift = giftFor(home, genes.personality, rng)
    // Long absences: extra strays visited and left already, paying their gift.
    if (next.visitors.length >= maxVisitors(home)) {
      missed += gift
      continue
    }
    const taken = new Set([...next.visitors.map(v => v.name), ...next.cats.map(c => c.name)])
    const free = STRAYS.filter(n => !taken.has(n))
    const named = namedVisitor(next, now, taken)
    const visitor: Visitor = {
      id: `v${next.nextId}`, name: pick(rng, free.length ? free : STRAYS), genes,
      arrivedAt: now, leavesAt: now + (2 + 4 * rng()) * HOUR, gift,
      ...(named ? { name: named.name, genes: { ...genes, marking: 'classic', silhouette: 'classic', ...named.genes, isShiny: false } } : {}),
    }
    const log = named ? `${named.name} wandered into the yard! "${named.catchphrase}"`
      : `${visitor.name} the ${genes.coat} cat wandered into the yard!${genes.isShiny ? ' ✨' : ''}`
    next = track({ ...next, nextId: next.nextId + 1, visitors: [...next.visitors, visitor], effect: { kind: 'visitor', at: now },
      log }, 'visitor', 1, now)
  }
  if (missed > 0) next = { ...next, coins: next.coins + missed, log: `Strays visited while you were away: +${missed}c` }
  return next
}
