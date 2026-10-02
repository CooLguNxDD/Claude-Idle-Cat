// Pure pixel engine for the arcade: a framebuffer drawn as '▀' half-block cells.
import { mix } from '../theme'
import type { Background } from '../art/backgrounds'

export const STEP = 1 / 60
export const TICK_MS = 33
export const STEPS_PER_TICK = 2

export type Frame = { w: number; h: number; px: Uint32Array; pixelW?: number; pixelH?: number }
export type Run = { text: string; fg: number; bg: number }

export const frame = (w: number, h: number): Frame => ({ w, h, px: new Uint32Array(w * h) })
export const scaledFrame = (pixelW: number, pixelH: number, w: number, h: number): Frame =>
  ({ w, h, pixelW, pixelH, px: new Uint32Array(pixelW * pixelH) })
export const clear = (f: Frame, c: number) => f.px.fill(c)

// Missing or undecoded PNGs use each game's code-drawn fallback.
export const backdrop = (f: Frame, image: Background | undefined, fallback: () => void) => {
  if (image?.w === (f.pixelW ?? f.w) && image.h === (f.pixelH ?? f.h) && image.px.length === f.px.length) f.px.set(image.px)
  else fallback()
}

export const plot = (f: Frame, x: number, y: number, c: number) => {
  const ix = Math.round(x)
  const iy = Math.round(y)
  if (ix < 0 || iy < 0 || ix >= f.w || iy >= f.h) return
  const pw = f.pixelW ?? f.w
  const ph = f.pixelH ?? f.h
  const x0 = Math.floor(ix * pw / f.w), x1 = Math.floor((ix + 1) * pw / f.w)
  const y0 = Math.floor(iy * ph / f.h), y1 = Math.floor((iy + 1) * ph / f.h)
  for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) f.px[py * pw + px] = c
}

// Mixes `c` into the pixel by `a` (0..1): fades, glows and soft edges.
export const blend = (f: Frame, x: number, y: number, c: number, a: number) => {
  const ix = Math.round(x)
  const iy = Math.round(y)
  if (ix < 0 || iy < 0 || ix >= f.w || iy >= f.h || a <= 0) return
  const pw = f.pixelW ?? f.w
  const ph = f.pixelH ?? f.h
  for (let py = Math.floor(iy * ph / f.h); py < Math.floor((iy + 1) * ph / f.h); py++)
    for (let px = Math.floor(ix * pw / f.w); px < Math.floor((ix + 1) * pw / f.w); px++) {
      const i = py * pw + px
      f.px[i] = a >= 1 ? c : mix(f.px[i] ?? 0, c, a)
    }
}

export const rect = (f: Frame, x: number, y: number, w: number, h: number, c: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) plot(f, Math.round(x) + i, Math.round(y) + j, c)
}

export const vgradient = (f: Frame, top: number, bottom: number, from = 0, to = f.h) => {
  for (let y = from; y < to; y++) rect(f, 0, y, f.w, 1, mix(top, bottom, (y - from) / Math.max(1, to - from - 1)))
}

// Pixel-art sprite: one char per pixel, '.' transparent; `color` maps a char (and its x, y) to 0xRRGGBB.
export type Paint = (ch: string, x: number, y: number) => number | undefined
export const sprite = (f: Frame, rows: readonly string[], color: Paint, x: number, y: number, flip = false) => {
  const ox = Math.round(x)
  const oy = Math.round(y)
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[flip ? row.length - 1 - i : i] ?? '.'
      if (ch === '.') continue
      const c = color(ch, flip ? row.length - 1 - i : i, j)
      if (c !== undefined) plot(f, ox + i, oy + j, c)
    }
  })
}

// One terminal row per two pixel rows, neighbouring cells with the same colors merged into one run.
export const toRows = (f: Frame): Run[][] => {
  const rows: Run[][] = []
  for (let y = 0; y < f.h; y += 2) {
    const runs: Run[] = []
    let isBlank = false
    for (let x = 0; x < f.w; x++) {
      const top = f.px[y * f.w + x] ?? 0
      const bottom = y + 1 < f.h ? (f.px[(y + 1) * f.w + x] ?? 0) : top
      const last = runs[runs.length - 1]
      // A solid cell is a space on its bg, so it joins any run with that bg.
      if (top === bottom) {
        if (last && last.bg === bottom) last.text += ' '
        else { runs.push({ text: ' ', fg: top, bg: bottom }); isBlank = true }
        continue
      }
      if (last && last.bg === bottom && (last.fg === top || isBlank)) {
        last.fg = top
        last.text += '▀'
      } else runs.push({ text: '▀', fg: top, bg: bottom })
      isBlank = false
    }
    rows.push(runs)
  }
  return rows
}

// Fading sub-pixel particles: bursts for hits, pickups and landings.
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; c: number }
export const burst = (rng: () => number, x: number, y: number, c: number, n = 8, speed = 40): Particle[] =>
  Array.from({ length: n }, () => {
    const a = rng() * Math.PI * 2
    const v = speed * (0.4 + rng() * 0.6)
    const max = 0.3 + rng() * 0.4
    return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life: max, max, c }
  })
export const stepParticles = (ps: Particle[], dt: number, gravity = 60): Particle[] =>
  ps.filter(p => (p.life -= dt) > 0).map(p => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + gravity * dt }))
export const drawParticles = (f: Frame, ps: readonly Particle[]) => {
  for (const p of ps) blend(f, p.x, p.y, p.c, p.life / p.max)
}

// Decaying screen shake; `shakeOffset` is 0 once it settles.
export type Shake = { t: number; mag: number }
export const shake = (mag: number, t = 0.25): Shake => ({ t, mag })
export const stepShake = (s: Shake, dt: number): Shake => ({ ...s, t: Math.max(0, s.t - dt) })
export const shakeOffset = (s: Shake, tick: number) =>
  s.t <= 0 ? { x: 0, y: 0 } : { x: Math.round(Math.sin(tick * 1.7) * s.mag * s.t * 4), y: Math.round(Math.cos(tick * 2.3) * s.mag * s.t * 2) }

// Shifts a whole frame (screen shake) and fills the gap with `fill`.
export const offset = (f: Frame, dx: number, dy: number, fill: number): Frame => {
  if (dx === 0 && dy === 0) return f
  const pw = f.pixelW ?? f.w
  const ph = f.pixelH ?? f.h
  const pxDx = Math.round(dx * pw / f.w)
  const pxDy = Math.round(dy * ph / f.h)
  const out = f.pixelW && f.pixelH ? scaledFrame(pw, ph, f.w, f.h) : frame(f.w, f.h)
  out.px.fill(fill)
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const sx = x - pxDx
      const sy = y - pxDy
      if (sx >= 0 && sy >= 0 && sx < pw && sy < ph) out.px[y * pw + x] = f.px[sy * pw + sx] ?? fill
    }
  }
  return out
}

export const easeOut = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3
export const approach = (from: number, to: number, rate: number, dt: number) => from + (to - from) * (1 - Math.exp(-rate * dt))

// Tiny 3x5 digits, drawn into the frame for score pops.
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
  '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111']
export const number = (f: Frame, n: number, x: number, y: number, c: number, scale = 1) => {
  String(Math.max(0, Math.floor(n))).split('').forEach((d, k) => {
    const bits = DIGITS[Number(d)] ?? ''
    for (let i = 0; i < 15; i++) if (bits[i] === '1')
      rect(f, x + k * 4 * scale + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale, c)
  })
}
