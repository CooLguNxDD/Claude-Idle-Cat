import { defineWorld } from '../types'

// A city stray's turf: chimneys far off, a pipe to nap on and a tower on the highest roof.
export default defineWorld({
  id: 'rooftops', label: 'Rooftops',
  width: { cottage: 72, house: 144, manor: 216 },
  layers: [
    { kind: 'rooftops', parallax: 0.25, tint: { mix: ['overlay0', 'crust', 0.45] } },
    { kind: 'rooftops', parallax: 0.55, tint: { mix: ['surface2', 'peach', 0.2] } },
  ],
  slots: { bed: 0, rug: 5, plant: 24, toy: 34, hanging: 44, bowl: 54 },
  landmarks: [
    { kind: 'window', x: 72, tier: 1 },
    { kind: 'shelf', x: 144, tier: 2 },
    { kind: 'pipe', x: 88, tier: 1 },
    { kind: 'tunnel', x: 116, tier: 1 },
    { kind: 'tower', x: 170, tier: 2 },
  ],
  perches: [24, 31, 38, 45, 52],
})
