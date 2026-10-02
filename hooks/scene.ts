import type { Home } from '../types'
import type { Flavor } from './theme'
import { ROWS, canvas, sceneCols } from './scene/canvas'
import { drawCats } from './scene/cats'
import { drawDecor } from './scene/decor'
import { drawEffects } from './scene/effects'
import { drawWeather, drawYard } from './scene/yard'

export { ROWS, sceneCols }
export type SceneInput = { home: Home; now: number; tick: number; hour: number; flavor: Flavor; cols: number }

// The terminal stays 12 half-block rows; each renderer contributes one scene layer.
export const frameCells = ({ home, now, tick, hour, flavor, cols }: SceneInput): string => {
  const c = canvas(cols)
  const yard = drawYard(c, now, hour, tick, flavor)
  drawDecor(c, home, now, tick, flavor, yard)
  const cat = drawCats(c, home, now, tick, flavor)
  drawWeather(c, yard, tick, flavor)
  drawEffects(c, home, now, tick, flavor, cat)
  return c.pack()
}
