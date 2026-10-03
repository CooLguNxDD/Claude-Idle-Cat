import { defineWorld } from '../types'

export default defineWorld({
  id: 'space-station', label: 'Space Station', scene: 'space-station',
  width: { cottage: 80, house: 160, manor: 240 },
  layers: [
    { kind: 'station-windows', parallax: 0.2, tint: 'overlay1' },
  ],
  slots: { bed: 0, rug: 5, plant: 26, toy: 36, bowl: 60, hanging: 46 },
  landmarks: [
    { kind: 'tower', x: 92, tier: 1 },
    { kind: 'tunnel', x: 124, tier: 1 },
    { kind: 'pipe', x: 190, tier: 2 },
  ],
  perches: [26, 33, 40, 47, 54, 61],
})
