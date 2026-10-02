import { expect, test } from 'claude-code/testing'

import { blend, burst, clear, frame, offset, plot, stepParticles, toRows } from './engine'

test('toRows packs two pixel rows per cell and merges same-color runs', async () => {
  const f = frame(4, 4)
  clear(f, 0x111111)
  plot(f, 2, 0, 0xff0000)
  const rows = toRows(f)
  expect(rows.length).toBe(2)
  expect(rows[0]).toEqual([{ text: '  ▀ ', fg: 0xff0000, bg: 0x111111 }])
  expect(rows[1]).toEqual([{ text: '    ', fg: 0x111111, bg: 0x111111 }])
})

test('blend mixes by alpha and particles fade out', async () => {
  const f = frame(1, 1)
  clear(f, 0x000000)
  blend(f, 0, 0, 0xffffff, 0.5)
  expect(f.px[0]).toBe(0x808080)
  let ps = burst(() => 0.5, 0, 0, 0xffffff, 3)
  expect(ps.length).toBe(3)
  for (let i = 0; i < 60; i++) ps = stepParticles(ps, 1 / 60)
  expect(ps.length).toBe(0)
})

test('offset shifts a frame and fills the gap', async () => {
  const f = frame(2, 1)
  plot(f, 0, 0, 5)
  expect([...offset(f, 1, 0, 9).px]).toEqual([9, 5])
})
