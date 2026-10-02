import type { WeatherCondition } from '../../../types'
import type { WeatherLayer, WeatherScene } from './context'
import { clouds } from './sky'
import { fog } from './fog'
import { rain } from './rain'
import { snow } from './snow'
import { wind } from './wind'
import { snowGround, wetGround } from './ground'

type Layers = { sky?: WeatherLayer; ground?: WeatherLayer; front?: WeatherLayer }
export const WEATHER_SCENES: Record<WeatherCondition, Layers> = {
  clear: {}, 'partly-cloudy': { sky: clouds }, cloudy: { sky: clouds },
  fog: { sky: scene => { clouds(scene); fog(scene) } },
  drizzle: { sky: clouds, ground: wetGround, front: rain },
  rain: { sky: clouds, ground: wetGround, front: rain },
  snow: { sky: clouds, ground: snowGround, front: snow },
  storm: { sky: clouds, ground: wetGround, front: rain },
}
export const drawWeatherLayer = (scene: WeatherScene, layer: keyof Layers) => {
  WEATHER_SCENES[scene.weather.condition][layer]?.(scene)
  if (layer === 'front') wind(scene)
}
