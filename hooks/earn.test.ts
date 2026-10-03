import { expect, mock, test } from 'claude-code/testing'
import type { Home } from '../types'
import { activePay, coinRate, newHome, rampOf, spendPay } from './game'
import { fmtCoins } from './home'

const TEN_MIN = 10 * 60_000
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6

test('a finished reply pays its active time plus what it cost the session, ramped by the chat so far', async ($, on) => {
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
  const finish = async (durationMs: number) => {
    const before = stored.coins
    await $.turn.complete({ answer: 'ok', durationMs, isAborted: false, turnId: 't', reason: 'answer' })
    await clock.advance(10)
    return stored.coins - before
  }
  // A quick prompt earns next to nothing. Spend from before this session's first reply is already counted at start.
  expect(near(await finish(10), activePay(stored, 10))).toBe(true)
  expect(activePay(stored, 10)).toBeLessThan(0.01)
  const ramp = rampOf(10 / 60_000)
  expect(near(await finish(TEN_MIN), activePay(stored, TEN_MIN) * ramp)).toBe(true)
  usd = 1.5
  const second = rampOf(10 + 10 / 60_000)
  expect(near(await finish(TEN_MIN), (activePay(stored, TEN_MIN) + spendPay(stored, 0.5)) * second)).toBe(true)
  expect(stored.log).toMatch(/Claude worked 10m/)
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
    await $.turn.complete({ answer: 'ok', durationMs: TEN_MIN, isAborted: false, turnId, reason: 'answer' })
    await clock.advance(10)
    return toasts[toasts.length - 1]
  }
  const first = activePay(stored, TEN_MIN)
  expect(await reply('t1')).toBe(`💰 +${fmtCoins(first)} this prompt · +${fmtCoins(first)} this chat · ×1.0 session`)
  usd = 1.5
  const ramp = rampOf(10)
  const second = (activePay(stored, TEN_MIN) + spendPay(stored, 0.5)) * ramp
  expect(await reply('t2')).toBe(`💰 +${fmtCoins(second)} this prompt · +${fmtCoins(first + second)} this chat · ×${ramp.toFixed(1)} session`)
})

test('a failed or garbled usage read still starts the session and pays active time', async ($, on) => {
  const now = 1_700_000_000_000
  const clock = mock.clock(on, { now })
  const cats = newHome(now).cats.map(c => ({ ...c, level: 10 }))
  let stored: Home = { ...newHome(now), cats, coins: 0, rev: 100 }
  let isBroken = true
  on('store.get', () => ({ value: stored }))
  on('store.set', ($, e) => { stored = e.value as Home; return { value: undefined } })
  on('session.usage', () => {
    if (isBroken) throw new Error('no ledger')
    return { value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [], cost: { usd: NaN } } }
  })
  on('command.register', () => ({ value: { command: 'cat' } }))
  on('config.list', () => ({ value: [] }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('turn.complete', () => ({ text: '' }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const finish = async () => {
    const before = stored.coins
    await $.turn.complete({ answer: 'ok', durationMs: TEN_MIN, isAborted: false, turnId: 't', reason: 'answer' })
    await clock.advance(10)
    return stored.coins - before
  }
  expect(near(await finish(), activePay(stored, TEN_MIN))).toBe(true)
  isBroken = false
  expect(near(await finish(), activePay(stored, TEN_MIN) * rampOf(10))).toBe(true)
  expect(Number.isFinite(stored.coins)).toBe(true)
})

test('spend from before the first good usage read is never paid', async ($, on) => {
  const now = 1_700_000_000_000
  const clock = mock.clock(on, { now })
  const cats = newHome(now).cats.map(c => ({ ...c, level: 10 }))
  let stored: Home = { ...newHome(now), cats, coins: 0, rev: 100 }
  let usd: number | null = null
  on('store.get', () => ({ value: stored }))
  on('store.set', ($, e) => { stored = e.value as Home; return { value: undefined } })
  on('session.usage', () => {
    if (usd === null) throw new Error('no ledger')
    return { value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [], cost: { usd } } }
  })
  on('command.register', () => ({ value: { command: 'cat' } }))
  on('config.list', () => ({ value: [] }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.status', () => ({ value: undefined }))
  on('turn.complete', () => ({ text: '' }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const finish = async () => {
    const before = stored.coins
    await $.turn.complete({ answer: 'ok', durationMs: TEN_MIN, isAborted: false, turnId: 't', reason: 'answer' })
    await clock.advance(10)
    return stored.coins - before
  }
  usd = 5
  expect(near(await finish(), activePay(stored, TEN_MIN))).toBe(true)
  usd = 5.5
  expect(near(await finish(), (activePay(stored, TEN_MIN) + spendPay(stored, 0.5)) * rampOf(10))).toBe(true)
})

test('a reply whose reward never lands is paid by the next reply', async ($, on) => {
  const now = 1_700_000_000_000
  const clock = mock.clock(on, { now })
  const cats = newHome(now).cats.map(c => ({ ...c, level: 10 }))
  let stored: Home = { ...newHome(now), cats, coins: 0, rev: 100 }
  let usd = 1
  let isDown = false
  on('store.get', () => {
    if (isDown) throw new Error('disk gone')
    return { value: stored }
  })
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
    await $.turn.complete({ answer: 'ok', durationMs: TEN_MIN, isAborted: false, turnId: 't', reason: 'answer' })
    await clock.advance(10)
    return stored.coins - before
  }
  isDown = true
  usd = 1.5
  expect(await finish()).toBe(0)
  isDown = false
  usd = 2
  // Both replies' active time and both halves of spend, still at the first reply's ramp.
  const owed = activePay(stored, TEN_MIN) + coinRate(stored) * 10 + spendPay(stored, 1)
  expect(near(await finish(), owed * rampOf(0))).toBe(true)
})
