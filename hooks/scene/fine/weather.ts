import { WEATHER_PALETTES } from '../../art/weather'
import { mix } from '../../theme'
import type { WeatherLayer } from '../weather/context'
import { drift } from '../weather/context'
import { FLOOR, S, disc, dither, fw, line, rect, wrapF } from './draw'
import { driftX, fineCloud } from './sky'

export const fineClouds: WeatherLayer = ({ c, weather, tick, f }) => {
  if (weather.condition === 'clear') return
  const isPartly = weather.condition === 'partly-cloudy'
  const color = mix(f[WEATHER_PALETTES[weather.condition].cloud], weather.isDay ? f.sky : f.crust, isPartly ? 0.3 : 0.4)
  const speed = weather.windKph > 25 ? 2 : 6
  const count = isPartly ? 2 : 5
  for (let i = 0; i < count; i++) {
    const size = isPartly ? 8 : 10 + (i % 2) * 3
    const x = driftX(i * 70 * drift(weather), tick * drift(weather), speed, fw(c), size * 3)
    fineCloud(c, x, 6 + (i % 2) * 10, size, color, f)
  }
  if (weather.condition === 'storm' && tick % 120 >= 12 && tick % 120 < 14) {
    const bolt = mix(f.yellow, f.rosewater, 0.5)
    const x0 = Math.floor(fw(c) * 0.65)
    const pts = [[x0 + 6, 18], [x0 + 2, 30], [x0 + 7, 32], [x0 + 1, 48], [x0 + 5, 50], [x0 - 2, 62]] as const
    for (let i = 0; i + 1 < pts.length; i++) for (const dx of [0, 1]) line(c, pts[i]![0] + dx, pts[i]![1], pts[i + 1]![0] + dx, pts[i + 1]![1], bolt)
  }
}

export const fineFog: WeatherLayer = ({ c, weather, tick, f }) => {
  const color = mix(f.overlay1, weather.isDay ? f.sky : f.surface0, 0.5)
  for (const [y0, h, cover] of [[30, 10, 0.5], [46, 12, 0.62], [64, 10, 0.45]] as const)
    for (let y = y0; y < y0 + h; y++) for (let x = 0; x < fw(c); x++) {
      const edge = 1 - Math.abs((y - y0 - h / 2) / (h / 2))
      const wave = 0.5 + 0.5 * Math.sin((x + (tick >> 1) + y0 * 3) / 14)
      if (dither(x, y, cover * edge * (0.6 + 0.4 * wave))) c.fine(x, y, color)
    }
}

export const fineRain: WeatherLayer = ({ c, weather, tick, f }) => {
  const isLight = weather.condition === 'drizzle'
  const count = isLight ? 22 : weather.condition === 'storm' ? 60 : 42
  const color = mix(f.sky, f.surface1, isLight ? 0.45 : 0.2)
  const dx = weather.windKph > 15 ? drift(weather) : 0
  const len = isLight ? 2 : 4
  for (let i = 0; i < count; i++) {
    const x = wrapF(i * 37 + tick * dx * 2, fw(c))
    const y = 12 + ((i * 29 + tick * (isLight ? 3 : 6)) % (FLOOR - 12))
    for (let k = 0; k < len; k++) c.fine(x - Math.round((dx * k) / 2), y + k, color)
  }
  for (let i = 0; i < 6; i++) {
    const phase = (tick + i * 5) % 10
    if (phase > 3) continue
    const x = wrapF(i * 53 + (tick >> 2) * 7, fw(c))
    const splash = mix(f.sapphire, f.text, 0.3)
    c.fine(x - 1 - phase, FLOOR - 1 - (phase >> 1), splash)
    c.fine(x + 1 + phase, FLOOR - 1 - (phase >> 1), splash)
  }
}

export const fineSnow: WeatherLayer = ({ c, weather, tick, f }) => {
  const color = f.isLight ? f.base : f.text
  for (let i = 0; i < 40; i++) {
    const sway = Math.round(Math.sin((tick + i * 9) / 6) * 2)
    const x = wrapF(i * 31 + (tick >> 1) * drift(weather) + sway, fw(c))
    const y = (i * 23 + tick) % FLOOR
    c.fine(x, y, color)
    if (i % 4 === 0) for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) c.fine(x + ddx, y + ddy, mix(color, f.sky, 0.3))
  }
}

export const fineWind: WeatherLayer = ({ c, weather, tick, f }) => {
  if (weather.windKph < 20) return
  const isLeafy = weather.condition === 'clear' || weather.condition === 'partly-cloudy'
  for (let i = 0; i < 4; i++) {
    const x = wrapF(i * 61 + tick * 3 * drift(weather), fw(c))
    const y = 30 + ((i * 19 + (tick >> 2)) % 44)
    if (isLeafy) {
      const leaf = mix(f.green, f.peach, 0.5)
      const flip = (tick + i) % 4 < 2 ? 0 : 1
      rect(c, x, y + flip, 3, 1, leaf)
      rect(c, x + 1, y + 1 - flip, 2, 1, mix(leaf, f.crust, 0.2))
    } else for (let k = 0; k < 10; k++) if (k % 4 !== 3) c.fine(wrapF(x + k, fw(c)), y + (k > 6 ? 1 : 0), mix(f.sky, f.surface1, 0.6))
  }
}

export const fineWetGround: WeatherLayer = ({ c, weather, tick, f }) => {
  for (let y = FLOOR + 3; y < 24 * S; y++) for (let x = 0; x < fw(c); x++)
    if (dither(x, y, 0.5)) c.fine(x, y, mix(f.peach, f.surface0, 0.75))
  for (const start of [8, Math.floor(fw(c) / 2), fw(c) - 30]) {
    disc(c, start + 8, FLOOR + 6, 9, 2, mix(f.sapphire, f.surface1, 0.4))
    rect(c, start + 4, FLOOR + 5, 3, 1, mix(f.sky, f.text, 0.4))
    if (weather.condition !== 'drizzle' && (tick + start) % 12 < 3) disc(c, start + 10, FLOOR + 6, 3, 1, f.sky)
  }
}

export const fineSnowGround: WeatherLayer = ({ c, f }) => {
  const snow = f.isLight ? f.base : f.text
  for (let x = 0; x < fw(c); x++) {
    const bump = Math.round(1.5 + Math.sin(x / 5) + Math.sin(x / 13))
    rect(c, x, FLOOR - bump, 1, bump + 3, snow)
    if (x % 9 < 4) c.fine(x, FLOOR + 3, mix(f.sky, f.base, 0.6))
  }
}
