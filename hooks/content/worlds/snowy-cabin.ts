import { defineWorld } from '../types'

export default defineWorld({
  id: 'snowy-cabin', label: 'Snowy Cabin', scene: 'snowy-cabin',
  width: { cottage: 80, house: 160, manor: 240 },
  layers: [
    { kind: 'cabins', parallax: 0.35, tint: { mix: ['green', 'surface1', 0.4] } },
  ],
  slots: { bed: 0, rug: 5, plant: 26, toy: 36, bowl: 60, hanging: 46 },
  landmarks: [
    { kind: 'tower', x: 92, tier: 1 },
    { kind: 'tunnel', x: 124, tier: 1 },
    { kind: 'pipe', x: 190, tier: 2 },
  ],
  perches: [26, 33, 40, 47, 54, 61],
})
