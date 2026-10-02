import type { Coat, Genes, Marking, Rarity, Silhouette } from '../../types'
import type { ColorName } from '../theme'
import { pick, weighted } from '../rng'
import type { Rng } from '../rng'

export const RARITIES: Record<Rarity, { label: string; odds: number; stars: number; color: ColorName }> = {
  common: { label: 'Common', odds: 60, stars: 1, color: 'subtext1' },
  uncommon: { label: 'Uncommon', odds: 25, stars: 2, color: 'green' },
  rare: { label: 'Rare', odds: 10, stars: 3, color: 'blue' },
  epic: { label: 'Epic', odds: 4, stars: 4, color: 'mauve' },
  legendary: { label: 'Legendary', odds: 1, stars: 5, color: 'yellow' },
}
export const COAT_REGISTRY: Record<Coat, { rarity: Rarity; label: string }> = {
  ginger: { rarity: 'common', label: 'Ginger' }, tabby: { rarity: 'common', label: 'Tabby' },
  grey: { rarity: 'common', label: 'Grey' }, black: { rarity: 'common', label: 'Black' },
  white: { rarity: 'common', label: 'White' }, cream: { rarity: 'common', label: 'Cream' },
  calico: { rarity: 'uncommon', label: 'Calico' }, tuxedo: { rarity: 'uncommon', label: 'Tuxedo' },
  siamese: { rarity: 'uncommon', label: 'Siamese' }, chocolate: { rarity: 'uncommon', label: 'Chocolate' },
  cinnamon: { rarity: 'uncommon', label: 'Cinnamon' }, silver: { rarity: 'rare', label: 'Silver' },
  smoke: { rarity: 'rare', label: 'Smoke' }, tortoiseshell: { rarity: 'rare', label: 'Tortoiseshell' },
  ragdoll: { rarity: 'rare', label: 'Ragdoll' }, bengal: { rarity: 'epic', label: 'Bengal' },
  lynx: { rarity: 'epic', label: 'Lynx' }, nebula: { rarity: 'legendary', label: 'Nebula' },
}
export const COATS = Object.keys(COAT_REGISTRY) as Coat[]
export const MARKINGS: readonly Marking[] = ['classic', 'socks', 'blaze', 'mask', 'spots']
export const SILHOUETTES: readonly Silhouette[] = ['classic', 'fluffy', 'fold']
const odds = Object.fromEntries(Object.entries(RARITIES).map(([key, r]) => [key, r.odds])) as Record<Rarity, number>
export const rarityOf = (genes: Pick<Genes, 'coat'>): Rarity => COAT_REGISTRY[genes.coat]?.rarity ?? 'common'
export const rarityBadge = (genes: Pick<Genes, 'coat'>) => {
  const r = RARITIES[rarityOf(genes)]
  return `${'★'.repeat(r.stars)} ${r.label}`
}
export const rollCoat = (rng: Rng): Coat => {
  const rarity = weighted(rng, odds)
  return pick(rng, COATS.filter(coat => COAT_REGISTRY[coat].rarity === rarity))
}
