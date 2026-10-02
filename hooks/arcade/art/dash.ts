import { art, doublePixels } from '../../art/types'

export const DASH_ART = {
  pot: art('dash.pot', [doublePixels(['.gg.', 'gGGg', 'pppp', '.pp.'])], [0, 0], 'world'),
  tall: art('dash.tall', [doublePixels(['.g..', 'gGg.', '.gGg', '.gg.', 'pppp', 'pppp', '.pp.'])], [0, 0], 'world'),
  bird: art('dash.bird', [
    doublePixels(['o...o', '.www.', '..o..']), doublePixels(['.....', 'owwwo', '..o..']),
  ], [0, 0], 'world'),
  fish: art('dash.fish', [doublePixels(['.bb.', 'bbbb', '.bb.'])], [0, 0], 'world'),
} as const
