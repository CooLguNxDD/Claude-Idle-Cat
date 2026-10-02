import { art, doublePixels } from '../../art/types'

export const TANK_ART = {
  fry: art('tank.fry', [doublePixels(['.aa', 'aaa'])], [0, 0], 'actor'),
  fish: art('tank.fish', [doublePixels(['.aa..a', 'aaaaaa', '.aa..a'])], [0, 0], 'actor'),
  gold: art('tank.gold', [doublePixels(['..yy...', '.yyyy.y', 'yyEyyyy', '.yyyy.y'])], [0, 0], 'actor'),
  crow: art('tank.crow', [doublePixels(['.kk....', 'kEkkk.k', '.kkkkkk', '..k.k..'])], [0, 0], 'front'),
} as const
