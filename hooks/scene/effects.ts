import type { Home } from '../../types'
import type { Flavor } from '../theme'
import type { SceneCanvas } from './canvas'
import type { CatScene } from './cats'

export const drawEffects = (c: SceneCanvas, home: Home, now: number, tick: number, f: Flavor, cat: CatScene) => {
  const { ox, headRow, mood, birthday } = cat
  const age = home.effect ? (now - home.effect.at) / 1000 : 99
  const fresh = (kind: string, secs: number) => home.effect?.kind === kind && age < secs
  const rainbow = (i: number) => [f.red, f.peach, f.yellow, f.green, f.blue, f.mauve][i % 6] ?? f.text
  // Banners centre on the pane's width, which runs from 34 to 56 columns.
  const banner = (text: string, row: number) => {
    const x0 = Math.max(0, Math.floor((c.w - text.length) / 2))
    ;[...text].forEach((ch, i) => c.text(x0 + i, row, ch, rainbow(tick + i)))
  }
  if (mood === 'sleeping') {
    const step = tick % 24
    c.text(ox + 13 + (step >> 3), headRow - 1 - (step >> 3), step < 8 ? 'z' : 'Z', f.lavender)
  }
  if (cat.cat.genes.isShiny && tick % 24 < 6) c.text(ox + (tick % 3) * 5, headRow + 1 + (tick % 2), '*', f.mauve)
  if (fresh('hearts', 2) || fresh('gift', 2.5))
    [0, 4, 8].forEach((dx, i) => c.text(ox + 2 + dx, headRow - 1 - (Math.floor(age * 2 + i * 0.5) % 4), '♥', f.red))
  if (fresh('coins', 2.5))
    [1, 3, 5, 7].forEach((n, i) => c.text(Math.floor((c.w * n) / 8), (Math.floor(age * 4) + i) % 6, (tick + i) % 2 ? '*' : '+', f.yellow))
  if (fresh('fish', 1.5)) c.text(Math.max(c.w - 9, c.w - 1 - Math.floor(age * 8)), 8, '><>', f.peach)
  if (fresh('yarn', 2)) c.text(2 + (Math.floor(age * 12) % 22), 10, '@', f.maroon)
  if (fresh('shop', 2)) banner('NEW ITEM!', 1)
  if (fresh('adopt', 3)) banner('WELCOME!', 1)
  if (birthday && tick % 16 < 12) banner('HAPPY BIRTHDAY!', 0)
  if (fresh('catch', 3)) c.text(ox + 6, headRow - 2 - (Math.floor(age * 2) % 2), '!', f.yellow)
  if (fresh('award', 4)) banner('ACHIEVEMENT!', 0)
  if (fresh('welcome', 4)) banner('WELCOME BACK!', 1)
  if (fresh('evolve', 3)) banner('EVOLVED!', 1)
  if (fresh('levelup', 3)) banner('LEVEL UP!', 1)
}
