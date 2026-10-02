import type { WeatherCondition } from '../../types'
import type { ColorName } from '../theme'
import { art } from './types'

export const WEATHER_ART = {
  cloud: art('weather.cloud', [['..cccc..', '.cccccc.', 'cccccccc']], [0, 0], 'back'),
  bank: art('weather.bank', [['...ccc....cccc...', '..cccccc.ccccccc.', '.ccccccccccccccc.', 'ccccccccccccccccc']], [0, 0], 'back'),
  bolt: art('weather.bolt', [['...b.', '..b..', '.bb..', '..b..', '.b...', 'bb...', '.b...', 'b....']], [0, 0], 'back'),
  flake: art('weather.flake', [['.s.', 'sss', '.s.']], [0, 0], 'front'),
  leaf: art('weather.leaf', [['.ll', 'll.']], [0, 0], 'front'),
} as const
export const WEATHER_PALETTES: Record<WeatherCondition, { top: ColorName; low: ColorName; cloud: ColorName }> = {
  clear: { top: 'sapphire', low: 'sky', cloud: 'base' },
  'partly-cloudy': { top: 'sapphire', low: 'sky', cloud: 'text' },
  cloudy: { top: 'overlay0', low: 'surface2', cloud: 'overlay1' },
  fog: { top: 'surface2', low: 'overlay1', cloud: 'subtext0' },
  drizzle: { top: 'surface1', low: 'sapphire', cloud: 'overlay0' },
  rain: { top: 'surface1', low: 'blue', cloud: 'overlay0' },
  snow: { top: 'surface2', low: 'sky', cloud: 'subtext0' },
  storm: { top: 'crust', low: 'surface1', cloud: 'surface2' },
}
