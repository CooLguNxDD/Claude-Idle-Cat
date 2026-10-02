import type { Game } from '../game'
import type { WhackState } from '../games/whack'
import { RISE_S, cellOf } from '../games/whack'
import { ART } from '../../art/registry'
import { paintArt } from '../../art/types'
import { catPaint, paletteOf } from '../sprites'
import { backdrop, clear, drawParticles, number, rect } from '../engine'
import { mix } from '../../theme'

export const renderWhack: Game<WhackState>['draw'] = (s, f, { f: fl, genes, background }) => {
  const grass = mix(fl.green, fl.base, 0.75)
  backdrop(f, background, () => clear(f, grass))
  const paint = paletteOf(fl, { m: fl.overlay2, y: fl.yellow, E: fl.crust, p: fl.pink, s: fl.blue, S: fl.sapphire })
  for (let hole = 0; hole < 9; hole++) {
    const c = cellOf(s, hole)
    const cx = Math.round(c.x + c.cw / 2)
    const base = Math.round(c.y + c.ch - 6)
    const pop = s.holes[hole]
    if (pop) {
      const rise = Math.min(1, pop.up / RISE_S) * (pop.isHit ? Math.max(0, pop.life / 0.2) : 1)
      paintArt(f, ART.games.whack[pop.kind], paint, cx - 5, base - Math.round(rise * 10))
    }
    rect(f, cx - 8, base, 17, 9, grass)
    rect(f, cx - 8, base, 17, 3, fl.crust)
    rect(f, cx - 6, base + 3, 13, 2, mix(fl.crust, fl.green, 0.3))
    number(f, hole + 1, c.x + 2, c.y + 1, mix(fl.text, fl.base, 0.5), 2)
  }
  if (s.swipe) {
    const c = cellOf(s, s.swipe.hole)
    paintArt(f, ART.games.whack.paw, catPaint(genes, fl), c.x + c.cw / 2 - 5, c.y + c.ch - 18)
  }
  drawParticles(f, s.particles)
  for (const p of s.pops) number(f, p.n, p.x, p.y - (0.6 - p.life) * 16, fl.yellow, 2)
}
