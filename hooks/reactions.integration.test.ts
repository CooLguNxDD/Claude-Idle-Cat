import { expect, mock, test } from 'claude-code/testing'
import type { Home } from '../types'
import { newHome } from './game'

test('a successful Bash test triggers celebration, and disabling reactions stops counters and toasts', async ($, on) => {
  const now = new Date(2026, 9, 5, 12).getTime()
  mock.clock(on, { now })
  let stored: Home = { ...newHome(now), rev: 100 }
  const messages: string[] = []
  on('store.get', () => ({ value: stored }))
  on('store.set', (_, e) => { stored = e.value as Home; return { value: undefined } })
  on('ui.open', () => ({ value: { isPlaced: true } })); on('ui.status', () => ({ value: undefined }))
  on('ui.toast', (_, e) => { messages.push(e.text); return { value: undefined } })
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'all passed', stderr: '', interrupted: false } }))
  on('config.set', (_, e) => ({ value: e.value }))
  await $.command.run({ command: 'cat', args: 'show', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  await $.tool.call({ tool: 'Bash', command: 'claude plugin test .' })
  expect(messages.some(m => /Tests passed/.test(m))).toBe(true)
  const count = stored.miles.counts.react!
  expect(count).toBe(1)
  await $.config.set({ key: 'afk-cat.reactions', value: 'off', previous: 'on', provider: { plugin: 'afk-cat', tier: 'user' }, origin: { kind: 'composer' } })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect(stored.miles.counts.react).toBe(count)
})
