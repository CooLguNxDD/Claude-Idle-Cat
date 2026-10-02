import { art, doublePixels } from '../../art/types'

export const CATCH_ART = {
  fish: art('catch.fish', [doublePixels(['.bb..b', 'bbbbbb', '.bb..b'])], [0, 0], 'world'),
  gold: art('catch.gold', [doublePixels(['.yy..y', 'yyyyyy', '.yy..y'])], [0, 0], 'world'),
  boot: art('catch.boot', [doublePixels(['.kk.', '.kk.', 'kkkk'])], [0, 0], 'world'),
  cucumber: art('catch.cucumber', [doublePixels(['.g', 'gg', 'gG', 'gg', 'g.'])], [0, 0], 'world'),
  bowl: art('catch.bowl', [doublePixels(['llllllllll', '.bbbbbbbb.', '..bbbbbb..'])], [0, 0], 'front'),
} as const
