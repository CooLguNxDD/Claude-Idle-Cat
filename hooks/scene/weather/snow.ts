import { WEATHER_ART } from '../../art/weather'
import { FLOOR_Y } from '../canvas'
import { drift, paint, wrap } from './context'
import type { WeatherLayer } from './context'

export const snow: WeatherLayer = ({ c, weather, tick, f }) => {
  const col = f.isLight ? f.base : f.text
  for (let i = 0; i < 11; i++) {
    const x = wrap(i * 7 + (tick >> 3) * drift(weather), c.w)
    const y = (i * 5 + (tick >> 2)) % (FLOOR_Y + 1)
    if (i === 1 && c.w > 40) paint(c, WEATHER_ART.flake, x, y, col)
    else c.put(x, y, col)
  }
}
