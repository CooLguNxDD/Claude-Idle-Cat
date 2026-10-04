import { defineWorld } from '../types'

// The stray's yard: the cardboard-box corner first, then the tower, tunnel and pipeline it builds as the house grows.
export default defineWorld({
  id: 'backyard', label: 'Backyard',
  width: { cottage: 80, house: 160, manor: 240 },
  layers: [
    { kind: 'hills', parallax: 0.3, tint: { mix: ['green', 'surface1', 0.55] } },
    { kind: 'trees', parallax: 0.6, tint: { mix: ['green', 'crust', 0.35] } },
  ],
  slots: { bed: 0, rug: 5, plant: 26, toy: 36, bowl: 60, hanging: 46 },
  landmarks: [
    { kind: 'window', x: 72, tier: 1 },
    { kind: 'shelf', x: 106, tier: 1 },
    { kind: 'tower', x: 92, tier: 1 },
    { kind: 'tunnel', x: 124, tier: 1 },
    { kind: 'pipe', x: 190, tier: 2 },
  ],
  perches: [26, 33, 40, 47, 54, 61],
})
