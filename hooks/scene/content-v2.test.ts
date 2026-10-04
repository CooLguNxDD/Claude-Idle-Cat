import { expect, test } from 'claude-code/testing'
import { newHome } from '../game'
import { frameCells, frameImage } from '../scene'
import { startMotion } from '../motion'
import { canvas } from './canvas'
import { drawCup } from './effects'
import { FLAVORS } from '../theme'

test('cup props remain visible at fractional motion positions in both scene canvases', () => {
  const motion = { ...startMotion(33.5), move: 'cup-knock', stage: 'stay' as const, frame: 6 }
  for (const scale of [1, 4]) {
    const c = canvas(40, scale), blank = c.pack()
    drawCup(c, motion, FLAVORS.mocha, 3)
    expect(c.pack()).not.toBe(blank)
    const image = c.image(FLAVORS.mocha.base)
    const next = canvas(40, scale)
    drawCup(next, { ...motion, frame: 14 }, FLAVORS.mocha, 3)
    expect(next.image(FLAVORS.mocha.base).rgba).not.toBe(image.rgba)
  }
})

test('all three added poses draw distinct fine and half-block frames', () => {
  const now = new Date(2026, 9, 5, 12).getTime(), home = newHome(now)
  const input = { home, now, tick: 3, hour: 12, flavor: FLAVORS.mocha, cols: 40 }
  const sit = { ...startMotion(32), frame: 3 }
  for (const move of ['knead', 'chase-tail', 'hiss']) {
    const motion = { ...sit, move }
    expect(frameCells({ ...input, motion })).not.toBe(frameCells({ ...input, motion: sit }))
    expect(frameImage({ ...input, motion }).rgba).not.toBe(frameImage({ ...input, motion: sit }).rgba)
  }
})
