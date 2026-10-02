import type { Game } from '../game'
import type { LanesState } from '../games/lanes'
import { CARDS, COST, LANES, RECHARGE, TRAY_H, geometry } from '../games/lanes'
import { ART } from '../../art/registry'
import { paintArt } from '../../art/types'
import { catPaint, paletteOf } from '../sprites'
import { backdrop, blend, clear, drawParticles, number, rect } from '../engine'
import { mix } from '../../theme'

export const renderLanes: Game<LanesState>['draw'] = (s, f, { f: fl, genes, tick, background }) => {
  const g = geometry(s.w, s.h)
  backdrop(f, background, () => {
    clear(f, fl.mantle)
    for (let lane = 0; lane < LANES; lane++) for (let col = 0; col < g.cols; col++) {
      const even = (lane + col) % 2 === 0
      rect(f, g.left + col * g.cw, g.top + lane * g.lh, g.cw, g.lh,
        mix(fl.green, fl.base, even ? 0.62 : 0.72))
    }
    rect(f, 0, g.top, g.left, s.h - g.top, mix(fl.peach, fl.surface1, 0.5))
  })
  for (let lane = 0; lane < LANES; lane++) if (s.lost[lane])
    rect(f, g.left, g.top + lane * g.lh, s.w - g.left, g.lh, mix(fl.red, fl.base, 0.8))
  const cx = g.left + s.cursor.col * g.cw
  const cy = g.top + s.cursor.lane * g.lh
  for (let i = 0; i < g.cw; i++) {
    blend(f, cx + i, cy, fl.lavender, 0.7)
    blend(f, cx + i, cy + g.lh - 1, fl.lavender, 0.7)
  }
  const cat = catPaint(genes, fl)
  const paint = paletteOf(fl, { b: mix(fl.peach, fl.yellow, 0.4), B: mix(fl.peach, fl.crust, 0.4),
    m: fl.overlay2, r: mix(fl.overlay0, fl.maroon, 0.3), t: fl.pink, y: fl.yellow, g: fl.green })
  for (const u of s.units) {
    const asset = ART.games.lanes[u.card]
    const ux = g.left + u.col * g.cw + Math.floor((g.cw - asset.width) / 2)
    const uy = g.top + u.lane * g.lh + g.lh - asset.height - 1
    paintArt(f, asset, u.card === 'box' ? paint : cat, ux, uy, tick)
    if (u.card === 'nap' && (tick >> 3) % 2 === 0) blend(f, ux + 10, uy - 2, fl.text, 0.6)
  }
  for (const m of s.mice) {
    const asset = m.isRat ? ART.games.lanes.rat : ART.games.lanes.mouse
    paintArt(f, asset, paint, m.x, g.top + m.lane * g.lh + g.lh - asset.height - 2, tick)
  }
  for (const sh of s.shots) paintArt(f, ART.games.lanes.ball, paint, sh.x,
    g.top + sh.lane * g.lh + g.lh - 8, tick)
  rect(f, 0, 0, s.w, TRAY_H, fl.crust)
  CARDS.forEach((card, i) => {
    const x = 2 + i * 20
    const ready = s.recharge[card] <= 0 && s.catnip >= COST[card]
    rect(f, x, 2, 18, TRAY_H - 4, s.pick === card ? fl.lavender : ready ? fl.surface1 : fl.surface0)
    paintArt(f, ART.games.lanes[card], card === 'box' ? paint : cat, x + 4, 3, tick)
    if (s.recharge[card] > 0) rect(f, x, 2, 18,
      Math.ceil((TRAY_H - 4) * (s.recharge[card] / RECHARGE[card])), fl.crust)
  })
  for (const d of s.drops) paintArt(f, ART.games.lanes.nip, paint, d.x, d.y, tick)
  drawParticles(f, s.particles)
  for (const p of s.pops) number(f, p.n, p.x, p.y - (0.6 - p.life) * 16, fl.yellow, 2)
}
