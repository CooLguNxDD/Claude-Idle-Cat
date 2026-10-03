import { expect, test } from 'claude-code/testing'
import type { Home } from '../types'
import { EXPEDITIONS } from './content'
import { activeCat, act, coinRate, migrate, reward, newHome, tick } from './game'
import { canSend, claim, finishExpeditions, isAway, lootOf, readyRuns, resumeExpeditions, send, slotsOf } from './expeditions'
import { catsAtHome } from './away'

const now = new Date(2026, 9, 5, 12).getTime()
const family = (n = 3): Home => { const h = newHome(now), cat = h.cats[0]!; return { ...h, coins: 10000, cats: Array.from({ length: n }, (_, i) => ({ ...cat, id: `c${i + 1}`, name: `Cat${i}`, level: 25 })) } }
test('send pays energy and coins once, excludes cats from the yard and enforces outstanding slots', () => {
  const h = family(), sent = send(h, 'garden-patrol', ['c1', 'c2'], [], now, 7)
  expect(sent.coins).toBe(h.coins - 10)
  expect(sent.cats.map(c => c.energy)).toEqual([70, 70, 80])
  expect(sent.expeditions.runs.length).toBe(1); expect(isAway(sent, 'c1')).toBe(true)
  expect(activeCat(sent).id).toBe('c3'); expect(catsAtHome(sent).length).toBe(1)
  expect(canSend(sent, 'garden-patrol', ['c3'], now).ok).toBe(false)
  expect(send(sent, 'garden-patrol', ['c1'], [], now, 7).coins).toBe(sent.coins)
  expect(canSend(h, 'garden-patrol', ['c1', 'c1'], now).ok).toBe(false)
})
test('slots, parties, season, maps, world and levels gate departure', () => {
  const h = family(4)
  expect([0, 1, 2, 5].map(tier => slotsOf({ ...h, tier }))).toEqual([1, 2, 3, 4])
  expect(slotsOf({ ...h, owned: [...h.owned, 'expedition-permit'] })).toBe(2)
  expect(canSend(h, 'garden-patrol', h.cats.map(c => c.id), now).ok).toBe(false)
  const party = { ...h, cats: h.cats.map((c, i) => i ? c : { ...c, skills: { matriarch: 1 } }) }
  expect(canSend(party, 'garden-patrol', party.cats.map(c => c.id), now).ok).toBe(true)
  expect(canSend(h, 'deep-woods', ['c1'], now).ok).toBe(false)
  expect(canSend({ ...h, tier: 1 }, 'deep-woods', ['c1'], now).ok).toBe(true)
  expect(canSend(h, 'pumpkin-patch', ['c1'], new Date(2026, 10, 1).getTime()).ok).toBe(false)
  expect(canSend(h, 'moon-crater', ['c1'], now).ok).toBe(false)
  expect(canSend({ ...h, tier: 5, owned: [...h.owned, 'star-map'] }, 'moon-crater', ['c1'], now).ok).toBe(true)
  expect(canSend(h, 'neon-rooftops', ['c1'], now).ok).toBe(false)
  expect(canSend({ ...h, world: { id: 'neon-alley' } }, 'neon-rooftops', ['c1'], now).ok).toBe(true)
  expect(canSend({ ...h, cats: h.cats.map(c => ({ ...c, level: 1 })) }, 'pumpkin-patch', ['c1'], now).ok).toBe(false)
})
test('loot is seeded at departure, bounded and independent of claim-time changes', () => {
  const h = family(), e = EXPEDITIONS.find(e => e.id === 'garden-patrol')!
  for (let seed = 0; seed < 100; seed++) {
    const sent = send(h, e.id, ['c1', 'c2'], [], now, seed), run = sent.expeditions.runs[0]!
    expect(lootOf(run, sent)).toEqual(lootOf(send(h, e.id, ['c1', 'c2'], [], now, seed).expeditions.runs[0]!))
    expect(lootOf(run, { ...h, tier: 6, decor: {}, cats: h.cats.map(c => ({ ...c, level: 1 })) })).toEqual(lootOf(run))
    expect(run.loot.coins).toBeLessThanOrEqual(coinRate(h) * 240)
    expect(Object.values(run.loot.materials).reduce((n, v) => n + v, 0)).toBeGreaterThanOrEqual(2)
    expect(run.endsAt - now).toBeGreaterThanOrEqual(600000)
  }
})
test('offline completion waits for claim, which pays once, grants XP and frees the party', () => {
  const h = family(), sent = send(h, 'garden-patrol', ['c1', 'c2'], [], now, 19), run = sent.expeditions.runs[0]!, end = now + 86400000
  expect(claim(sent, run.id, now)).toBe(sent)
  const loaded = migrate(JSON.parse(JSON.stringify(sent)), end), ready = finishExpeditions(loaded, end)
  expect(readyRuns(ready, end).length).toBe(1); expect(ready.expeditions.inbox).toContain(run.id)
  expect(isAway(ready, 'c1', end)).toBe(true)
  const claimed = claim(ready, run.id, end)
  expect(claimed.coins).toBe(sent.coins + run.loot.coins)
  expect(claimed.materials).toEqual(run.loot.materials)
  expect(claimed.cats[0]!.xp).toBe(40); expect(claimed.cats[1]!.xp).toBe(40)
  expect(claimed.bonds['c1|c2']!.points).toBe(3)
  expect(claimed.expeditions.done['garden-patrol']).toBe(1)
  expect(isAway(claimed, 'c1')).toBe(false); expect(claimed.expeditions.inbox).toEqual([])
  expect(claim(claimed, run.id, end)).toBe(claimed)
})
test('gear is validated and consumed once; skill and home bonuses reduce duration within bounds', () => {
  const h = { ...family(), gear: { 'trail-snacks': 1, 'big-satchel': 1 }, cats: family().cats.map(c => ({ ...c, skills: { scout: 1, trailblazer: 1 } })) }
  const bad = send(h, 'deep-woods', ['c1'], ['missing'], now, 1)
  expect(bad.gear).toEqual(h.gear); expect(bad.coins).toBe(h.coins)
  const sent = send({ ...h, tier: 3, decor: { toy: 'map-table' } }, 'deep-woods', ['c1'], ['trail-snacks', 'big-satchel'], now, 7)
  expect(sent.gear['trail-snacks']).toBe(0); expect(sent.gear['big-satchel']).toBe(0)
  expect(Math.abs(sent.expeditions.runs[0]!.endsAt - now - 90 * 60000 * 0.85 * 0.9 * 0.8)).toBeLessThan(1)
  const duplicate = send({ ...h, tier: 1 }, 'deep-woods', ['c1'], ['trail-snacks', 'trail-snacks'], now, 1)
  expect(duplicate.coins).toBe(h.coins)
})
test('all-away households cannot earn yard income, find critters or receive care', () => {
  const h = family(1), away = send(h, 'garden-patrol', ['c1'], [], now, 1)
  expect(coinRate(away)).toBe(0)
  const later = tick(away, now + 3600000, () => 0)
  expect(later.coins).toBe(away.coins); expect(later.pocket).toEqual({})
  expect(later.cats[0]!.energy).toBe(away.cats[0]!.energy)
  expect(act(away, 'feed', now).coins).toBe(away.coins)
  expect(reward(away, 0, 10, now).cats[0]!.xp).toBe(away.cats[0]!.xp)
})
test('v3 saves missing the new fields receive independent defaults and remain v3', () => {
  const { bonds, quests, expeditions, materials, gear, exchanges, ...old } = family()
  const migrated = migrate(old, now)
  expect(migrated.version).toBe(3); expect(migrated.bonds).toEqual({}); expect(migrated.materials).toEqual({}); expect(migrated.gear).toEqual({})
  expect(migrated.expeditions).toEqual({ runs: [], done: {}, inbox: [] }); expect(migrated.quests.progress).toEqual({})
})

test('Astral accelerates only offline expedition time and is applied once on resume', () => {
  const h = { ...family(), cats: family().cats.map(c => ({ ...c, skills: { astral: 1 } })), tier: 1 }
  const sent = send(h, 'deep-woods', ['c1'], [], now, 9), run = sent.expeditions.runs[0]!
  expect(run.endsAt - now).toBe(90 * 60000)
  const resumed = resumeExpeditions(sent, now + 30 * 60000), changed = resumed.expeditions.runs[0]!
  expect(Math.abs(changed.endsAt - run.endsAt + 6 * 60000)).toBeLessThan(1)
  expect(resumeExpeditions(resumed, now + 30 * 60000).expeditions.runs[0]!.endsAt).toBe(changed.endsAt)
  expect(changed.loot).toEqual(run.loot)
})
test('the late-game progression path can obtain every map material before its unlocked trail', () => {
  const h = { ...family(), tier: 5, world: { id: 'neon-alley' } }
  const neon = send(h, 'neon-rooftops', ['c1'], [], now, 7).expeditions.runs[0]!
  expect(Object.keys(neon.loot.materials).some(id => ['neon-scrap', 'feather'].includes(id))).toBe(true)
  const moon = { ...h, owned: [...h.owned, 'star-map'] }
  expect(canSend(moon, 'moon-crater', ['c1'], now).ok).toBe(true)
})
