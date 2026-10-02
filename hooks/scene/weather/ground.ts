import { FLOOR_Y, HEIGHT } from '../canvas'
import { mix } from '../../theme'
import type { WeatherLayer } from './context'

export const wetGround: WeatherLayer = ({ c, weather, tick, f }) => {
  for (let y = FLOOR_Y; y < HEIGHT; y++) for (let x = 0; x < c.w; x++)
    c.put(x, y, mix(f.peach, f.surface0, 0.75))
  for (const start of [2, Math.floor(c.w / 2), c.w - 7]) for (let x = start; x < start + 4; x++)
    c.put(x, FLOOR_Y + 1, mix(f.sapphire, f.surface1, 0.4))
  if (weather.condition !== 'drizzle' && tick % 12 < 3) c.put(c.w - 5, FLOOR_Y + 2, f.sky)
}
export const snowGround: WeatherLayer = ({ c, f }) => {
  for (let x = 0; x < c.w; x++) {
    c.put(x, FLOOR_Y, f.isLight ? f.base : f.text)
    c.put(x, 14, f.isLight ? f.base : f.text)
    if (x % 5 < 3) c.put(x, FLOOR_Y + 1, mix(f.sky, f.base, 0.6))
  }
}
