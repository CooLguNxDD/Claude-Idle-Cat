import type { Frame, Paint } from '../arcade/engine'
import { sprite } from '../arcade/engine'

export type PixelArt = {
  id: string
  frames: readonly (readonly string[])[]
  width: number
  height: number
  anchor: readonly [number, number]
  layer: 'back' | 'world' | 'actor' | 'front' | 'effect'
}

export const art = (id: string, frames: readonly (readonly string[])[], anchor: readonly [number, number],
  layer: PixelArt['layer']): PixelArt => {
  const width = Math.max(0, ...frames.flatMap(rows => rows.map(row => row.length)))
  const height = frames[0]?.length ?? 0
  if (!width || !height || frames.some(rows => rows.length !== height || rows.some(row => row.length === 0))) {
    throw new Error(`Invalid pixel art: ${id}`)
  }
  return { id, frames: frames.map(rows => rows.map(row => row.padEnd(width, '.'))), width, height, anchor, layer }
}

export const paintArt = (f: Frame, asset: PixelArt, color: Paint, x: number, y: number, tick = 0, flip = false) =>
  sprite(f, asset.frames[Math.floor(tick / 4) % asset.frames.length] ?? asset.frames[0] ?? [], color,
    x - asset.anchor[0], y - asset.anchor[1], flip)

export const doublePixels = (rows: readonly string[]): string[] => rows.flatMap(row => {
  const expanded = [...row].map(ch => ch + ch).join('')
  return [expanded, expanded]
})
