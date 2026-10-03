import { art } from './types'
import type { Genes } from '../../types'

const PANE_ROWS = [
  '.o..........o.', '.oo........oo.', '.ofo......ofo.', '.offoooooooffo',
  '.offdffffdfffo', '.offEffffEffo.', '.opfffnnfffpo.', '..offffffffo..',
  '..ofwwwwwwfo..', '.ofwwwwwwwwfo.', '.ofwwwwwwwwfo.', '.offwwwwwwffo.',
  '..oooooooooo..',
]

// Shared poses use semantic fur letters, so every coat and eye color remains dynamic.
export const CAT_ART = {
  pane: art('cat.pane', [PANE_ROWS], [0, 0], 'actor'),
  fluffy: art('cat.fluffy', [PANE_ROWS.map((row, y) => y >= 7 && y <= 11
    ? (y % 2 ? 'o' : '.') + 'f' + row.slice(2, 12) + 'f' + (y % 2 ? 'o' : '.') : row)], [0, 0], 'actor'),
  fold: art('cat.fold', [PANE_ROWS.map((row, y) => y === 0 ? '..............'
    : y === 1 ? '..............' : y === 2 ? '.oooo....oooo.' : row)], [0, 0], 'actor'),
  mini: art('cat.mini', [[
    'o...o.', 'fffff.', 'fEfEf.', 'fwwwff', 'fwwwf.',
  ]], [0, 0], 'actor'),
  run: art('cat.run', [
    [
      '...........oo..oo.', '...........offooffo', '..ooo......offfffo.',
      '.offoo..ooofffffEo', '..offoooooffdffffn', '...offfffffffffff.',
      '....offfffdfffwww.', '....ofwwwwwwwwww..', '.....ooooooooooo..',
      '.....oo..oo..oo...', '....oo...oo...oo..',
    ],
    [
      '...........oo..oo.', '...........offooffo', '.ooo.......offfffEo',
      '.offoo..oooffffffn', '..offoooooffdffff.', '...offfffffffffff.',
      '....offfffdfffwww.', '....ofwwwwwwwwww..', '.....ooooooooooo..',
      '......oo..oo......', '.....oo....oo.....',
    ],
  ], [0, 0], 'actor'),
  duck: art('cat.duck', [[
    '.............oo..oo', '..oooo......offooff', '.offffoooooooffffEo',
    '..offffffffffffffn', '...offdffffdffwww.', '....ofwwwwwwwww...',
    '.....oooooooooo...', '......oo....oo.....',
  ]], [0, 0], 'actor'),
  front: art('cat.front', [[
    'oo........oo', 'offo......offo', 'offfoooooofffo', 'offffffffffffo',
    'offEffffEfffo', 'offfffnnffffo', '.ofwwwwwwfo.', '.ofwwwwwwfo.',
    '..ofwwwwfo..', '...oooooo...', '...oo..oo...',
  ]], [0, 0], 'actor'),
} as const

export const paneArtOf = (genes: Genes) => genes.silhouette === 'fluffy' ? CAT_ART.fluffy
  : genes.silhouette === 'fold' ? CAT_ART.fold : CAT_ART.pane

// Pose offsets preserve semantic fur pixels in the terminal renderer.
export const posePixel = (x: number, y: number, kind: import('../content/types').PoseKind, phase: number): readonly [number, number] => {
  if (kind === 'knead' && y >= 10) return [x, y - (x < 7 ? phase < 0.5 ? 1 : 0 : phase >= 0.5 ? 1 : 0)]
  if (kind === 'spin') return [x + Math.round(Math.sin(phase * Math.PI * 2)), y]
  if (kind === 'arch' && y >= 7 && y <= 10) return [x, y - 2]
  return [x, y]
}
