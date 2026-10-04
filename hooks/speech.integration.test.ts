import { expect, mock, test } from 'claude-code/testing'
import type { Home } from '../types'
import { newHome } from './game'

test('a Bash tool call puts a claude.tool line in the pane', async ($, on) => {
  const now = new Date(2026, 5, 5, 12).getTime()
  mock.clock(on, { now })
  let stored: Home = { ...newHome(now), rev: 100 }
  on('store.get', () => ({ value: stored }))
  on('store.set', (_, e) => { stored = e.value as Home; return { value: undefined } })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('config.list', () => ({ value: [] }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'hi', stderr: '', interrupted: false } }))
  await $.command.run({ command: 'cat', args: 'show', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  await $.tool.call({ tool: 'Bash', command: 'echo hi' })
  const ui = await $.ui.mount({ plugin: 'afk-cat', surface: 'terminal', component: 'Pane', requestId: 'afk-cat', props: { title: 'AFK Cat', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } })
  expect(await ui.find({ type: 'Text', text: /terminal clicked/ })).toBeDefined()
  await ui.unmount()
})

test('speech off keeps the hourly idle line and skips tool chatter', async ($, on) => {
  const now = new Date(2026, 5, 5, 12).getTime()
  mock.clock(on, { now })
  let stored: Home = { ...newHome(now), rev: 100 }
  on('store.get', () => ({ value: stored }))
  on('store.set', (_, e) => { stored = e.value as Home; return { value: undefined } })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('config.list', () => ({ value: [] }))
  on('config.set', (_, e) => ({ value: e.value }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'hi', stderr: '', interrupted: false } }))
  await $.command.run({ command: 'cat', args: 'show', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  await $.config.set({ key: 'afk-cat.speech', value: 'off', previous: 'on', provider: { plugin: 'afk-cat', tier: 'user' }, origin: { kind: 'composer' } })
  await $.tool.call({ tool: 'Bash', command: 'echo hi' })
  const ui = await $.ui.mount({ plugin: 'afk-cat', surface: 'terminal', component: 'Pane', requestId: 'afk-cat', props: { title: 'AFK Cat', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} } })
  expect(await ui.find({ type: 'Text', text: /terminal clicked/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Mochi: "/ })).toBeDefined()
  await ui.unmount()
})
