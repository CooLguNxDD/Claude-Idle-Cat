import type { WeatherCondition } from '../../../types'
import type { WeatherLayer, WeatherScene } from './context'
import { clouds } from './sky'
import { fog } from './fog'
import { rain } from './rain'
import { snow } from './snow'
import { wind } from './wind'
import { snowGround, wetGround } from './ground'
import { fineClouds, fineFog, fineRain, fineSnow, fineSnowGround, fineWetGround, fineWind } from '../fine/weather'

const fogSky: WeatherLayer = scene => { clouds(scene); fog(scene) }
const fineFogSky: WeatherLayer = scene => { fineClouds(scene); fineFog(scene) }

type Layers = { sky?: WeatherLayer; ground?: WeatherLayer; front?: WeatherLayer }
export const WEATHER_SCENES: Record<WeatherCondition, Layers> = {
  clear: {}, 'partly-cloudy': { sky: clouds }, cloudy: { sky: clouds },
  fog: { sky: fogSky },
  drizzle: { sky: clouds, ground: wetGround, front: rain },
  rain: { sky: clouds, ground: wetGround, front: rain },
  snow: { sky: clouds, ground: snowGround, front: snow },
  storm: { sky: clouds, ground: wetGround, front: rain },
}
// The picture canvas swaps each coarse layer for its 4x counterpart.
const FINE = new Map<WeatherLayer, WeatherLayer>([[clouds, fineClouds], [fogSky, fineFogSky], [rain, fineRain], [snow, fineSnow],
  [wind, fineWind], [wetGround, fineWetGround], [snowGround, fineSnowGround]])

export const drawWeatherLayer = (scene: WeatherScene, layer: keyof Layers) => {
  const pick = (l: WeatherLayer | undefined) => (l && scene.c.isFine ? FINE.get(l) ?? l : l)
  pick(WEATHER_SCENES[scene.weather.condition][layer])?.(scene)
  if (layer === 'front') pick(wind)?.(scene)
}
