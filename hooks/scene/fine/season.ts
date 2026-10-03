import type { Flavor } from '../../theme'
import type { SceneCanvas } from '../canvas'
import type { YardState } from '../yard'
import { FLOOR, disc, fw, rect, wrapF } from './draw'

/** Seasonal particles at 4x: snowflakes, petals, falling leaves and fireflies. */
export const fineSeason = (c: SceneCanvas, yard: YardState, tick: number, f: Flavor, hasWeather: boolean) => {
  for (let i = 0; i < 14; i++) {
    const sway = Math.round(Math.sin((tick + i * 11) / 5) * 3)
    const x = wrapF(i * 29 + (tick >> 1) + sway, fw(c))
    const y = (i * 19 + tick) % FLOOR
    if (yard.season === 'winter' && !hasWeather) c.fine(x, y, f.isLight ? f.base : f.text)
    if (yard.season === 'spring' && i % 2 === 0) {
      rect(c, x, y, 2, 1, f.pink)
      c.fine(x + 1, y + 1, f.flamingo)
    }
    if (yard.season === 'autumn' && i % 2 === 1) {
      const leaf = i % 3 ? f.peach : f.red
      const flip = (tick + i) % 6 < 3
      rect(c, x, y, 2, 2, leaf)
      c.fine(flip ? x + 2 : x - 1, y + (flip ? 0 : 1), leaf)
    }
    if (yard.season === 'summer' && yard.isNight && (tick + i * 5) % 14 < 7) {
      const fx = wrapF(i * 43 + Math.round(Math.sin((tick + i) / 7) * 6), fw(c))
      const fy = 16 + ((i * 13 + (tick >> 2)) % 52)
      disc(c, fx + 0.5, fy + 0.5, 2.2, 2.2, (gx, gy) => ((gx + gy) & 1 ? f.yellow : undefined))
      c.fine(fx, fy, f.yellow)
    }
  }
}
