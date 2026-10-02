import type { GameId } from '../../types'
import { DASH_ART } from '../arcade/art/dash'
import { CATCH_ART } from '../arcade/art/catch'
import { LASER_ART } from '../arcade/art/laser'
import { WHACK_ART } from '../arcade/art/whack'
import { TANK_ART } from '../arcade/art/tank'
import { LANES_ART } from '../arcade/art/lanes'
import { CAT_ART } from './cats'
import { FURNITURE_ART } from './furniture'
import { COLOR_TOKENS } from '../theme'
import { WEATHER_ART, WEATHER_PALETTES } from './weather'
import { SHELTER_ART } from './shelter'
import type { PixelArt } from './types'

export const DRAW_ORDER = ['back', 'world', 'actor', 'front', 'effect'] as const satisfies readonly PixelArt['layer'][]

export const GAME_ART = {
  dash: DASH_ART, catch: CATCH_ART, laser: LASER_ART,
  whack: WHACK_ART, tank: TANK_ART, lanes: LANES_ART,
} as const satisfies Record<GameId, Record<string, PixelArt>>

export const ART = { cats: CAT_ART, furniture: FURNITURE_ART, games: GAME_ART,
  shelter: SHELTER_ART,
  weather: WEATHER_ART, weatherPalettes: WEATHER_PALETTES, colorTokens: COLOR_TOKENS, drawOrder: DRAW_ORDER } as const
