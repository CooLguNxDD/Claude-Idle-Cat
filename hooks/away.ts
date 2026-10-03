import type { Home } from '../types'
// Ready rewards wait for claim; cats are reserved by every outstanding run.
export const isAway = (home: Home, catId: string, _now?: number): boolean => home.expeditions.runs.some(r => r.cats.includes(catId))
export const catsAtHome = (home: Home) => home.cats.filter(c => !isAway(home, c.id))
