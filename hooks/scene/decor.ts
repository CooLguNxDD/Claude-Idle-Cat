import type { Home, Slot } from '../../types'
import { FURNITURE_ART } from '../art/furniture'
import { art } from '../art/types'
import { furniture, tierOf } from '../home'
import { worldOf } from '../world'
import type { Flavor } from '../theme'
import { FLOOR_Y } from './canvas'
import type { SceneCanvas } from './canvas'
import type { YardState } from './yard'

const ORDER: readonly Slot[] = ['rug', 'bed', 'plant', 'toy', 'hanging', 'bowl']

/** Furniture at its world's slot positions; `c` is the world-wide canvas. */
export const drawDecor = (c: SceneCanvas, home: Home, now: number, tick: number, f: Flavor, yard: YardState) => {
  const slots = tierOf(home).slots
  const at = worldOf(home).slots
  for (const slot of ORDER) {
    if (!slots.includes(slot)) continue
    const id = home.decor[slot] ?? (slot === 'bowl' ? 'bowl' : undefined)
    const data = furniture(id)
    const entry = id ? FURNITURE_ART[id] ?? (data?.art ? { slot: data.slot, colors: data.art.colors,
      sprite: art(`furniture.${id}`, [data.art.rows], [0, 0], slot === 'rug' ? 'back' : 'world') } : undefined) : undefined
    if (!entry || entry.slot !== slot) continue
    const asset = entry.sprite
    const x = at[slot]
    const y = slot === 'rug' ? FLOOR_Y : slot === 'bed' ? FLOOR_Y - asset.height
      : slot === 'plant' ? FLOOR_Y - asset.height : slot === 'hanging' ? 0
        : slot === 'bowl' ? FLOOR_Y - asset.height + 1 : id === 'tree' ? 10 : FLOOR_Y - asset.height
    asset.frames[0]?.forEach((row, dy) => [...row].forEach((ch, dx) => {
      if (ch === '.') return
      const name = entry.colors[ch]
      if (name) c.put(x + dx, y + dy, f[name])
    }))
    if (id === 'laser') c.put(x - 12 + Math.abs((tick % 48) - 24), FLOOR_Y + 1, f.red)
    if (id === 'lantern' && yard.isNight) c.put(x + 2, y + 3, tick % 12 < 6 ? f.yellow : f.peach)
    if (id === 'moonlamp' && yard.isNight) for (const dx of [-1, 5]) c.put(x + dx, y + 2, f.yellow)
    if (id === 'birds') c.put(x + (tick % 12 < 6 ? -1 : 5), y + 4, f.blue)
    if (slot === 'bowl' && home.effect?.kind === 'fish' && (now - home.effect.at) / 1000 < 3)
      for (let dx = 2; dx <= 5; dx++) c.put(x + dx, y, f.peach)
  }
  if (yard.festival === 'pumpkins') {
    const x = at.bowl - 4
    for (const [dx, dy] of [[0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 1]] as const)
      c.put(x + dx, 19 + dy, f.peach)
    c.put(x + 1, 18, f.green)
    if (yard.isNight) c.put(x + 2, 19, f.yellow)
  }
}
