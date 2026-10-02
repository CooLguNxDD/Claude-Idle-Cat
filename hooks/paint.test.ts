import { expect, mock, test } from 'claude-code/testing'
import { newHome } from './game'
import { ROWS, frameCells } from './scene'
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

test('the frame loop skips repeat frames and stops painting once the pane is gone', async ($, on) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  const blits = { scene: 0, frames: new Set<string>(), isGone: false }
  on('ui.blit', ($, e) => {
    if (e.key !== 'scene' || !('cells' in e)) return { value: {} }
    blits.scene += 1
    if (blits.frames.has(e.cells)) throw new Error('a frame repeated the last cells')
    blits.frames = new Set([e.cells])
    return { value: blits.isGone ? { deny: 'not mounted' } : {} }
  })
  on('ui.toast', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'cat' } }))
  on('config.list', () => ({ value: [] }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  await $.command.run({
    command: 'cat', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 },
  })
  const ui = await $.ui.mount({
    plugin: 'afk-cat', surface: 'terminal', component: 'Pane', requestId: 'afk-cat',
    props: { title: 'AFK Cat', isFocused: true, bodyColumns: 50, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
  })
  await clock.advance(1000)
  expect(blits.scene).toBeGreaterThan(0)
  blits.isGone = true
  await clock.advance(500)
  const after = blits.scene
  await clock.advance(1000)
  expect(blits.scene).toBe(after)
  await ui.unmount()
})
