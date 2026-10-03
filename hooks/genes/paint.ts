import type { Genes } from '../../types'
import { breedOf } from '../adoption/registry'
import { shadeOf } from '../content/types'
import type { Breed } from '../content/types'
import { mix } from '../theme'
import type { Flavor } from '../theme'

type Fur = { fur: number; dark: number; belly: number }
const furOf = (b: Breed, f: Flavor): Fur => ({ fur: shadeOf(b.fur, f), dark: shadeOf(b.dark, f), belly: shadeOf(b.belly, f) })

// Each pattern kind darkens or lightens the sprite's fur tokens at repeatable sprite coordinates.
const patterned = (b: Breed, p: Fur, f: Flavor, ch: string, x: number, y: number): number => {
  const pt = b.pattern
  switch (pt.kind) {
    case 'patches': {
      const patch = (x + 2 * y) % 9
      return patch < 3 ? shadeOf(pt.colors[0], f) : patch < 5 ? shadeOf(pt.colors[1], f) : p.fur
    }
    case 'points': return y <= 2 || (y >= 4 && y <= 6 && x >= 4 && x <= 9) ? p.dark : p.fur
    case 'bib': return y >= 6 && x >= 5 && x <= 8 ? p.belly : p.fur
    case 'stripes': return ch === 'd' || (y >= 8 && x % 3 === 0) ? p.dark : p.fur
    case 'rosettes': return (x * 3 + y * 5) % 11 < 3 || ch === 'd' ? p.dark : p.fur
    case 'undercoat': return y >= 8 ? mix(p.fur, p.belly, pt.blend) : p.fur
    case 'stars': return (x + y * 2) % 7 === 0 ? shadeOf(pt.star, f) : mix(p.fur, p.dark, (x % 5) / 5)
    case 'solid': return p.fur
    default: return unhandled(pt, p.fur)
  }
}
// Fails the type check when a pattern kind has no case above; at runtime an unknown kind paints plain fur.
const unhandled = (_: never, fur: number) => fur

// Sprite coordinates make markings repeatable in both pane and arcade poses.
export const coatPixel = (g: Genes, f: Flavor, ch: string, x: number, y: number): number | undefined => {
  const b = breedOf(g.coat)
  const p = furOf(b, f)
  const shine = (color: number) => g.isShiny ? mix(color, f.mauve, 0.3) : color
  if (ch === 'f' || ch === 'd' || ch === 'w') {
    let color = ch === 'w' ? p.belly : patterned(b, p, f, ch, x, y)
    if (g.marking === 'socks' && y >= 10) color = f.isLight ? f.surface0 : f.text
    if (g.marking === 'blaze' && x >= 6 && x <= 7 && y >= 2 && y <= 6) color = f.rosewater
    if (g.marking === 'mask' && y >= 4 && y <= 6) color = p.dark
    if (g.marking === 'spots' && ch !== 'w' && (x * 7 + y * 3) % 13 < 2) color = p.dark
    return shine(color)
  }
  if (ch === 'E') {
    const eye = g.eyes === 'odd' ? (x < 7 ? 'blue' : 'yellow') : g.eyes
    return eye === 'green' ? f.green : eye === 'blue' ? f.blue : f.yellow
  }
  return undefined
}
export const furColor = (g: Genes, f: Flavor) => shadeOf(breedOf(g.coat).fur, f)
