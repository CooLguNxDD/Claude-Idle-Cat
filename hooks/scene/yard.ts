import { festivalOf, seasonOf } from '../calendar'
import { dayPartOf, mix } from '../theme'
import type { Flavor } from '../theme'
import { FLOOR_Y, HEIGHT } from './canvas'
import type { SceneCanvas } from './canvas'
import type { WeatherReading } from '../../types'
import { skyColors } from './weather/sky'
import { drawWeatherLayer } from './weather'
import { fineYardGround, fineYardSky } from './fine/yard'

export type YardState = { season: ReturnType<typeof seasonOf>; festival: ReturnType<typeof festivalOf>; isNight: boolean }
const STARS: [number, number][] = [[2, 1], [7, 4], [12, 2], [19, 1], [24, 5], [4, 7], [16, 6], [38, 2], [45, 5], [51, 1]]

export const drawYard = (c: SceneCanvas, now: number, hour: number, tick: number, f: Flavor, weather: WeatherReading | null = null): YardState => {
  const part = dayPartOf(hour)
  const isNight = weather ? !weather.isDay : part === 'night'
  const isDusk = !isNight && part === 'dusk'
  const [top, low] = weather ? skyColors(weather, f) : isNight ? [f.crust, f.surface0] : isDusk ? [f.mauve, f.peach]
    : [f.sapphire, mix(f.sky, f.isLight ? f.base : f.text, 0.45)]
  const isVisible = !weather || weather.condition === 'clear' || weather.condition === 'partly-cloudy'
  const month = new Date(now).getMonth() + 1
  const season = seasonOf(month)
  const festival = festivalOf(month)
  if (c.isFine) {
    const fine = { top, low, isNight, isDusk, isSunVisible: isVisible, hasClouds: !weather && isVisible && !isNight,
      isWinter: (season === 'winter' && !weather) || weather?.condition === 'snow', hasLights: festival === 'lights' }
    fineYardSky(c, fine, tick, f)
    if (weather) drawWeatherLayer({ c, weather, tick, f }, 'sky')
    fineYardGround(c, fine, tick, f)
    return { season, festival, isNight }
  }
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < c.w; x++) c.put(x, y, mix(top, low, y / 20))
  const sx = c.w - 5
  if (isNight && isVisible) {
    STARS.forEach(([x, y], i) => x < c.w - 6 && c.put(x, y, (tick + i * 3) % 12 < 2 ? f.overlay0 : f.text))
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] as const)
      c.put(sx + dx, 1 + dy, f.rosewater)
  } else if (isVisible) {
    const sun = isDusk ? f.peach : f.yellow
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) c.put(sx + dx, 1 + dy + (isDusk ? 2 : 0), sun)
    // Two drifting cloud layers stay above the cats and furniture.
    for (const x0 of weather ? [] : [3 + (tick >> 4) % 5, c.w - 20 - (tick >> 5) % 4])
      for (const [dx, dy] of [[0, 1], [1, 0], [2, 0], [3, 1]] as const)
        c.put(x0 + dx, 3 + dy, mix(f.base, f.sky, 0.3))
  }
  if (weather) drawWeatherLayer({ c, weather, tick, f }, 'sky')
  const wood = mix(f.peach, f.surface2, 0.55)
  for (let x = 0; x < c.w; x++) {
    for (const y of [15, 18]) c.put(x, y, wood)
    if (x % 6 === 0) for (let y = 14; y < FLOOR_Y; y++) c.put(x, y, mix(wood, f.crust, 0.25))
  }
  for (let y = FLOOR_Y; y < HEIGHT; y++) for (let x = 0; x < c.w; x++)
    c.put(x, y, (x + y * 3) % 7 === 0 ? mix(f.peach, f.crust, 0.6) : mix(f.peach, f.crust, 0.4))
  if (season === 'winter' && !weather) for (let x = 0; x < c.w; x++) {
    c.put(x, FLOOR_Y, f.isLight ? f.base : f.text)
    c.put(x, 14, f.isLight ? f.base : f.text)
  }
  if (festival === 'lights') for (let x = 1; x < c.w; x += 3)
    c.put(x, 14, [f.red, f.green, f.yellow, f.blue][(x + (tick >> 2)) % 4] ?? f.red)
  return { season, festival, isNight }
}
