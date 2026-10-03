import { expect, mock, test } from 'claude-code/testing'
import type { Home } from '../types'
import { newHome, spendPay, turnPay } from './game'
import { fmtCoins } from './home'

test('a finished reply pays the turn fee plus what it cost the session', async ($, on) => {
  const now = 1_700_000_000_000
  const clock = mock.clock(on, { now })
  const cats = newHome(now).cats.map(c => ({ ...c, level: 10 }))
  let stored: Home = { ...newHome(now), cats, coins: 0, rev: 100 }
  let usd = 1
  on('store.get', () => ({ value: stored }))
  on('store.set', ($, e) => { stored = e.value as Home; return { value: undefined } })
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [], cost: { usd } } }))
  on('command.register', () => ({ value: { command: 'cat' } }))
  on('config.list', () => ({ value: [] }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('turn.complete', () => ({ text: '' }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const finish = async () => {
    const before = stored.coins
    await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId: 't', reason: 'answer' })
    await clock.advance(10)
    return stored.coins - before
  }
  // Spend from before this session's first reply is already counted at start.
  expect(await finish()).toBe(turnPay(stored))
  usd = 1.5
  expect(await finish()).toBe(turnPay(stored) + spendPay(stored, 0.5))
  expect(stored.log).toMatch(/Claude worked hard/)
})

test('each reply toasts the coins earned this prompt and this chat', async ($, on) => {
  const now = 1_700_000_000_000
  const clock = mock.clock(on, { now })
  const cats = newHome(now).cats.map(c => ({ ...c, level: 10 }))
  let stored: Home = { ...newHome(now), cats, coins: 0, rev: 100 }
  let usd = 1
  const toasts: string[] = []
  on('store.get', () => ({ value: stored }))
  on('store.set', ($, e) => { stored = e.value as Home; return { value: undefined } })
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [], cost: { usd } } }))
  on('command.register', () => ({ value: { command: 'cat' } }))
  on('config.list', () => ({ value: [] }))
  on('ui.toast', (_, e) => { toasts.push(e.text); return { value: undefined } })
  on('ui.status', () => ({ value: undefined }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const reply = async (turnId: string) => {
    await $.turn.start({ text: 'hi', turnId })
    await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId, reason: 'answer' })
    await clock.advance(10)
    return toasts[toasts.length - 1]
  }
  const first = turnPay(stored)
  expect(await reply('t1')).toBe(`💰 +${fmtCoins(first)} this prompt · +${fmtCoins(first)} this chat`)
  usd = 1.5
  const second = turnPay(stored) + spendPay(stored, 0.5)
  expect(await reply('t2')).toBe(`💰 +${fmtCoins(second)} this prompt · +${fmtCoins(first + second)} this chat`)
})
