import { WEATHER_ART, WEATHER_PALETTES } from '../../art/weather'
import { mix } from '../../theme'
import type { Flavor } from '../../theme'
import type { WeatherReading } from '../../../types'
import { drift, paint, wrap } from './context'
import type { WeatherLayer } from './context'

export const skyColors = (weather: WeatherReading, f: Flavor): [number, number] => {
  const p = WEATHER_PALETTES[weather.condition]
  return weather.isDay ? [f[p.top], mix(f[p.low], f.sky, 0.3)]
    : [mix(f[p.top], f.crust, 0.8), mix(f[p.low], f.surface0, 0.8)]
}
export const clouds: WeatherLayer = ({ c, weather, tick, f }) => {
  if (weather.condition === 'clear') return
  const partly = weather.condition === 'partly-cloudy'
  const asset = partly ? WEATHER_ART.cloud : WEATHER_ART.bank
  const col = mix(f[WEATHER_PALETTES[weather.condition].cloud], weather.isDay ? f.sky : f.crust, partly ? 0.3 : 0.4)
  const count = partly ? 2 : 4
  for (let i = 0; i < count; i++) {
    const x = wrap(i * 17 + drift(weather) * (tick >> (weather.windKph > 25 ? 3 : 5)), c.w + asset.width) - asset.width
    paint(c, asset, x, 2 + i % 2 * 3, col)
  }
  if (weather.condition === 'storm' && tick % 120 === 12)
    paint(c, WEATHER_ART.bolt, Math.floor(c.w * 0.65), 5, mix(f.yellow, f.rosewater, 0.5))
}
