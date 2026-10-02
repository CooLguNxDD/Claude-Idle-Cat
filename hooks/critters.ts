import type { Home } from '../types'
import { weighted } from './rng'
import type { Rng } from './rng'

export type Critter = {
  id: string; name: string; kind: 'bug' | 'fish' | 'mouse'
  months: readonly number[]; hours: readonly [number, number]; weight: number; value: number
}
const ALL_YEAR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const ANY: [number, number] = [0, 24]
const DAYTIME: [number, number] = [6, 19]
const NIGHT: [number, number] = [19, 6]

// Northern-hemisphere seasons and hours, as in Animal Crossing; cats bring them home unharmed.
export const CRITTERS: readonly Critter[] = [
  { id: 'mouse', name: 'House mouse', kind: 'mouse', months: ALL_YEAR, hours: ANY, weight: 10, value: 15 },
  { id: 'moth', name: 'Moth', kind: 'bug', months: ALL_YEAR, hours: NIGHT, weight: 8, value: 12 },
  { id: 'goldfish', name: 'Goldfish', kind: 'fish', months: ALL_YEAR, hours: ANY, weight: 6, value: 20 },
  { id: 'butterfly', name: 'Butterfly', kind: 'bug', months: [3, 4, 5, 6, 7, 8, 9], hours: DAYTIME, weight: 7, value: 18 },
  { id: 'ladybug', name: 'Ladybug', kind: 'bug', months: [3, 4, 5, 6], hours: DAYTIME, weight: 6, value: 20 },
  { id: 'dragonfly', name: 'Dragonfly', kind: 'bug', months: [5, 6, 7, 8, 9, 10], hours: [8, 18], weight: 5, value: 30 },
  { id: 'firefly', name: 'Firefly', kind: 'bug', months: [6, 7, 8], hours: [19, 4], weight: 5, value: 40 },
  { id: 'cicada', name: 'Cicada', kind: 'bug', months: [7, 8, 9], hours: [8, 17], weight: 5, value: 35 },
  { id: 'beetle', name: 'Rhino beetle', kind: 'bug', months: [6, 7, 8], hours: ANY, weight: 2, value: 90 },
  { id: 'stag', name: 'Stag beetle', kind: 'bug', months: [7, 8], hours: NIGHT, weight: 1, value: 150 },
  { id: 'cricket', name: 'Cricket', kind: 'bug', months: [9, 10, 11], hours: NIGHT, weight: 6, value: 25 },
  { id: 'salmon', name: 'Salmon', kind: 'fish', months: [9, 10, 11], hours: ANY, weight: 3, value: 70 },
  { id: 'koi', name: 'Koi', kind: 'fish', months: ALL_YEAR, hours: DAYTIME, weight: 2, value: 110 },
  { id: 'snowmoth', name: 'Snow moth', kind: 'bug', months: [12, 1, 2], hours: ANY, weight: 5, value: 45 },
  { id: 'smelt', name: 'Ice smelt', kind: 'fish', months: [12, 1, 2], hours: ANY, weight: 4, value: 40 },
  { id: 'goldmouse', name: 'Golden mouse', kind: 'mouse', months: ALL_YEAR, hours: ANY, weight: 0.3, value: 600 },
]
const BY_ID = new Map(CRITTERS.map(c => [c.id, c]))
export const critter = (id: string) => BY_ID.get(id)

const inHours = ([from, to]: readonly [number, number], hour: number) =>
  from <= to ? hour >= from && hour < to : hour >= from || hour < to
export const isAvailable = (c: Critter, month: number, hour: number) => c.months.includes(month) && inHours(c.hours, hour)
export const availableNow = (month: number, hour: number) => CRITTERS.filter(c => isAvailable(c, month, hour))

export const FINDS_PER_HOUR = 0.25

// Each cat may bring a critter home while time passes; the Hunter branch raises the odds.
export const findCritters = (home: Home, minutes: number, month: number, hour: number, rng: Rng, hunt: number[]) => {
  const pool = availableNow(month, hour)
  const weights = Object.fromEntries(pool.map(c => [c.id, c.weight])) as Record<string, number>
  const found: string[] = []
  if (pool.length === 0) return found
  for (const odds of hunt) {
    const n = Math.floor((minutes / 60) * FINDS_PER_HOUR * odds + rng())
    for (let i = 0; i < Math.min(n, 12); i++) found.push(weighted(rng, weights))
  }
  return found
}

export const addToPocket = (home: Home, ids: string[]): Home => {
  const pocket = { ...home.pocket }
  for (const id of ids) pocket[id] = (pocket[id] ?? 0) + 1
  return { ...home, pocket }
}

const take = (home: Home, id: string): Home | null => {
  const left = (home.pocket[id] ?? 0) - 1
  if (left < 0) return null
  const pocket = { ...home.pocket }
  if (left === 0) delete pocket[id]
  else pocket[id] = left
  return { ...home, pocket }
}

export const DONATE_MILES = 50
export const donate = (home: Home, id: string): Home => {
  const c = critter(id)
  if (!c) return home
  if (home.museum.includes(id)) return { ...home, log: `The museum already has a ${c.name}. You can sell this one.` }
  const next = take(home, id)
  if (!next) return { ...home, log: `You have no ${c.name}.` }
  return { ...next, museum: [...home.museum, id], miles: { ...home.miles, total: home.miles.total + DONATE_MILES },
    log: `Donated a ${c.name} to the museum! +${DONATE_MILES} miles` }
}

export const sell = (home: Home, id: string): Home => {
  const c = critter(id)
  const next = c && take(home, id)
  if (!c || !next) return { ...home, log: 'Nothing to sell.' }
  return { ...next, coins: home.coins + c.value, log: `Sold a ${c.name} for ${c.value}c.` }
}
