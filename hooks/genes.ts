import type { Eyes, Genes, Personality } from '../types'
import { MARKINGS, RARITIES, SILHOUETTES, rarityOf, rollCoat } from './adoption/registry'
import { pick, weighted } from './rng'
import type { Rng } from './rng'
export { coatPixel, furColor } from './genes/paint'

export const SHINY_ODDS = 1 / 64

const EYE_WEIGHTS: Record<Eyes, number> = { green: 35, yellow: 35, blue: 25, odd: 5 }
export const PERSONALITIES: readonly Personality[] = ['lazy', 'playful', 'greedy', 'shy', 'cuddly', 'curious']

export const PERSONALITY_INFO: Record<Personality, string> = {
  lazy: 'loses energy slowly', playful: 'loves Play (+50% joy)', greedy: '+20% coins',
  shy: 'finds better gifts', cuddly: 'Pet gives double joy', curious: 'more AFK events',
}

export const GINGER: Genes = { coat: 'ginger', eyes: 'green', personality: 'playful', isShiny: false }

export const rollGenes = (rng: Rng, now: number): Genes => ({
  coat: rollCoat(rng, now),
  eyes: weighted(rng, EYE_WEIGHTS),
  personality: pick(rng, PERSONALITIES),
  isShiny: rng() < SHINY_ODDS,
  marking: pick(rng, MARKINGS),
  silhouette: pick(rng, SILHOUETTES),
})

export const describeGenes = (g: Genes) => [
  `${g.isShiny ? '✨shiny ' : ''}${RARITIES[rarityOf(g)].label} ${g.coat}`,
  g.eyes === 'odd' ? 'odd-eyed' : `${g.eyes} eyes`, g.personality,
  g.marking && g.marking !== 'classic' ? g.marking : '',
  g.silhouette && g.silhouette !== 'classic' ? g.silhouette : '',
].filter(Boolean).join(', ')
