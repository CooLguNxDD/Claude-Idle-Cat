import type { Game } from '../game'
import type { TankState } from '../games/tank'
import { floorOf, waterTop } from '../games/tank'
import { ART } from '../../art/registry'
import { paintArt } from '../../art/types'
import { catPaint, paletteOf } from '../sprites'
import { backdrop, blend, clear, drawParticles, number, rect, vgradient } from '../engine'
import { mix } from '../../theme'

export const renderTank: Game<TankState>['draw'] = (s, f, { f: fl, genes, tick, background }) => {
  backdrop(f, background, () => {
    clear(f, fl.base)
    vgradient(f, mix(fl.sky, fl.base, 0.35), mix(fl.blue, fl.crust, 0.55), waterTop, floorOf(s))
    rect(f, 0, 0, f.w, waterTop, fl.mantle)
    rect(f, 0, floorOf(s), f.w, f.h - floorOf(s), mix(fl.yellow, fl.peach, 0.4))
  })
  for (let x = 0; x < f.w; x += 4) blend(f, x + ((tick >> 3) & 1), waterTop, fl.text, 0.35)
  paintArt(f, ART.cats.front, catPaint(genes, fl), f.w - 18, 0)
  const paint = paletteOf(fl, { a: fl.peach, y: fl.yellow, E: fl.crust, k: mix(fl.crust, fl.overlay0, 0.3) })
  for (const p of s.food) rect(f, p.x, p.y, 2, 2, fl.maroon)
  for (const fish of s.fish) {
    const asset = fish.stage === 0 ? ART.games.tank.fry : fish.stage === 1 ? ART.games.tank.fish : ART.games.tank.gold
    const look = fish.isDead ? paletteOf(fl, { a: fl.overlay0, y: fl.overlay0, E: fl.crust }) : paint
    paintArt(f, asset, look, fish.x, fish.y, tick, fish.tx > fish.x)
  }
  for (const c of s.coins) {
    const col = c.value > 5 ? fl.yellow : fl.subtext1
    rect(f, c.x - 2, c.y - 2, 4, 4, (tick >> 2) % 3 === 0 ? mix(col, 0xffffff, 0.5) : col)
    rect(f, c.x - 1, c.y - 1, 1, 1, fl.rosewater)
  }
  if (s.crow) {
    if (s.crow.warn > 0 && (tick >> 1) % 2 === 0) for (let x = 0; x < f.w; x++) blend(f, x, waterTop, fl.red, 0.9)
    else paintArt(f, ART.games.tank.crow, paint, s.crow.x, s.crow.y, tick, s.crow.x < s.w / 2)
  }
  for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4]] as const) blend(f, s.aim.x + dx, s.aim.y + dy, fl.lavender, 0.6)
  number(f, s.bank, 2, 1, fl.yellow, 2)
  drawParticles(f, s.particles)
  for (const p of s.pops) number(f, p.n, p.x, p.y - (0.6 - p.life) * 16, fl.yellow, 2)
}
