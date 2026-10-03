import type { Coat, Genes, Marking, Rarity, Silhouette } from '../../types'
import type { ColorName } from '../theme'
import { BREEDS } from '../content'
import type { Breed } from '../content/types'
import { pick, weighted } from '../rng'
import type { Rng } from '../rng'

export const RARITIES: Record<Rarity, { label: string; odds: number; stars: number; color: ColorName }> = {
  common: { label: 'Common', odds: 60, stars: 1, color: 'subtext1' },
  uncommon: { label: 'Uncommon', odds: 25, stars: 2, color: 'green' },
  rare: { label: 'Rare', odds: 10, stars: 3, color: 'blue' },
  epic: { label: 'Epic', odds: 4, stars: 4, color: 'mauve' },
  legendary: { label: 'Legendary', odds: 1, stars: 5, color: 'yellow' },
}
// Coats come from hooks/content/breeds; an unknown coat (old backup, removed file) paints as FALLBACK_BREED.
export const FALLBACK_BREED: Breed = { id: 'unknown', label: 'Mystery', rarity: 'common', fur: 'peach', dark: 'maroon',
  belly: 'rosewater', pattern: { kind: 'solid' } }
const BY_ID = new Map(BREEDS.map(b => [b.id, b]))
export const breedOf = (coat: Coat): Breed => BY_ID.get(coat) ?? FALLBACK_BREED
export const COAT_REGISTRY: Readonly<Record<Coat, { rarity: Rarity; label: string }>> =
  Object.fromEntries(BREEDS.map(b => [b.id, { rarity: b.rarity, label: b.label }]))
export const COATS: readonly Coat[] = BREEDS.map(b => b.id)
export const MARKINGS: readonly Marking[] = ['classic', 'socks', 'blaze', 'mask', 'spots']
export const SILHOUETTES: readonly Silhouette[] = ['classic', 'fluffy', 'fold']
const odds = Object.fromEntries(Object.entries(RARITIES).map(([key, r]) => [key, r.odds])) as Record<Rarity, number>
export const rarityOf = (genes: Pick<Genes, 'coat'>): Rarity => BY_ID.get(genes.coat)?.rarity ?? 'common'
export const rarityBadge = (genes: Pick<Genes, 'coat'>) => {
  const r = RARITIES[rarityOf(genes)]
  return `${'★'.repeat(r.stars)} ${r.label}`
}
export const rollCoat = (rng: Rng): Coat => {
  const rarity = weighted(rng, odds)
  return pick(rng, COATS.filter(coat => BY_ID.get(coat)?.rarity === rarity))
}
