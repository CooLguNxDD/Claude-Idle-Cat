import type { Game } from '../game'
import type { LaserState } from '../games/laser'
import { LEAP_S } from '../games/laser'
import { ART } from '../../art/registry'
import { paintArt } from '../../art/types'
import { catPaint, paletteOf } from '../sprites'
import { backdrop, blend, clear, drawParticles, number, rect } from '../engine'
import { mix } from '../../theme'

export const renderLaser: Game<LaserState>['draw'] = (s, f, { f: fl, genes, tick, background }) => {
  backdrop(f, background, () => {
    clear(f, fl.base)
    for (let y = 0; y < f.h; y++) {
      const plank = Math.floor(y / 8) % 2 === 0 ? fl.surface0 : mix(fl.surface0, fl.surface1, 0.5)
      rect(f, 0, y, f.w, 1, y % 8 === 7 ? fl.mantle : plank)
    }
  })
  s.trail.forEach((p, i) => blend(f, p.x, p.y, fl.red, 0.5 - i * 0.1))
  const laserPaint = paletteOf(fl, { r: fl.red, R: fl.pink, l: fl.lavender })
  paintArt(f, ART.games.laser.dot, laserPaint, s.dot.x, s.dot.y, tick)
  const lift = s.cat.leap > 0 ? Math.round(Math.sin((1 - s.cat.leap / LEAP_S) * Math.PI) * 6) : 0
  paintArt(f, ART.cats.front, catPaint(genes, fl), s.cat.x - 7, s.cat.y - 5 - lift)
  if ((tick >> 2) % 2 === 0 || s.cooldown === 0) {
    const c = s.cooldown > 0 ? fl.overlay0 : fl.lavender
    paintArt(f, ART.games.laser.reticle, () => c, s.aim.x, s.aim.y)
  }
  drawParticles(f, s.particles)
  for (const p of s.pops) number(f, p.n, p.x, p.y - (0.6 - p.life) * 16, fl.yellow, 2)
  for (let i = 0; i < s.combo; i++) rect(f, 2 + i * 6, 2, 4, 4, fl.peach)
}
