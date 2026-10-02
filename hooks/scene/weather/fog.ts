import { mix } from '../../theme'
import type { WeatherLayer } from './context'
import { wrap } from './context'

export const fog: WeatherLayer = ({ c, weather, tick, f }) => {
  const col = mix(f.overlay1, weather.isDay ? f.sky : f.surface0, 0.5)
  for (const y of [9, 12]) for (let x = 0; x < c.w; x++)
    if (wrap(x + (tick >> 4) + y, 17) < 11) c.put(x, y, col)
}
