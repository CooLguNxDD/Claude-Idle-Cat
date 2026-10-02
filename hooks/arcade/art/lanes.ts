import { art, doublePixels } from '../../art/types'

export const LANES_ART = {
  yarn: art('lanes.yarn', [doublePixels(['o...o', 'fEfEf', 'fffff', 'fwwwf', '.f.f.'])], [0, 0], 'actor'),
  nap: art('lanes.nap', [doublePixels(['......', '.ffff.', 'fffffo', 'ffffff'])], [0, 0], 'actor'),
  box: art('lanes.box', [doublePixels(['bbbbb', 'bBBBb', 'bbbbb', 'bbbbb'])], [0, 0], 'actor'),
  mouse: art('lanes.mouse', [doublePixels(['.mm..', 'mmmmm', '.m.mt'])], [0, 0], 'actor'),
  rat: art('lanes.rat', [doublePixels(['.rr...', 'rrrrr.', 'rrrrrr', '.r..rt'])], [0, 0], 'actor'),
  ball: art('lanes.ball', [doublePixels(['yy', 'yy'])], [0, 0], 'effect'),
  nip: art('lanes.nip', [doublePixels(['.g.', 'ggg', '.g.'])], [0, 0], 'effect'),
} as const
