import { expect, test } from 'claude-code/testing'
import { newHome, migrate, coinRate, tick } from './game'
import { parseBackup } from './backup'
import { claim, send, finishExpeditions } from './expeditions'
import { seeded } from './rng'
import { localDay } from './time'

const now = new Date(2026, 9, 5, 12).getTime()
test('malformed new-field backups normalize to safe defaults and can run the game', () => {
  for (const bad of [null, [], 'invalid', 3, {}]) {
    const home = { ...newHome(now), expeditions: bad, quests: bad, bonds: bad, materials: bad, gear: bad, exchanges: bad }
    const parsed = parseBackup(JSON.stringify({ app: 'afk-cat', format: 1, home }), now)
    expect('home' in parsed).toBe(true)
    if (!('home' in parsed)) return
    expect(parsed.home.expeditions).toEqual({ runs: [], done: {}, inbox: [] })
    expect(parsed.home.bonds).toEqual({}); expect(parsed.home.materials).toEqual({}); expect(parsed.home.gear).toEqual({})
    expect(parsed.home.quests).toEqual({ day: 0, progress: {}, claimed: [] })
    expect(Number.isFinite(coinRate(tick(parsed.home, now + 60000, seeded(4))))).toBe(true)
  }
})
test('migration preserves frozen loot and ready inbox receipts; claim still pays exactly once', () => {
  const h = { ...newHome(now), coins: 1000 }, sent = send(h, 'garden-patrol', ['c1'], [], now, 7)
  const run = sent.expeditions.runs[0]!, ready = finishExpeditions(sent, run.endsAt)
  const loaded = migrate(JSON.parse(JSON.stringify(ready)), run.endsAt)
  expect(loaded.expeditions.runs[0]).toEqual(run)
  expect(loaded.expeditions.inbox).toEqual([run.id])
  expect(finishExpeditions(loaded, run.endsAt)).toBe(loaded)
  const paid = claim(loaded, run.id, run.endsAt)
  expect(paid.coins).toBe(sent.coins + run.loot.coins)
  expect(claim(paid, run.id, run.endsAt)).toBe(paid)
})
test('invalid runs, duplicate reservations and nonfinite progression amounts cannot survive migration', () => {
  const h = { ...newHome(now), coins: 1000 }, sent = send(h, 'garden-patrol', ['c1'], [], now, 7), run = sent.expeditions.runs[0]!
  const loaded = migrate({ ...sent,
    expeditions: { runs: [null, { ...run, id: 'bad-cat', cats: ['missing'] }, { ...run, id: 'bad-exp', exp: 'unknown' }, { ...run, id: 'bad-time', endsAt: Infinity }, { ...run, id: 'bad-loot', loot: null }, run, { ...run, id: 'duplicate-party' }], inbox: [null, run.id, 'missing'], done: { 'garden-patrol': -2, 'material:pumpkin': Infinity, unknown: 5 } },
    materials: { feather: -5, shell: 3.8, stardust: NaN, unknown: 10 }, gear: { 'trail-snacks': 2.5, 'catnip-tea': -1, unknown: 20 },
    cats: [...h.cats, { ...h.cats[0]!, id: 'c2' }], bonds: { 'c1|c2': { points: Infinity, day: localDay(now), today: 999 }, 'c1|missing': {} },
    quests: { day: localDay(now), progress: { unknown: { step: 999 }, 'pumpkin-friends': { step: -2, count: Infinity } }, claimed: [null, 'unknown'] },
  }, now)
  expect(loaded.expeditions.runs).toEqual([run]); expect(loaded.expeditions.inbox).toEqual([run.id])
  expect(loaded.materials).toEqual({ feather: 0, shell: 3, stardust: 0 })
  expect(loaded.gear).toEqual({ 'trail-snacks': 2, 'catnip-tea': 0 })
  expect(loaded.bonds).toEqual({ 'c1|c2': { points: 0, day: localDay(now), today: 10 } })
  expect(loaded.quests.progress).toEqual({ 'pumpkin-friends': { step: 0, count: 0 } })
})
