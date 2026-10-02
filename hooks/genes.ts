import type { Coat, Eyes, Genes, Personality } from '../types'
import { pick, weighted } from './rng'
import type { Rng } from './rng'
import { inkOf, mix } from './theme'
import type { Flavor } from './theme'

export const SHINY_ODDS = 1 / 64

const COAT_WEIGHTS: Record<Coat, number> = {
  ginger: 14, tabby: 16, grey: 12, black: 12, white: 10, cream: 9, calico: 9, tuxedo: 10, siamese: 8,
}
const EYE_WEIGHTS: Record<Eyes, number> = { green: 35, yellow: 35, blue: 25, odd: 5 }
export const PERSONALITIES: readonly Personality[] = ['lazy', 'playful', 'greedy', 'shy', 'cuddly', 'curious']

export const PERSONALITY_INFO: Record<Personality, string> = {
  lazy: 'loses energy slowly', playful: 'loves Play (+50% joy)', greedy: '+20% coins',
  shy: 'finds better gifts', cuddly: 'Pet gives double joy', curious: 'more AFK events',
}

export const GINGER: Genes = { coat: 'ginger', eyes: 'green', personality: 'playful', isShiny: false }

export const rollGenes = (rng: Rng): Genes => ({
  coat: weighted(rng, COAT_WEIGHTS),
  eyes: weighted(rng, EYE_WEIGHTS),
  personality: pick(rng, PERSONALITIES),
  isShiny: rng() < SHINY_ODDS,
})

export const describeGenes = (g: Genes) =>
  `${g.isShiny ? '✨shiny ' : ''}${g.coat}, ${g.eyes === 'odd' ? 'odd-eyed' : `${g.eyes} eyes`}, ${g.personality}`

type Fur = { fur: number; dark: number; belly: number }

const furOf = (coat: Coat, f: Flavor): Fur => {
  const light = f.isLight ? f.surface0 : f.text
  const ink = inkOf(f)
  switch (coat) {
    case 'ginger': return { fur: f.peach, dark: mix(f.peach, f.maroon, 0.5), belly: f.rosewater }
    case 'tabby': return { fur: mix(f.peach, f.overlay0, 0.55), dark: mix(f.overlay0, ink, 0.4), belly: f.rosewater }
    case 'grey': return { fur: f.overlay1, dark: f.surface2, belly: f.subtext1 }
    case 'black': return { fur: mix(ink, f.surface1, 0.35), dark: ink, belly: mix(ink, f.surface2, 0.5) }
    case 'white': return { fur: light, dark: mix(light, f.overlay1, 0.3), belly: light }
    case 'cream': return { fur: mix(f.yellow, f.rosewater, 0.55), dark: mix(f.yellow, f.peach, 0.5), belly: f.rosewater }
    case 'calico': return { fur: light, dark: f.peach, belly: light }
    case 'tuxedo': return { fur: mix(ink, f.surface1, 0.35), dark: ink, belly: light }
    case 'siamese': return { fur: mix(f.rosewater, f.yellow, 0.3), dark: mix(f.overlay0, ink, 0.5), belly: f.rosewater }
  }
}

// Color of one sprite pixel: `ch` is the sprite letter, x/y its place in a 14x13 cat.
export const coatPixel = (g: Genes, f: Flavor, ch: string, x: number, y: number): number | undefined => {
  const p = furOf(g.coat, f)
  const shine = (c: number) => (g.isShiny ? mix(c, f.mauve, 0.3) : c)
  if (ch === 'f' || ch === 'd') {
    if (g.coat === 'calico') {
      const patch = (x + 2 * y) % 9
      return shine(patch < 3 ? f.peach : patch < 5 ? mix(inkOf(f), f.surface1, 0.4) : p.fur)
    }
    if (g.coat === 'siamese' && (y <= 2 || (y >= 4 && y <= 6 && x >= 4 && x <= 9))) return shine(p.dark)
    if (g.coat === 'tuxedo' && y >= 6 && x >= 5 && x <= 8) return shine(p.belly)
    const stripe = (g.coat === 'tabby' || g.coat === 'ginger') && (ch === 'd' || (y >= 8 && x % 3 === 0))
    return shine(stripe ? p.dark : p.fur)
  }
  if (ch === 'w') return shine(p.belly)
  if (ch === 'E') {
    const eye = g.eyes === 'odd' ? (x < 7 ? 'blue' : 'yellow') : g.eyes
    return eye === 'green' ? f.green : eye === 'blue' ? f.blue : f.yellow
  }
  return undefined
}

export const furColor = (g: Genes, f: Flavor) => furOf(g.coat, f).fur
