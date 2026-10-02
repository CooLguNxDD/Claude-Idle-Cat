import { WEATHER_ART } from '../../art/weather'
import { mix } from '../../theme'
import { drift, paint, wrap } from './context'
import type { WeatherLayer } from './context'

export const wind: WeatherLayer = ({ c, weather, tick, f }) => {
  if (weather.windKph < 20) return
  for (let i = 0; i < 3; i++) {
    const x = wrap(i * 19 + (tick >> 1) * drift(weather), c.w)
    const y = 8 + (i * 5 + (tick >> 4)) % 13
    if (weather.condition === 'clear' || weather.condition === 'partly-cloudy')
      paint(c, WEATHER_ART.leaf, x, y, mix(f.green, f.peach, 0.5))
    else for (let dx = 0; dx < 3; dx++) c.put(wrap(x + dx, c.w), y, mix(f.sky, f.surface1, 0.6))
  }
}
