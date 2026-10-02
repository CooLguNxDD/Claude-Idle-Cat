import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'
import { newHome } from './game'
import { ROWS, frameCells, frameImage } from './scene'
import { FLAVORS } from './theme'

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
// Reads one packed row back into its glyphs; half-block pixels read as spaces.
const glyphRow = (cells: string, cols: number, row: number) => {
  const bytes: number[] = []
  for (let i = 0; i < cells.length; i += 4) {
    const n = [0, 1, 2, 3].reduce((acc, k) => (acc << 6) | Math.max(0, B64.indexOf(cells[i + k]!)), 0)
    bytes.push((n >> 16) & 255, (n >> 8) & 255, n & 255)
  }
  const words = new Uint32Array(new Uint8Array(bytes.slice(0, cols * ROWS * 12)).buffer)
  return Array.from({ length: cols }, (_, c) => {
    const cp = words[(row * cols + c) * 3] ?? 32
    return cp === 0x2580 ? ' ' : String.fromCodePoint(cp)
  }).join('')
}

test('effect banners centre on every pane width', async () => {
  const home = { ...newHome(0), effect: { kind: 'levelup', at: 0 } } as ReturnType<typeof newHome>
  for (const cols of [34, 56]) {
    const row = glyphRow(frameCells({ home, now: 500, tick: 3, hour: 12, flavor: FLAVORS.mocha, cols }), cols, 1)
    const at = row.indexOf('LEVEL UP!')
    expect(at).toBe(Math.floor((cols - 9) / 2))
  }
})

test('the picture canvas is 4x the scene and draws banners as pixel glyphs', async () => {
  const home = { ...newHome(0), effect: { kind: 'levelup', at: 0 } } as ReturnType<typeof newHome>
  const input = { home, now: 500, tick: 3, hour: 12, flavor: FLAVORS.mocha, cols: 40 }
  const image = frameImage(input)
  expect([image.width, image.height]).toEqual([160, 96])
  expect(image.rgba.length).toBe(Math.ceil((160 * 96 * 4) / 3) * 4)
  const plain = frameImage({ ...input, home: newHome(0) })
  expect(image.rgba).not.toBe(plain.rgba)
})

type Blit = { kind: 'cells' | 'image'; frame: string }
// Opens the pane on a terminal; `answer` decides each scene blit's reply.
const openPane = async ($: Parameters<TestBody>[0], on: Parameters<TestBody>[1], answer: (b: Blit) => string | undefined) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'cat' } }))
  on('config.list', () => ({ value: [] }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  const blits: Blit[] = []
  on('ui.blit', ($, e) => {
    if (e.key !== 'scene') return { value: {} }
    const blit: Blit = 'cells' in e ? { kind: 'cells', frame: e.cells }
      : { kind: 'image', frame: 'rgba' in e.source ? e.source.rgba : '' }
    if (blits.at(-1)?.frame === blit.frame) throw new Error('a frame repeated the last one')
    blits.push(blit)
    const deny = answer(blit)
    return { value: deny ? { deny } : {} }
  })
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  await $.command.run({
    command: 'cat', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 },
  })
  const ui = await $.ui.mount({
    plugin: 'afk-cat', surface: 'terminal', component: 'Pane', requestId: 'afk-cat',
    props: { title: 'AFK Cat', isFocused: true, bodyColumns: 50, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
  })
  return { clock, ui, blits }
}

test('the frame loop skips repeat frames and stops painting once the pane is gone', async ($, on) => {
  const state = { isGone: false }
  const { clock, ui, blits } = await openPane($, on, () => (state.isGone ? 'not mounted' : undefined))
  expect(await ui.find({ key: 'scene', type: 'Image' })).toBeDefined()
  await clock.advance(1000)
  expect(blits.length).toBeGreaterThan(0)
  expect(blits.every(b => b.kind === 'image')).toBe(true)
  state.isGone = true
  await clock.advance(500)
  const after = blits.length
  await clock.advance(1000)
  expect(blits.length).toBe(after)
  await ui.unmount()
})

test('a terminal that draws the picture as its alt falls back to half-block cells', async ($, on) => {
  const { clock, ui, blits } = await openPane($, on, b => (b.kind === 'image' ? 'the Image draws its alt here' : undefined))
  await clock.advance(1000)
  expect(await ui.find({ key: 'scene', type: 'Raster' })).toBeDefined()
  expect(blits.some(b => b.kind === 'cells')).toBe(true)
  await ui.unmount()
})
