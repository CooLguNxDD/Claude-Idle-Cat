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

test('cosmetic toast failures preserve tool results and allow the turn payout', async ($, on) => {
  const now = new Date(2026, 9, 5, 12).getTime()
  mock.clock(on, { now })
  let stored: Home = { ...newHome(now), rev: 100 }
  on('store.get', () => ({ value: stored }))
  on('store.set', (_, e) => { stored = e.value as Home; return { value: undefined } })
  on('ui.open', () => ({ value: { isPlaced: true } })); on('ui.status', () => ({ value: undefined }))
  on('ui.toast', () => { throw new Error('cosmetic toast failed') })
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000 }, rateLimits: [], cost: { usd: 0 } } }))
  on('turn.complete', () => ({ text: 'real answer' }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'real tool output', stderr: '', interrupted: false } }))
  await $.command.run({ command: 'cat', args: 'show', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  const result = await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect(result.result).toEqual({ stdout: 'real tool output', stderr: '', interrupted: false })
  const before = stored.coins
  const turn = await $.turn.complete({ answer: 'real answer', durationMs: 60000, isAborted: false, turnId: 't', reason: 'answer' })
  expect(turn.text).toBe('real answer')
  expect(stored.coins).toBeGreaterThan(before)
  expect(stored.miles.counts.turns).toBe(1)
})

test('failed reward and reaction store writes cannot replace a successful tool result', async ($, on) => {
  const now = new Date(2026, 9, 5, 12).getTime()
  mock.clock(on, { now })
  let stored: Home = { ...newHome(now), rev: 100 }, isBroken = false
  on('store.get', () => ({ value: stored }))
  on('store.set', (_, e) => { if (isBroken) throw new Error('store unavailable'); stored = e.value as Home; return { value: undefined } })
  on('ui.open', () => ({ value: { isPlaced: true } })); on('ui.status', () => ({ value: undefined })); on('ui.toast', () => ({ value: undefined }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: 'tool succeeded', stderr: '', interrupted: false } }))
  await $.command.run({ command: 'cat', args: 'show', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  isBroken = true
  const result = await $.tool.call({ tool: 'Bash', command: 'npm test' })
  expect(result.result).toEqual({ stdout: 'tool succeeded', stderr: '', interrupted: false })
})
