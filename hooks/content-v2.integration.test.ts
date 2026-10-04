import { send } from './expeditions'
import { expect, mock, test } from 'claude-code/testing'
import type { Home } from '../types'
import { newHome } from './game'

test('the Expeditions tab sends and claims an offline party, then Pip crafts its materials', { timeoutMs: 15_000 }, async ($, on) => {
  const now = new Date(2026, 9, 5, 12).getTime()
  mock.clock(on, { now })
  let stored: Home = { ...newHome(now), coins: 10000, tier: 3, materials: { 'pine-cone': 10 }, rev: 100 }
  on('store.get', () => ({ value: stored }))
  on('store.set', (_, e) => { stored = e.value as Home; return { value: undefined } })
  on('ui.open', () => ({ value: { isPlaced: true } })); on('ui.status', () => ({ value: undefined })); on('ui.toast', () => ({ value: undefined })); on('ui.blit', () => ({ value: {} }))
  const run = (args: string) => $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  await run('expedition')
  const ui = await $.ui.mount({ plugin: 'afk-cat', surface: 'terminal', component: 'Pane', requestId: 'afk-cat', props: { title: 'AFK Cat', isFocused: true, bodyColumns: 56, placement: 'dock', scroll: { offset: 0, bodyRows: 50 }, view: {} } })
  expect(await ui.find({ key: 'expedition-send' })).toBeDefined()
  await ui.press({ key: 'expedition-garden-patrol' }); await ui.key({ key: 'return', in: 'expedition-keys' })
  expect(stored.expeditions.runs.length).toBe(1)
  const r = stored.expeditions.runs[0]!
  stored = { ...stored, rev: stored.rev + 1, expeditions: { ...stored.expeditions, runs: [{ ...r, startAt: now - 900001, endsAt: now - 1 }] } }
  await run('claim')
  expect(stored.expeditions.runs).toEqual([]); expect(stored.expeditions.done['garden-patrol']).toBe(1)
  await run('curio'); expect(await ui.find({ key: 'craft-map-table' })).toBeDefined()
  await ui.press({ key: 'craft-map-table' })
  expect(stored.owned).toContain('map-table'); expect(stored.decor.toy).toBe('map-table')
  await run('quests'); expect(await ui.find({ type: 'Text', text: /Quest chains/ })).toBeDefined()
  await ui.unmount()
})
test('October shows Pumpkin Patch and all-away yard art in both UI surfaces', async ($, on) => {
  const now = new Date(2026, 9, 5, 12).getTime()
  mock.clock(on, { now }); mock.store(on)
  on('ui.open', () => ({ value: { isPlaced: true } })); on('ui.status', () => ({ value: undefined })); on('ui.toast', () => ({ value: undefined })); on('ui.blit', () => ({ value: {} }))
  const run = (args: string) => $.command.run({ command: 'cat', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  await run('expedition')
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'afk-cat', surface, component: 'Pane', requestId: 'afk-cat', props: { title: 'AFK Cat', isFocused: true, bodyColumns: 36, placement: 'dock', scroll: { offset: 0, bodyRows: 50 }, view: {} } })
    expect(await ui.find({ key: 'expedition-pumpkin-patch' })).toBeDefined()
    expect(await ui.find({ key: 'party-next' })).toBeDefined()
    await ui.unmount()
  }
  await run('send garden-patrol c1')
  await run('show')
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'afk-cat', surface, component: 'Pane', requestId: 'afk-cat', props: { title: 'AFK Cat', isFocused: true, bodyColumns: 36, placement: 'dock', scroll: { offset: 0, bodyRows: 50 }, view: {} } })
    if (surface === 'terminal') expect(await ui.find({ key: 'scene' })).toBeDefined()
    else expect(await ui.find({ type: 'Text', text: /All cats are away/ })).toBeDefined()
    await ui.press({ key: 'tabs-back' })
    await ui.press({ key: 'pet' })
    expect(await ui.find({ type: 'Text', text: /All cats are away/ })).toBeDefined()
    await ui.unmount()
  }
})

test('ready expedition notifications persist across frames and session reloads without auto-claim', async ($, on) => {
  const now = new Date(2026, 9, 5, 12).getTime(), clock = mock.clock(on, { now })
  const sent = send({ ...newHome(now), coins: 1000 }, 'garden-patrol', ['c1'], [], now, 7), r = sent.expeditions.runs[0]!
  let stored: Home = { ...sent, rev: 100, expeditions: { ...sent.expeditions, runs: [{ ...r, startAt: now - 899000, endsAt: now + 1000 }] } }
  const notices: string[] = []
  on('store.get', () => ({ value: stored }))
  on('store.set', (_, e) => { stored = e.value as Home; return { value: undefined } })
  on('command.register', () => ({ value: { command: 'cat' } })); on('config.list', () => ({ value: [] }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000 }, rateLimits: [], cost: { usd: 0 } } }))
  on('ui.status', () => ({ value: undefined })); on('ui.toast', (_, e) => { notices.push(e.text); return { value: undefined } })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  const start = () => $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  await start(); await clock.advance(1500)
  expect(notices.filter(n => n.startsWith('Expedition ready:')).length).toBe(1)
  expect(stored.expeditions.inbox).toEqual([r.id]); expect(stored.expeditions.runs.length).toBe(1)
  const coins = stored.coins
  await start()
  expect(notices.filter(n => n.startsWith('Expedition ready:')).length).toBe(1)
  expect(stored.expeditions.runs.length).toBe(1); expect(stored.materials).toEqual({})
  expect(stored.coins).toBe(coins)
})
