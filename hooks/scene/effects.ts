import type { Home } from '../../types'
import type { Flavor } from '../theme'
import type { SceneCanvas } from './canvas'
import type { CatScene } from './cats'

export const drawEffects = (c: SceneCanvas, home: Home, now: number, tick: number, f: Flavor, cat: CatScene) => {
  const { ox, headRow, mood, birthday } = cat
  const age = home.effect ? (now - home.effect.at) / 1000 : 99
  const fresh = (kind: string, secs: number) => home.effect?.kind === kind && age < secs
  const rainbow = (i: number) => [f.red, f.peach, f.yellow, f.green, f.blue, f.mauve][i % 6] ?? f.text
  if (mood === 'sleeping') {
    const step = tick % 24
    c.text(ox + 13 + (step >> 3), headRow - 1 - (step >> 3), step < 8 ? 'z' : 'Z', f.lavender)
  }
  if (cat.cat.genes.isShiny && tick % 24 < 6) c.text(ox + (tick % 3) * 5, headRow + 1 + (tick % 2), '*', f.mauve)
  if (fresh('hearts', 2) || fresh('gift', 2.5))
    [0, 4, 8].forEach((dx, i) => c.text(ox + 2 + dx, headRow - 1 - (Math.floor(age * 2 + i * 0.5) % 4), '♥', f.red))
  if (fresh('coins', 2.5))
    [3, 10, 17, 24].forEach((x, i) => c.text(x, (Math.floor(age * 4) + i) % 6, (tick + i) % 2 ? '*' : '+', f.yellow))
  if (fresh('fish', 1.5)) c.text(Math.max(c.w - 9, c.w - 1 - Math.floor(age * 8)), 8, '><>', f.peach)
  if (fresh('yarn', 2)) c.text(2 + (Math.floor(age * 12) % 22), 10, '@', f.maroon)
  if (fresh('shop', 2)) c.text(10, 1, 'NEW ITEM!', rainbow(tick))
  if (fresh('adopt', 3)) [...'WELCOME!'].forEach((ch, i) => c.text(11 + i, 1, ch, rainbow(tick + i)))
  if (birthday) [...'HAPPY BIRTHDAY!'].forEach((ch, i) => tick % 16 < 12 && c.text(8 + i, 0, ch, rainbow(tick + i)))
  if (fresh('catch', 3)) c.text(ox + 6, headRow - 2 - (Math.floor(age * 2) % 2), '!', f.yellow)
  if (fresh('award', 4)) [...'ACHIEVEMENT!'].forEach((ch, i) => c.text(10 + i, 0, ch, rainbow(tick + i)))
  if (fresh('welcome', 4)) [...'WELCOME BACK!'].forEach((ch, i) => c.text(10 + i, 1, ch, rainbow(tick + i)))
  if (fresh('evolve', 3)) [...'EVOLVED!'].forEach((ch, i) => c.text(12 + i, 1, ch, rainbow(tick + i)))
  if (fresh('levelup', 3)) [...'LEVEL UP!'].forEach((ch, i) => c.text(12 + i, 1, ch, rainbow(tick + i)))
}
