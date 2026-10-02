import { expect, test } from 'claude-code/testing'

import { FISH_W, RUN_ROWS, SPRITE_W, nextX, runFrame, runPixels } from './runner'
import type { RunInput } from './runner'
import { FLAVORS } from './theme'
import { COATS } from './adoption/registry'

const input = (over: Partial<RunInput> = {}): RunInput => ({
  cat: { genes: { coat: 'ginger', eyes: 'green', personality: 'playful', isShiny: false } },
  flavor: FLAVORS.mocha, tick: 0, x: 4, cols: 40, isSprint: false, ...over,
})
const NONE = 0x01000000
const filled = (px: Uint32Array) => px.reduce((n, v) => n + (v === NONE ? 0 : 1), 0)

test('a frame is exactly cols x rows cells of base64', () => {
  const cells = runFrame(input())
  expect(cells).toHaveLength(Math.ceil((40 * RUN_ROWS * 12) / 3) * 4)
  expect(cells).toMatch(/^[A-Za-z0-9+/]+=*$/)
})

test('the legs change on every tick of the gallop and repeat after four', () => {
  // Ticks 0 and 1 of every 40 are a blink, so the cycle is read from tick 4 on.
  const frames = [4, 5, 6, 7].map(tick => runFrame(input({ tick })))
  expect(new Set(frames).size).toBe(4)
  expect(runFrame(input({ tick: 8 }))).toBe(frames[0])
})

test('every coat paints the cat and sprinting adds speed lines', () => {
  for (const coat of COATS) {
    const cat: RunInput['cat'] = { genes: { coat, eyes: 'green', personality: 'playful', isShiny: true } }
    expect(filled(runPixels(input({ cat })))).toBeGreaterThan(60)
  }
  expect(filled(runPixels(input({ isSprint: true, x: 20 })))).toBeGreaterThan(filled(runPixels(input({ x: 20 }))))
})

test('the cat stays on the track and wraps at the fish', () => {
  let x = 0
  let wrapped = false
  for (let i = 0; i < 100; i++) {
    const next = nextX(x, 40, i % 10 < 3)
    if (next < x) wrapped = true
    expect(next + 3 + SPRITE_W).toBeLessThanOrEqual(40 - FISH_W)
    x = next
  }
  expect(wrapped).toBe(true)
  // Drawing at the far end and with a small x never throws or leaves the grid.
  expect(runPixels(input({ x: 0 }))).toHaveLength(40 * RUN_ROWS * 2)
  expect(runPixels(input({ x: nextX(0, 40, false) + 12 }))).toHaveLength(40 * RUN_ROWS * 2)
})
