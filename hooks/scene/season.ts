import type { Flavor } from '../theme'
import type { YardState } from './yard'
import { FLOOR_Y } from './canvas'
import type { SceneCanvas } from './canvas'
import type { WeatherReading } from '../../types'

export const drawSeason = (c: SceneCanvas, yard: YardState, tick: number, f: Flavor, weather: WeatherReading | null = null) => {
  if (weather && !['clear', 'partly-cloudy', 'cloudy'].includes(weather.condition)) return
  for (let i = 0; i < 9; i++) {
    const x = (i * 7 + (tick >> 2) * (yard.season === 'autumn' ? 1 : 0) + (tick >> 3)) % c.w
    const y = (i * 5 + (tick >> 1)) % (FLOOR_Y + 1)
    if (yard.season === 'winter' && !weather) c.put(x, y, f.isLight ? f.base : f.text)
    if (yard.season === 'spring' && i % 2 === 0) c.put((x + (tick >> 1)) % c.w, y, f.pink)
    if (yard.season === 'autumn' && i % 2 === 1) c.put(x, y, i % 3 ? f.peach : f.red)
    if (yard.season === 'summer' && yard.isNight && (tick + i * 5) % 14 < 7)
      c.put((x * 3) % c.w, 4 + ((y + i) % 12), f.yellow)
  }
}
