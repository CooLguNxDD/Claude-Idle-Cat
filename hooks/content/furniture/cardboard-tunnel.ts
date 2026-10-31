import { defineFurniture } from '../types'

export default defineFurniture({
  id: 'cardboard-tunnel', name: 'Cardboard tunnel', slot: 'rug', price: 0, cost: { coins: 240, materials: { feather: 3 } },
  perk: 'joy fades 15% slower', mods: { joyDecay: 0.85 }, bait: 3, likes: 'playful',
  art: { rows: ['.pppppppppp.', 'pdd......ddp', 'pd........dp', 'pppppppppppp'], colors: { p: 'peach', d: 'maroon' } },
})
