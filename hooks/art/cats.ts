import { art } from './types'

// Shared poses use semantic fur letters, so every coat and eye color remains dynamic.
export const CAT_ART = {
  pane: art('cat.pane', [[
    '.o..........o.', '.oo........oo.', '.ofo......ofo.', '.offoooooooffo',
    '.offdffffdfffo', '.offEffffEffo.', '.opfffnnfffpo.', '..offffffffo..',
    '..ofwwwwwwfo..', '.ofwwwwwwwwfo.', '.ofwwwwwwwwfo.', '.offwwwwwwffo.',
    '..oooooooooo..',
  ]], [0, 0], 'actor'),
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
