import type { Genes, Home } from '../../types'
import { RARITIES, rarityOf } from '../adoption/registry'
import { revealedCat } from '../adoption/state'
import { paneArtOf } from '../art/cats'
import { SHELTER_ART } from '../art/shelter'
import { coatPixel } from '../genes'
import { inkOf, mix } from '../theme'
import type { Flavor } from '../theme'
import { canvas, HEIGHT } from './canvas'
import type { RgbaImage, SceneCanvas } from './canvas'

export type ShelterFocus = 'last' | 'pending' | 'offer'

const drawShelter = (home: Home, now: number, tick: number, f: Flavor, cols: number, scale = 1, focus: ShelterFocus = 'last'): SceneCanvas => {
  const c = canvas(cols, scale)
  const pending = focus === 'pending' ? home.shelter.pending : null
  const offer = focus === 'offer' ? home.shelter.offer : null
  const cat = pending || offer ? null : revealedCat(home)
  const genes: Genes | undefined = pending?.genes ?? offer?.after ?? cat?.genes
  const openedAt = pending ? pending.openedAt : offer ? offer.openedAt : cat ? home.shelter.last?.at ?? now : null
  const age = openedAt === null ? 0 : Math.max(0, (now - openedAt) / 1000)
  const accent = genes ? f[RARITIES[rarityOf(genes)].color] : f.mauve
  const cx = Math.floor(cols / 2)
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < cols; x++)
    c.put(x, y, y > 20 ? f.mantle : mix(f.base, accent, Math.max(0, 0.15 - Math.abs(x - cx) * 0.008)))
  for (let x = cx - 11; x <= cx + 11; x++) c.put(x, 21, f.surface2)
  const isRevealed = genes && openedAt !== null && age >= 1.4
  if (isRevealed && genes) {
    const sprite = paneArtOf(genes)
    sprite.frames[0]?.forEach((row, y) => [...row].forEach((ch, x) => {
      const color = ch === 'o' ? inkOf(f) : ch === 'n' ? f.red : ch === 'p' ? f.pink
        : coatPixel(genes, f, ch === 'E' && tick % 40 < 2 ? 'd' : ch, x, y)
      if (color !== undefined) c.put(cx - 7 + x, 7 + y, color)
    }))
    const stars = '★'.repeat(RARITIES[rarityOf(genes)].stars)
    c.text(cx - Math.floor(stars.length / 2), 1, stars, accent)
    for (let i = 0; i < 6; i++) {
      const x = cx - 13 + (i * 7 + Math.floor(tick / 3)) % 27
      const y = 4 + (i * 3 + Math.floor(tick / 6)) % 14
      if (Math.abs(x - cx) > 7) c.put(x, y, accent)
    }
  } else {
    const rows = SHELTER_ART.parcel.frames[openedAt !== null && age >= 0.7 ? 1 : 0]!
    const colors: Record<string, number> = { o: inkOf(f), p: f.peach, f: f.yellow, d: f.peach, w: accent, i: f.crust }
    const shake = openedAt !== null && age < 0.7 ? tick % 3 - 1 : 0
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (colors[ch] !== undefined) c.put(cx - 9 + x + shake, 7 + y, colors[ch]!)
    }))
    c.text(cx - 1, 2, '?', accent)
  }
  return c
}

export const shelterCells = (home: Home, now: number, tick: number, f: Flavor, cols: number, focus: ShelterFocus = 'last'): string =>
  drawShelter(home, now, tick, f, cols, 1, focus).pack()
export const shelterImage = (home: Home, now: number, tick: number, f: Flavor, cols: number, scale: number, focus: ShelterFocus = 'last'): RgbaImage =>
  drawShelter(home, now, tick, f, cols, scale, focus).image(inkOf(f))
