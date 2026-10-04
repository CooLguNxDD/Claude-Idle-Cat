import type { Home } from '../types'
// Ready rewards wait for claim; cats are reserved by every outstanding run.
export const isAway = (home: Home, catId: string, _now?: number): boolean => home.expeditions.runs.some(r => r.cats.includes(catId))
// Household cats not reserved by an outstanding run, including unclaimed returns.
export const catsAtHome = (home: Home) => {
  const away = new Set(home.expeditions.runs.flatMap(r => r.cats))
  return home.cats.filter(c => !away.has(c.id))
}
