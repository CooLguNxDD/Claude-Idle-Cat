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
  cabins: (p, tint, isNight, f) => {
    const snow = f.isLight ? f.base : f.text
    for (let i = 0; i * 76 < p.W + 76; i++) {
      const x = i * 76
      p.rect(x + 8, 36, 34, 22, mix(f.peach, tint, 0.45))
      for (let yy = 39; yy < 58; yy += 4) p.rect(x + 8, yy, 34, 1, mix(tint, f.crust, 0.35))
      for (let dx = 0; dx < 44; dx++) {
        const top = 23 + Math.abs(dx - 22) * 0.6
        p.rect(x + dx + 3, top, 1, 38 - top, mix(f.maroon, tint, 0.4))
        p.rect(x + dx + 3, top, 1, 2, snow)
      }
      p.rect(x + 17, 41, 8, 8, isNight ? f.yellow : f.sky)
      p.rect(x + 20, 41, 1, 8, tint)
      p.rect(x + 31, 44, 6, 14, mix(tint, f.crust, 0.35))
      const cx = x + 59
      p.rect(cx - 1, 34, 3, 24, f.peach)
      for (let yy = 24; yy < 52; yy++) {
        const width = 3 + (yy - 24) % 10
        p.rect(cx - width, yy, width * 2, 1, tint)
        if ((yy - 24) % 10 < 2) p.rect(cx - width, yy, width * 2, 1, snow)
      }
    }
  },
  'neon-city': (p, tint, _, f) => {
    for (let i = 0; i * 60 < p.W + 60; i++) {
      const x = i * 60
      const light = i % 2 ? f.sky : f.pink
      p.rect(x + 4, 20, 44, 36, tint)
      p.rect(x + 4, 20, 44, 1, mix(tint, light, 0.5))
      p.rect(x + 12, 28, 28, 14, f.crust)
      for (const yy of [28, 41]) p.rect(x + 12, yy, 28, 1, light)
      for (const xx of [12, 39]) p.rect(x + xx, 28, 1, 14, light)
      // A fish-shaped sign needs no font or text overlay.
      p.disc(x + 25, 35, 7, 3, light)
      p.line(x + 31, 35, x + 36, 31, light)
      p.line(x + 31, 35, x + 36, 39, light)
      p.dot(x + 22, 34, f.crust)
    }
  },
  'station-windows': (p, tint, _, f) => {
    for (let i = 0; i * 88 < p.W + 88; i++) {
      const x = i * 88
      p.rect(x, 12, 6, 44, tint)
      p.rect(x, 12, 88, 3, tint)
      p.rect(x, 53, 88, 3, tint)
      p.rect(x + 10, 46, 64, 7, f.surface1)
      for (let dx = 14; dx < 72; dx += 8) p.rect(x + dx, 48, 3, 2, dx % 3 ? f.sky : f.green)
      if (i % 2 === 0) {
        p.disc(x + 54, 29, 8, 8, mix(f.mauve, f.peach, 0.3))
        p.line(x + 42, 32, x + 66, 26, f.lavender)
      }
    }
  },
  ocean: (p, tint, isNight, f) => {
    p.rect(0, 36, p.W, FLOOR - 36, tint)
    p.rect(0, 36, p.W, 1, mix(tint, f.sky, 0.4))
    for (let yy = 41; yy < 57; yy += 5) for (let x = 0; x < p.W; x += 29)
      p.rect(x + (yy * 7) % 17, yy, 12, 1, mix(tint, isNight ? f.lavender : f.rosewater, 0.4))
    for (let i = 0; i * 120 < p.W; i++) {
      const x = i * 120 + 45
      p.line(x, 25, x, 35, f.overlay1)
      for (let yy = 26; yy < 34; yy++) p.rect(x + 1, yy, 34 - yy, 1, f.rosewater)
      p.rect(x - 4, 35, 14, 2, f.peach)
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
