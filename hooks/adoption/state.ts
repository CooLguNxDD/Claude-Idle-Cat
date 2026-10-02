import type { Home, Shelter } from '../../types'

export const emptyShelter = (): Shelter => ({ pulls: 0, last: null })
export const normalizeShelter = (data: Shelter | undefined, cats: Home['cats']): Shelter => {
  const pulls = Number.isSafeInteger(data?.pulls) && data!.pulls >= 0 ? data!.pulls : 0
  const last = data?.last
  return { pulls, last: last && cats.some(c => c.id === last.catId)
    && Number.isFinite(last.at) && last.at >= 0 && Number.isFinite(last.cost) && last.cost >= 0
    ? { catId: last.catId, at: last.at, cost: last.cost } : null }
}
export const revealedCat = (home: Home) => home.cats.find(c => c.id === home.shelter.last?.catId) ?? null
