import type { Home } from '../types'
import { EVENTS } from './content'
import { isContentAvailable } from './content/availability'
import { addBond, bondKey } from './pair'
import { catsAtHome } from './away'
import { GIFTS } from './friends'
import { track } from './collection'
import { localDay } from './time'
import type { Rng } from './rng'

// Events active in the local calendar month and optional weekday window.
export const activeEvents = (now: number) => EVENTS.filter(e => isContentAvailable(e.available, now) && (!e.weekdays || e.weekdays.includes(new Date(now).getDay())))
// Combine active material boosts, capped at 1.5; expeditions freeze this at departure.
export const materialBoost = (now: number) => Math.min(1.5, activeEvents(now).filter(e => e.kind === 'boost').reduce((m, e) => m * (e.materials ?? 1), 1))
// One gift per household pair or current visitor per local day during an exchange event.
export const exchange = (home: Home, a: string, b: string, now: number, rng: Rng): Home => {
  const event = activeEvents(now).find(e => e.kind === 'exchange')
  const day = localDay(now), state = home.exchanges.day === day ? home.exchanges : { day, pairs: [], visitors: [] }
  const lead = catsAtHome(home).find(c => c.id === a), other = catsAtHome(home).find(c => c.id === b)
  const visitor = home.visitors.find(v => v.id === b && v.leavesAt > now), key = bondKey(a, b)
  if (!event) return { ...home, log: 'No gift exchange event is active.' }
  if (!lead || a === b || (!other && !visitor)) return { ...home, log: 'Gift exchange needs a cat at home and a household friend or current visitor.' }
  if (state.pairs.includes(key) || (visitor && state.visitors.includes(b))) return { ...home, log: 'Already exchanged today.' }
  const gift = GIFTS[Math.floor(rng() * GIFTS.length)]!
  let next = other ? addBond(home, a, b, event.bond ?? 3, now) : { ...home, coins: home.coins + 10 + Math.floor(rng() * 11) }
  const gained = (next.bonds[key]?.points ?? 0) - (home.bonds[key]?.points ?? 0)
  const bondLine = other ? gained ? ` +${gained} bond.` : ' Daily bond cap reached.' : ''
  next = { ...next, exchanges: { ...state, pairs: [...state.pairs, key], visitors: visitor ? [...state.visitors, b] : state.visitors },
    effect: { kind: 'gift', at: now }, log: `${lead.name} and ${other?.name ?? visitor!.name} exchanged a wrapped ${gift.name}!${bondLine}` }
  return track(next, 'exchange', 1, now)
}
