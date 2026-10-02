import type { Game } from '../game'
import type { CatchState } from '../games/catch'
import { ART } from '../../art/registry'
import { paintArt } from '../../art/types'
import { catPaint, paletteOf } from '../sprites'
import { backdrop, clear, drawParticles, number, rect, vgradient } from '../engine'
import { mix } from '../../theme'

export const renderCatch: Game<CatchState>['draw'] = (s, f, { f: fl, genes, tick, background }) => {
  backdrop(f, background, () => {
    clear(f, fl.base)
    vgradient(f, fl.isLight ? fl.sky : fl.mantle, fl.base, 0, s.h - 6)
    rect(f, 0, s.h - 6, f.w, 6, mix(fl.peach, fl.surface1, 0.6))
  })
  const paint = paletteOf(fl, { b: fl.sky, y: fl.yellow, k: fl.overlay1, g: fl.green,
    G: mix(fl.green, fl.teal, 0.5), l: fl.lavender })
  for (const d of s.drops) paintArt(f, ART.games.catch[d.kind], paint, d.x, d.y, tick)
  paintArt(f, ART.cats.front, catPaint(genes, fl), Math.round(s.bowl) - 7, s.h - 23)
  const bx = Math.round(s.bowl - s.bowlW / 2)
  rect(f, bx, s.h - 12, s.bowlW, 2, fl.lavender)
  rect(f, bx + 2, s.h - 10, s.bowlW - 4, 2, mix(fl.lavender, fl.blue, 0.5))
  for (let i = 0; i < s.lives; i++) {
    rect(f, f.w - 8 - i * 8, 2, 6, 4, fl.red)
    rect(f, f.w - 6 - i * 8, 3, 2, 2, fl.pink)
  }
  drawParticles(f, s.particles)
  for (const p of s.pops) number(f, p.n, p.x, p.y - (0.6 - p.life) * 16, fl.yellow, 2)
}
