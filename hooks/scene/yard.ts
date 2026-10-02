import { festivalOf, seasonOf } from '../calendar'
import { dayPartOf, mix } from '../theme'
import type { Flavor } from '../theme'
import { FLOOR_Y, HEIGHT } from './canvas'
import type { SceneCanvas } from './canvas'

export type YardState = { season: ReturnType<typeof seasonOf>; festival: ReturnType<typeof festivalOf>; isNight: boolean }
const STARS: [number, number][] = [[2, 1], [7, 4], [12, 2], [19, 1], [24, 5], [4, 7], [16, 6], [38, 2], [45, 5], [51, 1]]

export const drawYard = (c: SceneCanvas, now: number, hour: number, tick: number, f: Flavor): YardState => {
  const part = dayPartOf(hour)
  const isNight = part === 'night'
  const isDusk = part === 'dusk'
  const [top, low] = isNight ? [f.crust, f.surface0] : isDusk ? [f.mauve, f.peach]
    : [f.sapphire, mix(f.sky, f.isLight ? f.base : f.text, 0.45)]
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < c.w; x++) c.put(x, y, mix(top, low, y / 20))
  const sx = c.w - 5
  if (isNight) {
    STARS.forEach(([x, y], i) => x < c.w - 6 && c.put(x, y, (tick + i * 3) % 12 < 2 ? f.overlay0 : f.text))
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] as const)
      c.put(sx + dx, 1 + dy, f.rosewater)
  } else {
    const sun = isDusk ? f.peach : f.yellow
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) c.put(sx + dx, 1 + dy + (isDusk ? 2 : 0), sun)
    // Two drifting cloud layers stay above the cats and furniture.
    for (const x0 of [3 + (tick >> 4) % 5, c.w - 20 - (tick >> 5) % 4])
      for (const [dx, dy] of [[0, 1], [1, 0], [2, 0], [3, 1]] as const)
        c.put(x0 + dx, 3 + dy, mix(f.base, f.sky, 0.3))
  }
  const wood = mix(f.peach, f.surface2, 0.55)
  for (let x = 0; x < c.w; x++) {
    for (const y of [15, 18]) c.put(x, y, wood)
    if (x % 6 === 0) for (let y = 14; y < FLOOR_Y; y++) c.put(x, y, mix(wood, f.crust, 0.25))
  }
  for (let y = FLOOR_Y; y < HEIGHT; y++) for (let x = 0; x < c.w; x++)
    c.put(x, y, (x + y * 3) % 7 === 0 ? mix(f.peach, f.crust, 0.6) : mix(f.peach, f.crust, 0.4))
  const month = new Date(now).getMonth() + 1
  const season = seasonOf(month)
  const festival = festivalOf(month)
  if (season === 'winter') for (let x = 0; x < c.w; x++) {
    c.put(x, FLOOR_Y, f.isLight ? f.base : f.text)
    c.put(x, 14, f.isLight ? f.base : f.text)
  }
  if (festival === 'lights') for (let x = 1; x < c.w; x += 3)
    c.put(x, 14, [f.red, f.green, f.yellow, f.blue][(x + (tick >> 2)) % 4] ?? f.red)
  return { season, festival, isNight }
}

export const drawWeather = (c: SceneCanvas, yard: YardState, tick: number, f: Flavor) => {
  const snow = f.isLight ? f.base : f.text
  for (let i = 0; i < 9; i++) {
    const x = (i * 7 + (tick >> 2) * (yard.season === 'autumn' ? 1 : 0) + (tick >> 3)) % c.w
    const y = (i * 5 + (tick >> 1)) % (FLOOR_Y + 1)
    if (yard.season === 'winter') c.put(x, y, snow)
    if (yard.season === 'spring' && i % 2 === 0) c.put((x + (tick >> 1)) % c.w, y, f.pink)
    if (yard.season === 'autumn' && i % 2 === 1) c.put(x, y, i % 3 ? f.peach : f.red)
    if (yard.season === 'summer' && yard.isNight && (tick + i * 5) % 14 < 7)
      c.put((x * 3) % c.w, 4 + ((y + i) % 12), f.yellow)
  }
}
