import type { Game } from '../game'
import type { DashState } from '../games/dash'
import { CAT_X, TREAT, onGround } from '../games/dash'
import { ART } from '../../art/registry'
import { paintArt } from '../../art/types'
import { catPaint, paletteOf } from '../sprites'
import { backdrop, clear, drawParticles, number, rect, vgradient } from '../engine'
import { mix } from '../../theme'

export const renderDash: Game<DashState>['draw'] = (s, f, { f: fl, genes, tick, background }) => {
  backdrop(f, background, () => {
    clear(f, fl.base)
    vgradient(f, fl.isLight ? fl.sky : fl.crust, fl.surface0, 0, s.ground)
    const far = mix(fl.surface1, fl.base, 0.35)
    for (let x = 0; x < f.w; x += 8) {
      const top = s.ground - 13 - ((x >> 3) * 7) % 13
      rect(f, x, top, 8, s.ground - top, far)
      rect(f, x + 2, top + 4, 2, 3, fl.yellow)
    }
    rect(f, 0, s.ground, f.w, f.h - s.ground, fl.surface2)
  })
  for (let x = 0; x < f.w; x += 8) {
    const drift = (x - Math.floor(s.dist)) % f.w
    rect(f, (drift + f.w) % f.w, s.ground + 3, 3, 1, fl.overlay0)
  }
  const paint = paletteOf(fl, { g: fl.green, G: mix(fl.green, fl.teal, 0.5), p: fl.peach, w: fl.overlay2, b: fl.sky })
  for (const th of s.things) paintArt(f, ART.games.dash[th.kind], paint, th.x, th.y, tick)
  const cat = catPaint(genes, fl)
  if (s.duck > 0 && onGround(s)) paintArt(f, ART.cats.duck, cat, CAT_X, s.ground - ART.cats.duck.height)
  else paintArt(f, ART.cats.run, cat, CAT_X, s.y - ART.cats.run.height, tick)
  drawParticles(f, s.particles)
  for (const p of s.pops) number(f, TREAT, p.x, p.y - (0.6 - p.life) * 12, fl.yellow, 2)
}
