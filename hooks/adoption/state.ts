import type { BreedOffer, Genes, Home, PendingCat, Shelter } from '../../types'

const EYES = ['green', 'blue', 'yellow', 'odd'] as const
const PERSONALITIES = ['lazy', 'playful', 'greedy', 'shy', 'cuddly', 'curious'] as const
const MARKINGS = ['classic', 'socks', 'blaze', 'mask', 'spots'] as const
const SILHOUETTES = ['classic', 'fluffy', 'fold'] as const

export const emptyShelter = (): Shelter => ({ pulls: 0, last: null, pending: null, offer: null })

export const genesOf = (data: unknown): Genes | null => {
  if (!data || typeof data !== 'object') return null
  const g = data as Genes
  if (typeof g.coat !== 'string' || !g.coat || !EYES.includes(g.eyes) || !PERSONALITIES.includes(g.personality)) return null
  if (typeof g.isShiny !== 'boolean') return null
  const marking = g.marking && MARKINGS.includes(g.marking) ? g.marking : undefined
  const silhouette = g.silhouette && SILHOUETTES.includes(g.silhouette) ? g.silhouette : undefined
  return { coat: g.coat, eyes: g.eyes, personality: g.personality, isShiny: g.isShiny,
    ...(marking ? { marking } : {}), ...(silhouette ? { silhouette } : {}) }
}

const pendingOf = (data: PendingCat | null | undefined, cats: Home['cats']): PendingCat | null => {
  const genes = genesOf(data?.genes)
  if (!data || !genes || cats.some(c => c.id === data.id)) return null
  if (typeof data.id !== 'string' || !data.id || typeof data.name !== 'string' || !data.name) return null
  if (!Number.isFinite(data.bornAt) || !Number.isFinite(data.cost) || data.cost < 0 || !Number.isFinite(data.pulledAt)) return null
  const openedAt = data.openedAt === null || (Number.isFinite(data.openedAt) && data.openedAt >= data.pulledAt) ? data.openedAt : null
  return { id: data.id, name: data.name.slice(0, 20), genes, bornAt: data.bornAt, cost: data.cost, pulledAt: data.pulledAt, openedAt }
}

const offerOf = (data: BreedOffer | null | undefined, cats: Home['cats']): BreedOffer | null => {
  const before = genesOf(data?.before), after = genesOf(data?.after)
  if (!data || !before || !after || !cats.some(c => c.id === data.catId)) return null
  if (!Number.isFinite(data.cost) || data.cost < 0 || !Number.isFinite(data.at)) return null
  return { catId: data.catId, before, after, cost: data.cost, at: data.at }
}

export const normalizeShelter = (data: Shelter | undefined, cats: Home['cats']): Shelter => {
  const pulls = Number.isSafeInteger(data?.pulls) && data!.pulls >= 0 ? data!.pulls : 0
  const last = data?.last
  return { pulls, pending: pendingOf(data?.pending, cats), offer: offerOf(data?.offer, cats),
    last: last && cats.some(c => c.id === last.catId)
    && Number.isFinite(last.at) && last.at >= 0 && Number.isFinite(last.cost) && last.cost >= 0
    ? { catId: last.catId, at: last.at, cost: last.cost } : null }
}
export const revealedCat = (home: Home) => home.cats.find(c => c.id === home.shelter.last?.catId) ?? null
