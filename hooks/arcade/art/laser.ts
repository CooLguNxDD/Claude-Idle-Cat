import { art } from '../../art/types'

export const LASER_ART = {
  dot: art('laser.dot', [[
    '..r..', '.rRr.', 'rRRRr', '.rRr.', '..r..',
  ]], [2, 2], 'effect'),
  reticle: art('laser.reticle', [[
    '..l..', '.....', 'l...l', '.....', '..l..',
  ]], [2, 2], 'front'),
} as const
