import type { World } from '../content/types'
import { shadeOf } from '../content/types'
import { mix } from '../theme'
import type { Flavor } from '../theme'
import { view } from './canvas'
import type { SceneCanvas } from './canvas'
import { FLOOR, hash, pen } from './fine/draw'
import type { Pen } from './fine/draw'
import type { LayerKind } from '../content/types'

type Drawer = (p: Pen, tint: number, isNight: boolean, f: Flavor) => void

// Each kind fills the band behind the fence across the layer's whole width, in design units.
const DRAWERS: Record<LayerKind, Drawer> = {
  hills: (p, tint) => {
    for (let x = 0; x < p.W; x++) {
      const top = Math.round(42 - 6 * Math.sin(x / 37) - 4 * Math.sin(x / 13 + 1))
      p.rect(x, top, 1, FLOOR - top, tint)
    }
  },
  trees: (p, tint, _, f) => {
    const trunk = mix(tint, f.crust, 0.45)
    for (let i = 0; i * 34 < p.W + 34; i++) {
      const cx = i * 34 + Math.round(hash(i, 1) * 14)
      const r = 6 + Math.round(hash(i, 2) * 4)
      p.rect(cx - 1, 46, 2, FLOOR - 46, trunk)
      p.disc(cx, 44 - r / 2, r, r * 0.85, tint)
      p.disc(cx - r / 3, 42 - r / 2, r / 3, r / 3, mix(tint, f.rosewater, 0.18))
    }
  },
  rooftops: (p, tint, isNight, f) => {
    const glass = isNight ? f.yellow : mix(tint, f.sky, 0.35)
    for (let i = 0; i * 26 < p.W + 26; i++) {
      const x0 = i * 26
      const w = 18 + Math.round(hash(i, 3) * 6)
      const top = 22 + Math.round(hash(i, 4) * 20)
      p.rect(x0, top, w, FLOOR - top, tint)
      p.rect(x0 - 1, top - 2, w + 2, 2, mix(tint, f.crust, 0.3))
      for (let wy = top + 4; wy < 52; wy += 6) for (let wx = x0 + 3; wx < x0 + w - 3; wx += 5)
        if (!isNight || hash(wx, wy) > 0.45) p.rect(wx, wy, 2, 3, glass)
    }
  },
}

/** Draws the world's far layers through `c`, each scrolled by its parallax share of the camera. */
export const drawLayers = (c: SceneCanvas, world: World, worldCols: number, camX: number, isNight: boolean, f: Flavor) => {
  for (const layer of world.layers) {
    const shift = camX * layer.parallax
    const cols = c.w + Math.ceil((worldCols - c.w) * layer.parallax) + 1
    const base = shadeOf(layer.tint, f)
    DRAWERS[layer.kind](pen(view(c, cols, shift)), isNight ? mix(base, f.crust, 0.5) : base, isNight, f)
  }
}
