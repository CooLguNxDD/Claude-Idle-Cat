import type { Home } from '../types'
import type { Flavor } from './theme'
import { ROWS, canvas, sceneCols } from './scene/canvas'
import type { RgbaImage, SceneCanvas } from './scene/canvas'
import { drawCats } from './scene/cats'
import { drawDecor } from './scene/decor'
import { drawEffects } from './scene/effects'
import { drawYard } from './scene/yard'
import { drawSeason } from './scene/season'
import { drawWeatherLayer } from './scene/weather'
import { liveWeather } from './weather/state'
import { inkOf } from './theme'

export { ROWS, sceneCols }
export type { RgbaImage }
export type SceneInput = { home: Home; now: number; tick: number; hour: number; flavor: Flavor; cols: number }

// The terminal stays 12 half-block rows; each renderer contributes one scene layer.
export const drawScene = ({ home, now, tick, hour, flavor, cols }: SceneInput): SceneCanvas => {
  const c = canvas(cols)
  const weather = liveWeather(home.weather, now)
  const localHour = weather ? new Date(now + weather.utcOffset * 1000).getUTCHours() : hour
  const yard = drawYard(c, now, localHour, tick, flavor, weather)
  if (weather) drawWeatherLayer({ c, weather, tick, f: flavor }, 'ground')
  drawDecor(c, home, now, tick, flavor, yard)
  const cat = drawCats(c, home, now, tick, flavor)
  drawSeason(c, yard, tick, flavor, weather)
  if (weather) drawWeatherLayer({ c, weather, tick, f: flavor }, 'front')
  drawEffects(c, home, now, tick, flavor, cat)
  return c
}

export const frameCells = (input: SceneInput): string => drawScene(input).pack()
export const frameImage = (input: SceneInput): RgbaImage => drawScene(input).image(inkOf(input.flavor))
