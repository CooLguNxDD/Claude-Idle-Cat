import type { Home } from '../types'
import { EVENTS } from './content'
import { isContentAvailable } from './content/availability'
import { addBond, bondKey } from './pair'
import { catsAtHome } from './away'
import { GIFTS } from './friends'
import { track } from './collection'
import { localDay } from './time'
import type { Rng } from './rng'

export const activeEvents = (now: number) => EVENTS.filter(e => isContentAvailable(e.available, now) && (!e.weekdays || e.weekdays.includes(new Date(now).getDay())))
export const materialBoost = (now: number) => Math.min(1.5, activeEvents(now).filter(e => e.kind === 'boost').reduce((m, e) => m * (e.materials ?? 1), 1))
export const exchange = (home: Home, a: string, b: string, now: number, rng: Rng): Home => {
  const event = activeEvents(now).find(e => e.kind === 'exchange')
  const day = localDay(now), state = home.exchanges.day === day ? home.exchanges : { day, pairs: [], visitors: [] }
  const lead = catsAtHome(home).find(c => c.id === a), other = catsAtHome(home).find(c => c.id === b)
  const visitor = home.visitors.find(v => v.id === b && v.leavesAt > now), key = bondKey(a, b)
  if (!event || !lead || a === b || (!other && !visitor)) return { ...home, log: 'Gift exchange needs a December friend at home.' }
  if (state.pairs.includes(key) || (visitor && state.visitors.includes(b))) return { ...home, log: 'Already exchanged today.' }
  const gift = GIFTS[Math.floor(rng() * GIFTS.length)]!
  let next = other ? addBond(home, a, b, event.bond ?? 3, now) : { ...home, coins: home.coins + 10 + Math.floor(rng() * 11) }
  next = { ...next, exchanges: { ...state, pairs: [...state.pairs, key], visitors: visitor ? [...state.visitors, b] : state.visitors },
    effect: { kind: 'gift', at: now }, log: `${lead.name} and ${other?.name ?? visitor!.name} exchanged a wrapped ${gift.name}!` }
  return track(next, 'exchange', 1, now)
}
