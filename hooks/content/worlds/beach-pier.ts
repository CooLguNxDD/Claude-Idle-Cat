import { defineWorld } from '../types'

export default defineWorld({
  id: 'beach-pier', label: 'Beach Pier', scene: 'beach-pier',
  width: { cottage: 80, house: 160, manor: 240 },
  layers: [
    { kind: 'ocean', parallax: 0.25, tint: 'sapphire' },
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
