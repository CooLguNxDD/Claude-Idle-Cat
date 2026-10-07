import { expect, test } from 'claude-code/testing'
import type { Home } from '../types'
import { EXPEDITIONS } from './content'
import { newHome } from './game'
import { canSend, lootOf, send } from './expeditions'
import { trailCells, trailImage } from './scene/trail'
import { FLAVORS } from './theme'
import { beatAt, captionOf, foundSoFar, isFound, partyOf, trailOf } from './trail'

const now = new Date(2026, 9, 5, 12).getTime()
const family = (): Home => { const h = newHome(now), cat = h.cats[0]!; return { ...h, tier: 5, coins: 10000, owned: [...h.owned, 'harbor-map', 'star-map'],
  cats: Array.from({ length: 3 }, (_, i) => ({ ...cat, id: `c${i + 1}`, name: `Cat${i}`, level: 25 })) } }
const runOf = (exp: string, seed: number) => send(family(), exp, ['c1', 'c2'], [], now, seed).expeditions.runs[0]!

test('a trail replays identically from its run and covers departure to return', () => {
  for (const e of EXPEDITIONS.filter(e => canSend(family(), e.id, ['c1', 'c2'], now).ok)) for (let seed = 0; seed < 20; seed++) {
    const run = runOf(e.id, seed), trail = trailOf(run)
    expect(trailOf(run)).toEqual(trail)
    expect(trail.backdrop).toBe(e.flow?.backdrop ?? 'garden')
    expect(trail.beats[0]!.at).toBe(run.startAt)
    expect(trail.beats.at(-1)!.until).toBe(run.endsAt)
    expect(trail.beats.at(-1)!.event.kind).toBe('return')
    trail.beats.slice(1).forEach((b, i) => expect(b.at).toBe(trail.beats[i]!.until))
    expect(trail.beats.filter(b => b.event.kind === 'boss').length).toBeLessThanOrEqual(1)
  }
})
test('trail beats never change the loot rolled at departure', () => {
  for (let seed = 0; seed < 30; seed++) {
    const run = runOf('deep-woods', seed)
    trailOf(run)
    expect(lootOf(run)).toEqual(lootOf(runOf('deep-woods', seed)))
  }
})
test('found loot only grows and equals the frozen loot when the party is due', () => {
  for (let seed = 0; seed < 30; seed++) {
    const run = runOf('riverbank', seed), trail = trailOf(run), loot = lootOf(run)
    let last = -1
    for (let t = run.startAt; t <= run.endsAt; t += 60_000) {
      const f = foundSoFar(trail, t), n = f.coins + Object.values(f.materials).reduce((a, b) => a + b, 0) + f.critters.length
      expect(n).toBeGreaterThanOrEqual(last)
      last = n
    }
    const done = foundSoFar(trail, run.endsAt)
    expect(done.coins).toBe(loot.coins)
    expect(done.materials).toEqual(Object.fromEntries(Object.entries(loot.materials).filter(([, n]) => n > 0)))
    expect([...done.critters].sort()).toEqual([...loot.critters].sort())
    expect(done.item).toBe(loot.item)
  }
})
test('a beat walks in, plays its moves and resolves inside each loop', () => {
  const run = runOf('pumpkin-patch', 3), trail = trailOf(run)
  const fight = trail.beats.find(b => b.event.kind !== 'walk' && b.event.kind !== 'return')!
  const loop = fight.event.seconds * 1000
  expect(beatAt(trail, fight.at).stage).toBe('approach')
  expect(beatAt(trail, fight.at + loop * 0.5).stage).toBe('action')
  expect(beatAt(trail, fight.at + loop * 0.9).stage).toBe('resolve')
  expect(fight.event.moves).toContain(beatAt(trail, fight.at + loop * 0.9).move)
  expect(isFound(fight, fight.at)).toBe(false)
  expect(isFound(fight, fight.at + loop)).toBe(true)
  expect(beatAt(trail, run.endsAt + 1).index).toBe(trail.beats.length - 1)
  expect(captionOf(fight, 'Mochi')).not.toContain('{cat}')
})
test('the trail picture draws a camp with no runs and the watched run in both scene modes', () => {
  const idle = family(), sent = send(idle, 'garden-patrol', ['c1'], [], now, 1)
  for (const home of [idle, sent]) for (const t of [now, now + 300_000, now + 10 * 3_600_000]) {
    expect(trailCells(home, t, 3, FLAVORS.mocha, 40, 0).length).toBeGreaterThan(0)
    expect(trailImage(home, t, 3, FLAVORS.latte, 40, 5, 4).width).toBe(160)
  }
  expect(trailCells(sent, now + 60_000, 3, FLAVORS.mocha, 40, 0)).not.toBe(trailCells(idle, now + 60_000, 3, FLAVORS.mocha, 40, 0))
})
test('every trail reserves a finding beat before the walk home, even at ten minutes', () => {
  const finds = ['forage', 'treasure', 'discover']
  for (const e of EXPEDITIONS.filter(e => canSend(family(), e.id, ['c1', 'c2'], now).ok)) for (let seed = 0; seed < 30; seed++) {
    const run = runOf(e.id, seed), short = { ...run, endsAt: run.startAt + 600_000 }
    for (const r of [run, short]) expect(trailOf(r).beats.slice(0, -1).some(b => finds.includes(b.event.kind))).toBe(true)
  }
})
test('a run that ends at or before departure still draws and reveals its whole loot', () => {
  const run = runOf('garden-patrol', 4)
  for (const endsAt of [run.startAt, run.startAt - 5000]) {
    const odd = { ...run, endsAt }, trail = trailOf(odd)
    expect(trail.beats.every(b => b.at >= run.startAt && b.until <= trail.endsAt && b.at <= b.until)).toBe(true)
    expect(beatAt(trail, run.startAt).index).toBe(trail.beats.length - 1)
    expect(foundSoFar(trail, run.startAt).coins).toBe(lootOf(run).coins)
  }
})
test('the caption lead is the last cat still home in the run, as drawn', () => {
  const h = family(), sent = send(h, 'garden-patrol', ['c1', 'c2'], [], now, 2), run = sent.expeditions.runs[0]!
  expect(partyOf(sent, run).lead).toBe('Cat1')
  const gone = { ...sent, cats: sent.cats.filter(c => c.id !== 'c2') }
  expect(partyOf(gone, run)).toEqual({ cats: [gone.cats[0]!], lead: 'Cat0' })
  expect(partyOf({ ...sent, cats: [] }, run).lead).toBe('The party')
})
