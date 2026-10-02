import type { Coat, Genes } from '../../types'
import { inkOf, mix } from '../theme'
import type { Flavor } from '../theme'

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
    case 'chocolate': return { fur: mix(f.peach, ink, 0.58), dark: mix(f.maroon, ink, 0.75), belly: mix(f.rosewater, f.peach, 0.5) }
    case 'cinnamon': return { fur: mix(f.peach, f.red, 0.3), dark: mix(f.peach, f.maroon, 0.7), belly: f.yellow }
    case 'silver': return { fur: mix(light, f.lavender, 0.35), dark: f.overlay1, belly: light }
    case 'smoke': return { fur: mix(ink, f.overlay0, 0.5), dark: ink, belly: f.overlay2 }
    case 'tortoiseshell': return { fur: mix(ink, f.surface1, 0.4), dark: f.peach, belly: mix(f.peach, f.maroon, 0.5) }
    case 'ragdoll': return { fur: light, dark: mix(f.blue, f.overlay1, 0.65), belly: f.rosewater }
    case 'bengal': return { fur: mix(f.yellow, f.peach, 0.55), dark: mix(f.maroon, ink, 0.65), belly: f.rosewater }
    case 'lynx': return { fur: mix(f.overlay2, f.rosewater, 0.35), dark: mix(f.overlay0, ink, 0.3), belly: light }
    case 'nebula': return { fur: f.mauve, dark: f.blue, belly: f.sky }
    default: return { fur: f.peach, dark: f.maroon, belly: f.rosewater }
  }
}

// Sprite coordinates make markings repeatable in both pane and arcade poses.
export const coatPixel = (g: Genes, f: Flavor, ch: string, x: number, y: number): number | undefined => {
  const p = furOf(g.coat, f)
  const shine = (color: number) => g.isShiny ? mix(color, f.mauve, 0.3) : color
  if (ch === 'f' || ch === 'd' || ch === 'w') {
    let color = ch === 'w' ? p.belly : p.fur
    if (ch !== 'w') {
      if (g.coat === 'calico' || g.coat === 'tortoiseshell') {
        const patch = (x + 2 * y) % 9
        color = patch < 3 ? f.peach : patch < 5 ? mix(inkOf(f), f.surface1, 0.4) : p.fur
      } else if (['siamese', 'ragdoll'].includes(g.coat) && (y <= 2 || (y >= 4 && y <= 6 && x >= 4 && x <= 9))) color = p.dark
      else if (g.coat === 'tuxedo' && y >= 6 && x >= 5 && x <= 8) color = p.belly
      else if (['tabby', 'ginger', 'silver', 'lynx'].includes(g.coat) && (ch === 'd' || (y >= 8 && x % 3 === 0))) color = p.dark
      else if (g.coat === 'bengal' && ((x * 3 + y * 5) % 11 < 3 || ch === 'd')) color = p.dark
      else if (g.coat === 'smoke' && y >= 8) color = mix(p.fur, p.belly, 0.45)
      else if (g.coat === 'nebula') color = (x + y * 2) % 7 === 0 ? f.rosewater : mix(p.fur, p.dark, (x % 5) / 5)
    }
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
export const furColor = (g: Genes, f: Flavor) => furOf(g.coat, f).fur
