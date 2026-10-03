import type { Genes } from '../../types'
import { coatPixel } from '../genes'
import type { Form } from '../skills'
import { inkOf, mix } from '../theme'
import type { Flavor } from '../theme'
import type { Pen } from './fine/draw'

// The active cat at 4x (56 x 52 fine pixels, the same footprint as the 14 x 13 sprite), built from shapes.
export type HiCat = {
  genes: Genes
  mood: 'happy' | 'sleeping' | 'grumpy' | string
  form: Form | null
  isAdult: boolean
  isBirthday: boolean
  isBlink: boolean
  tick: number
}

// Fur tokens shade and take the coat; a number is a flat colour (forms, collar).
type Cell = 'f' | 'w' | 'i' | 'E' | 'K' | 'H' | 'n' | 'p' | number
type Pt = readonly [number, number]
// The cat is specified on a 56 x 52 design box (4 units per scene pixel) plus room for the tail, hats and wings.
const PAD = 16
const GW = 56 + PAD * 2
const GH = 52 + PAD * 2

// Rasterizes design-unit shapes at `u` device pixels per unit into a grid of cell tokens.
const grid = (u: number) => {
  const w = Math.round(GW * u)
  const h = Math.round(GH * u)
  const cells: (Cell | undefined)[] = new Array(w * h)
  const toDesign = (i: number) => (i + 0.5) / u - PAD
  const cell = (dx: number, dy: number) => (dx >= 0 && dx < w && dy >= 0 && dy < h ? cells[dy * w + dx] : undefined)
  const put = (dx: number, dy: number, v: Cell) => { if (dx >= 0 && dx < w && dy >= 0 && dy < h) cells[dy * w + dx] = v }
  // Visits each device cell whose centre lies in the design-unit box.
  const each = (x0: number, y0: number, x1: number, y1: number, fn: (dx: number, dy: number, x: number, y: number) => void) => {
    for (let dy = Math.floor((y0 + PAD) * u); dy < Math.ceil((y1 + PAD) * u); dy++)
      for (let dx = Math.floor((x0 + PAD) * u); dx < Math.ceil((x1 + PAD) * u); dx++) fn(dx, dy, toDesign(dx), toDesign(dy))
  }
  const ellipse = (cx: number, cy: number, rx: number, ry: number, v: Cell, isOnlyOn = false) =>
    each(cx - rx, cy - ry, cx + rx, cy + ry, (dx, dy, x, y) => {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && (!isOnlyOn || cell(dx, dy) !== undefined)) put(dx, dy, v)
    })
  const tri = (a: Pt, b: Pt, c: Pt, v: Cell) => {
    const side = (p: Pt, q: Pt, x: number, y: number) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])
    each(Math.min(a[0], b[0], c[0]), Math.min(a[1], b[1], c[1]), Math.max(a[0], b[0], c[0]) + 1, Math.max(a[1], b[1], c[1]) + 1,
      (dx, dy, x, y) => {
        const s1 = side(a, b, x, y)
        const s2 = side(b, c, x, y)
        const s3 = side(c, a, x, y)
        if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) put(dx, dy, v)
      })
  }
  // A round-capped stroke through the points, for tails and ribbons.
  const stroke = (pts: readonly Pt[], r: number, v: Cell) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i]!
      const [x1, y1] = pts[i + 1]!
      const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)
      for (let s = 0; s <= steps; s++) ellipse(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps, r, r, v)
    }
  }
  // Fills whole design units from (x0, y0) to (x1, y1) inclusive, optionally only over cells `when` accepts.
  const box = (x0: number, y0: number, x1: number, y1: number, v: Cell, when?: (cur: Cell | undefined) => boolean) =>
    each(x0, y0, x1 + 1, y1 + 1, (dx, dy) => { if (!when || when(cell(dx, dy))) put(dx, dy, v) })
  const dot = (x: number, y: number, v: Cell) => box(x, y, x, y, v)
  return { w, h, cell, toDesign, ellipse, tri, stroke, box, dot }
}
const isSet = (cur: Cell | undefined) => cur !== undefined

const TAIL_TIPS = [[55, 28], [57, 31], [56, 34], [53, 30]] as const

export const drawHiCat = (p: Pen, x0: number, y0: number, cat: HiCat, f: Flavor) => {
  const g = grid(p.u)
  const { mood, form, tick } = cat
  const isAsleep = mood === 'sleeping'
  const isChonk = form === 'chonk'
  const isFluffy = cat.genes.silhouette === 'fluffy'
  const breath = isAsleep ? (tick % 24 < 12 ? 0 : 1) : tick % 16 < 8 ? 0 : 1

  // Back layer: cape, cloud puffs and the tail.
  if (form === 'royal') g.ellipse(28, 42, 24, 11, f.mauve)
  if (form === 'cloud') {
    const lift = tick % 8 < 4 ? 0 : 1
    for (const cx of [3, 53]) {
      g.ellipse(cx, 38 - lift, 5, 4, f.lavender)
      g.ellipse(cx + (cx < 28 ? 3 : -3), 42 - lift, 5, 4, f.lavender)
    }
  }
  const tip = TAIL_TIPS[Math.floor(tick / 4) % TAIL_TIPS.length]!
  g.stroke(isAsleep ? [[44, 48], [52, 50], [58, 47]] : [[43, 46], [52, 43], [tip[0] - 1, (43 + tip[1]) / 2], tip], 2.6, 'f')

  // Body, head, ears and paws.
  g.ellipse(28, 41 + (isAsleep ? 1 : 0), (isChonk ? 23 : 19) + breath * 0.5, 11 + breath * 0.3, 'f')
  if (isFluffy) for (const s of [-1, 1]) {
    g.tri([28 + s * 18, 34], [28 + s * 23, 40], [28 + s * 18, 46], 'f')
    g.tri([28 + s * 18, 18], [28 + s * 25, 25], [28 + s * 17, 30], 'f')
  }
  g.ellipse(28, 19, isChonk ? 22 : 20, 14, 'f')
  if (cat.genes.silhouette === 'fold') {
    g.ellipse(13, 8, 7, 4, 'f')
    g.ellipse(43, 8, 7, 4, 'f')
  } else {
    g.tri([7, 15], [9, 0], [25, 7], 'f')
    g.tri([49, 15], [47, 0], [31, 7], 'f')
    g.tri([11, 11], [11, 4], [19, 8], 'i')
    g.tri([45, 11], [45, 4], [37, 8], 'i')
  }
  g.ellipse(19, 49, 5, 3, 'f')
  g.ellipse(37, 49, 5, 3, 'f')

  // Face and chest.
  g.ellipse(28, 43, 11, 8, 'w', true)
  g.ellipse(28, 26, 7, 4.5, 'w', true)
  if (isAsleep || cat.isBlink) for (const cx of [19, 37]) {
    g.box(cx - 4, 20, cx + 4, 20, inkOf(f))
    g.dot(cx - 4, isAsleep ? 19 : 21, inkOf(f))
    g.dot(cx + 4, isAsleep ? 19 : 21, inkOf(f))
  } else for (const cx of [19, 37]) {
    g.ellipse(cx, 19, 4, 5, 'E')
    g.ellipse(cx + 0.5, 19.5, 1.2, 3.6, 'K')
    g.box(cx - 2, 16, cx - 1, 16, 'H')
    g.dot(cx - 2, 17, 'H')
    if (mood === 'grumpy') g.box(cx - 4, 14, cx + 4, 16, 'f')
  }
  if (mood === 'grumpy') for (let i = 0; i <= 8; i++) {
    g.dot(14 + i, 11 + Math.floor(i / 3), inkOf(f))
    g.dot(42 - i, 11 + Math.floor(i / 3), inkOf(f))
  }
  g.tri([25, 23], [31, 23], [28, 26], 'n')
  for (const [x, y] of [[28, 27], [27, 28], [26, 28], [25, 27], [29, 28], [30, 28], [31, 27]] as const) g.dot(x, y, inkOf(f))
  if (mood === 'happy') {
    g.ellipse(12, 25, 3, 2, 'p', true)
    g.ellipse(44, 25, 3, 2, 'p', true)
  }
  if (cat.isAdult) {
    g.box(12, 31, 44, 32, f.red, isSet)
    g.ellipse(28, 34.5, 2, 2, f.yellow)
  }

  // Front layer: headband, crown, halo, party hat.
  if (form === 'ninja') {
    g.box(6, 10, 50, 12, f.red, isSet)
    const flap = tick % 6 < 3 ? 0 : 2
    g.stroke([[48, 11], [54, 9 + flap], [59, 12 + flap]], 1.2, f.red)
  }
  if (form === 'royal') {
    g.box(18, 1, 38, 4, f.yellow)
    for (const cx of [18, 28, 38]) g.tri([cx - 3, 1], [cx + 3, 1], [cx, -5], f.yellow)
    g.ellipse(28, 2.5, 1.5, 1.5, f.red)
  }
  if (cat.isBirthday) {
    g.tri([22, 6], [34, 6], [28, -9], f.mauve)
    for (const y of [-3, 2]) g.box(20, y, 36, y, f.yellow, cur => cur === f.mauve)
    g.ellipse(28, -10, 2, 2, f.yellow)
  }

  // Outline every shape, then shade fur from a top-left light; both stay a crisp line at any scale.
  const ink = inkOf(f)
  const t = Math.max(1, Math.round(p.u))
  const isSolid = (dx: number, dy: number) => g.cell(dx, dy) !== undefined
  const ox = Math.round((x0 - PAD) * p.u)
  const oy = Math.round((y0 - PAD) * p.u)
  // Pointed coats darken ears, face, paws and tail as smooth shapes rather than the sprite's blocky rows.
  const isPointed = cat.genes.coat === 'siamese' || cat.genes.coat === 'ragdoll'
  const isPoint = (x: number, y: number) => y < 9 || ((x - 28) / 11) ** 2 + ((y - 24) / 8) ** 2 <= 1 || y >= 47 || (x >= 45 && y >= 34)
  // Calico and tortoiseshell patches follow smooth waves instead of the sprite's diagonal blocks.
  const isPatchy = cat.genes.coat === 'calico' || cat.genes.coat === 'tortoiseshell'
  const light = f.isLight ? 0xffffff : f.text
  const dark = f.crust
  for (let dy = 0; dy < g.h; dy++) for (let dx = 0; dx < g.w; dx++) {
    const v = g.cell(dx, dy)
    if (v === undefined) {
      for (let r = 1; r <= t; r++) if (isSolid(dx - r, dy) || isSolid(dx + r, dy) || isSolid(dx, dy - r) || isSolid(dx, dy + r)) {
        p.px(ox + dx, oy + dy, ink)
        break
      }
      continue
    }
    const x = g.toDesign(dx)
    const y = g.toDesign(dy)
    let color: number
    if (typeof v === 'number') color = v
    else if (v === 'f' && isPatchy) {
      const n = Math.sin(x * 0.31 + 1.7) + Math.sin(y * 0.27 + x * 0.11) + Math.sin((x - y) * 0.19 + 0.6)
      color = n > 0.9 ? f.peach : n < -0.8 ? mix(ink, f.surface1, 0.4) : coatPixel(cat.genes, f, 'f', 5, 0) ?? f.peach
    } else if (v === 'f' && isPointed) color = (isPoint(x, y) ? coatPixel(cat.genes, f, 'f', 5, 1) : coatPixel(cat.genes, f, 'f', 0, 8)) ?? f.peach
    else if (v === 'f' || v === 'w') color = coatPixel(cat.genes, f, v, Math.floor(x / 4), Math.floor(y / 4)) ?? f.peach
    else if (v === 'E') color = coatPixel(cat.genes, f, 'E', x < 28 ? 3 : 10, 5) ?? f.green
    else color = v === 'K' ? ink : v === 'H' ? light : v === 'n' ? mix(f.pink, f.red, 0.35) : f.pink
    if (v === 'f' || v === 'w') {
      if (!isSolid(dx + t, dy + t) || !isSolid(dx + 2 * t, dy + 2 * t)) color = mix(color, dark, 0.3)
      else if (!isSolid(dx - t, dy - t) || !isSolid(dx - 2 * t, dy - 2 * t)) color = mix(color, light, 0.22)
    }
    p.px(ox + dx, oy + dy, color)
  }
  // Whiskers sit outside the outline, drawn last in a soft line colour.
  const whisker = mix(ink, light, 0.55)
  for (const s of [-1, 1]) for (const [dy, slope] of [[-1, -0.25], [1, 0.15]] as const)
    p.line(x0 + 28 + s * 8, y0 + 26 + dy, x0 + 28 + s * 22, y0 + 26 + dy + Math.round(14 * slope), whisker)
}
