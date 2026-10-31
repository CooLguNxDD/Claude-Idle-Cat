import { expect, mock, test } from 'claude-code/testing'
import type { Home } from '../types'

const t = new Date(2026, 9, 2, 14, 5).getTime()

test('/cat start boots without session.start, then status, build, backup and reset answer', { timeoutMs: 15_000 }, async ($, on) => {
  mock.clock(on, { now: t })
  mock.env(on, { HOME: '/home/me' })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  const disk = new Map<string, unknown>()
  on('store.get', ($, e) => ({ value: disk.get(e.key) }))
  on('store.set', ($, e) => { disk.set(e.key, e.value); return { value: undefined } })
  const files = new Map<string, string>()
  on('fs.write', ($, e) => { files.set(e.path.split(/[\\/]/).at(-1) ?? '', e.text); return { value: undefined } })
  const run = async (args: string) => (await $.command.run({
    command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 },
  })).text ?? ''

  expect(await run('start')).toMatch(/Mochi is awake/)
  expect(files.has('afk-cat-auto-fri.json')).toBe(true)
  expect(await run('status')).toMatch(/Mochi Lv\d/)

  // A read-only /cat leaves the revision alone.
  const rev = (disk.get('home') as Home).rev
  await run('status')
  await run('show')
  expect((disk.get('home') as Home).rev).toBe(rev)

  expect(await run('build')).toMatch(/cardboard-tunnel \(Cardboard tunnel\) 240c \+ 3 feather/)
  disk.set('home', { ...(disk.get('home') as Home), rev: rev + 5, coins: 1000, materials: { feather: 3 } })
  expect(await run('build cardboard-tunnel')).toMatch(/crafted Cardboard tunnel/)
  expect((disk.get('home') as Home).owned).toContain('cardboard-tunnel')

  expect(await run('backup')).toMatch(/Backed up to .*afk-cat-auto-fri\.json/)
  await run('reset')
  expect(files.has('afk-cat-2026-10-02-1405-before-reset.json')).toBe(true)
})
