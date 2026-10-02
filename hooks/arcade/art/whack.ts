import { art, doublePixels } from '../../art/types'

export const WHACK_ART = {
  mouse: art('whack.mouse', [doublePixels(['m...m', 'mmmmm', 'mEmEm', 'mmpmm', '.mmm.'])], [0, 0], 'actor'),
  gold: art('whack.gold', [doublePixels(['y...y', 'yyyyy', 'yEyEy', 'yypyy', '.yyy.'])], [0, 0], 'actor'),
  slipper: art('whack.slipper', [doublePixels(['.sss.', 'sSSSs', 'sSSSs', 'sssss', '.....'])], [0, 0], 'actor'),
  paw: art('whack.paw', [doublePixels(['.f.f.', 'fffff', 'fwwwf', '.fff.'])], [0, 0], 'front'),
} as const
