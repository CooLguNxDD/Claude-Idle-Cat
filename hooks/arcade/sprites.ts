// Shared arcade sprites; the cat is painted in the active cat's own coat.
import type { Genes } from '../../types'
import { coatPixel } from '../genes'
import { inkOf } from '../theme'
import type { Flavor } from '../theme'
import type { Paint } from './engine'

// Side view, facing right, 11x7: o outline, f/d fur, w belly, E eye, n nose.
export const CAT_RUN = [
  [
    '.......o.o.',
    'o......ofo.',
    '.o.offffEfn',
    '..offdffff.',
    '..offfdfwf.',
    '..owwwwwo..',
    '..o.o..o.o.',
  ],
  [
    '.......o.o.',
    '.......ofo.',
    'oo.offffEfn',
    '..offdffff.',
    '..offfdfwf.',
    '..owwwwwo..',
    '...oo..oo..',
  ],
] as const
export const CAT_DUCK = [
  '.........o.o',
  'oo.offfffofE',
  '..offdffdfwn',
  '..o.o...o.o.',
] as const
// Front view for top-down games, 7x6.
export const CAT_FRONT = [
  'o.....o',
  'oo...oo',
  'ofEfEfo',
  'offnffo',
  'owwwwwo',
  '.ooooo.',
] as const

export const catPaint = (genes: Genes, f: Flavor): Paint => (ch, x, y) =>
  ch === 'o' ? inkOf(f) : ch === 'n' ? f.pink : coatPixel(genes, f, ch, x, y)

// Fixed palettes: each char maps to a flavor color.
export const paletteOf = (f: Flavor, map: Record<string, number>): Paint => ch => map[ch] ?? (ch === 'o' ? inkOf(f) : undefined)
