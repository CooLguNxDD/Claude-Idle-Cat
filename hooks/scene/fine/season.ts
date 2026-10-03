import type { Flavor } from '../../theme'
import type { YardState } from '../yard'
import { FLOOR, wrapF } from './draw'
import type { Pen } from './draw'

/** Seasonal particles: snowflakes, petals, falling leaves and fireflies. */
export const fineSeason = (p: Pen, yard: YardState, tick: number, f: Flavor, hasWeather: boolean) => {
  for (let i = 0; i < 14; i++) {
    const sway = Math.round(Math.sin((tick + i * 11) / 5) * 3)
    const x = wrapF(i * 29 + (tick >> 1) + sway, p.W)
    const y = (i * 19 + tick) % FLOOR
    if (yard.season === 'winter' && !hasWeather) p.dot(x, y, f.isLight ? f.base : f.text)
    if (yard.season === 'spring' && i % 2 === 0) {
      p.rect(x, y, 2, 1, f.pink)
      p.dot(x + 1, y + 1, f.flamingo)
    }
    if (yard.season === 'autumn' && i % 2 === 1) {
      const leaf = i % 3 ? f.peach : f.red
      const isFlipped = (tick + i) % 6 < 3
      p.rect(x, y, 2, 2, leaf)
      p.dot(isFlipped ? x + 2 : x - 1, y + (isFlipped ? 0 : 1), leaf)
    }
    if (yard.season === 'summer' && yard.isNight && (tick + i * 5) % 14 < 7) {
      const fx = wrapF(i * 43 + Math.round(Math.sin((tick + i) / 7) * 6), p.W)
      const fy = 16 + ((i * 13 + (tick >> 2)) % 52)
      p.disc(fx + 0.5, fy + 0.5, 2.2, 2.2, (dx, dy) => ((dx + dy) & 1 ? f.yellow : undefined))
      p.dot(fx, fy, f.yellow)
    }
  }
}
