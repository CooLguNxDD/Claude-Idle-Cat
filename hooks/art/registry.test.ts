import { expect, test } from 'claude-code/testing'

import { FLAVORS } from '../theme'
import type { ColorName } from '../theme'
import { ART } from './registry'
import { ART_H, ART_W, BACKGROUND_IDS, WORLD_H, WORLD_W, backgroundUrl } from './backgrounds'
import type { PixelArt } from './types'

test('art registry has complete sprite frames and themed backgrounds', async () => {
  const assets: PixelArt[] = [
    ...Object.values(ART.cats), ...Object.values(ART.weather), ...Object.values(ART.shelter),
    ...Object.values(ART.furniture).map(item => item.sprite),
    ...Object.values(ART.games).flatMap(group => Object.values(group)),
  ]
  expect(new Set(assets.map(a => a.id)).size).toBe(assets.length)
  expect(ART.drawOrder).toEqual(['back', 'world', 'actor', 'front', 'effect'])
  for (const item of Object.values(ART.furniture)) for (const rows of item.sprite.frames)
    for (const row of rows) for (const symbol of row) if (symbol !== '.') {
      const token = item.colors[symbol] as ColorName | undefined
      if (!token) throw new Error(`Unmapped furniture pixel: ${symbol}`)
      expect(ART.colorTokens.includes(token)).toBe(true)
      for (const flavor of Object.values(FLAVORS)) expect(flavor[token]).toBeDefined()
    }
  for (const asset of assets) {
    expect(asset.frames.length).toBeGreaterThan(0)
    for (const rows of asset.frames) {
      expect(rows.length).toBe(asset.height)
      for (const row of rows) expect(row.length).toBe(asset.width)
    }
  }
  expect([WORLD_W, WORLD_H, ART_W, ART_H]).toEqual([112, 64, 320, 180])
  expect(BACKGROUND_IDS).toEqual(['dash', 'catch', 'laser', 'whack', 'tank', 'lanes'])
  for (const id of BACKGROUND_IDS) for (const flavor of Object.keys(FLAVORS) as (keyof typeof FLAVORS)[])
    expect(backgroundUrl(id, flavor)).toBe(`/art/${id}.${flavor}.png`)
})
