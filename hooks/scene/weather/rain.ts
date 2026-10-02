import { FLOOR_Y } from '../canvas'
import { mix } from '../../theme'
import { drift, wrap } from './context'
import type { WeatherLayer } from './context'

export const rain: WeatherLayer = ({ c, weather, tick, f }) => {
  const light = weather.condition === 'drizzle'
  const count = light ? 7 : weather.condition === 'storm' ? 18 : 13
  const col = mix(f.sky, f.surface1, light ? 0.45 : 0.2)
  const dx = weather.windKph > 15 ? drift(weather) : 0
  for (let i = 0; i < count; i++) {
    const x = wrap(i * 13 + (tick >> 1) * dx, c.w)
    const y = 5 + (i * 7 + tick * (light ? 1 : 2)) % (FLOOR_Y - 3)
    c.put(x, y, col)
    if (!light && y < FLOOR_Y - 1) c.put(wrap(x - dx, c.w), y + 1, col)
  }
  for (let i = 0; i < 3; i++) {
    const x = wrap(i * 19 + (tick >> 3), c.w)
    if ((tick + i * 3) % 8 < 2) {
      c.put(x, FLOOR_Y + 1, f.sapphire)
      c.put(wrap(x + 2, c.w), FLOOR_Y + 1, f.sapphire)
    }
  }
}
