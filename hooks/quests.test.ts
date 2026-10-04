import { addBond } from './pair'
import { expect, test } from 'claude-code/testing'
import { newHome } from './game'
import { track } from './collection'
import { claimQuest, questsFor } from './quests'
import { activeEvents, exchange, materialBoost } from './events'
import { seeded } from './rng'
import { send } from './expeditions'

test('daily quest picks are seeded and chains advance one current step per action', () => {
  const now = new Date(2026, 9, 6, 12).getTime(), qs = questsFor(now)
  expect(qs.length).toBe(2); expect(qs).toEqual(questsFor(now + 1000))
  const q = qs[0]!
  let home = newHome(now)
  expect(claimQuest(home, q.id, now)).toBe(home)
  for (const step of q.steps) {
    home = track(home, step.counter, step.goal - 1, now, step.material ? { [step.material]: step.goal - 1 } : {})
    home = track(home, step.counter, 1, now, step.material ? { [step.material]: 1 } : {})
  }
  expect(home.quests.progress[q.id]!.step).toBe(q.steps.length)
  const claimed = claimQuest(home, q.id, now)
  expect(claimed.quests.claimed).toContain(q.id)
  expect(claimed.coins).toBe(home.coins + (q.reward.coins ?? 0))
  expect(claimQuest(claimed, q.id, now)).toBe(claimed)
  expect(track(claimed, 'pet', 1, now + 86400000).quests.claimed).toEqual([])
})
test('seasonal quests and boost events follow local months and weekdays', () => {
  const october = new Date(2026, 9, 3, 12).getTime(), monday = new Date(2026, 9, 5, 12).getTime()
  expect(materialBoost(october)).toBe(1.5); expect(materialBoost(monday)).toBe(1)
  expect(materialBoost(new Date(2026, 5, 6, 12).getTime())).toBe(1)
  for (let day = 1; day <= 31; day++) expect(questsFor(new Date(2026, 10, day, 12).getTime()).some(q => q.id === 'pumpkin-friends')).toBe(false)
  expect(activeEvents(new Date(2026, 11, 1, 12).getTime()).some(e => e.kind === 'exchange')).toBe(true)
})
test('December gifts work between household pairs and visiting cats once per day', () => {
  const now = new Date(2026, 11, 5, 12).getTime(), h = newHome(now), cat = h.cats[0]!
  const family = { ...h, coins: 1000, cats: [cat, { ...cat, id: 'c2', name: 'Miso' }], visitors: [{ id: 'v1', name: 'Boo', genes: cat.genes, arrivedAt: now, leavesAt: now + 3600000, gift: 10 }] }
  const swapped = exchange(family, 'c1', 'c2', now, seeded(1))
  expect(swapped.bonds['c1|c2']!.points).toBe(3)
  expect(exchange(swapped, 'c2', 'c1', now, seeded(1)).bonds).toEqual(swapped.bonds)
  const visit = exchange(swapped, 'c1', 'v1', now, seeded(2))
  expect(visit.coins).toBeGreaterThan(swapped.coins)
  expect(exchange(visit, 'c2', 'v1', now, seeded(2)).coins).toBe(visit.coins)
  expect(exchange(family, 'c1', 'c2', new Date(2026, 10, 1).getTime(), seeded(1)).bonds).toEqual({})
  const away = send(family, 'garden-patrol', ['c2'], [], now, 3)
  expect(exchange(away, 'c1', 'c2', now, seeded(1)).bonds).toEqual({})
})

test('pumpkin quests count pumpkin quantities from claims rather than expedition count', () => {
  let now = new Date(2026, 9, 1, 12).getTime()
  while (!questsFor(now).some(q => q.id === 'pumpkin-friends')) now += 86400000
  let h = track(newHome(now), 'expedition', 20, now, { feather: 20 })
  expect(h.quests.progress['pumpkin-friends']!.count).toBe(0)
  h = track(h, 'expedition', 1, now, { pumpkin: 6 })
  expect(h.quests.progress['pumpkin-friends']!.count).toBe(6)
  h = track(h, 'expedition', 1, now, { pumpkin: 4 })
  expect(h.quests.progress['pumpkin-friends']!.step).toBe(1)
})

test('exchange reports the bond cap accurately while retaining its daily gift receipt', () => {
  const now = new Date(2026, 11, 5, 12).getTime(), h = newHome(now)
  const family = { ...h, cats: [...h.cats, { ...h.cats[0]!, id: 'c2', name: 'Miso' }] }
  const capped = addBond(family, 'c1', 'c2', 10, now)
  const swapped = exchange(capped, 'c1', 'c2', now, seeded(1))
  expect(swapped.bonds['c1|c2']!.points).toBe(10)
  expect(swapped.log).toContain('Daily bond cap reached')
  expect(exchange(swapped, 'c1', 'c2', now, seeded(1)).log).toBe('Already exchanged today.')
  expect(exchange(family, 'c1', 'c2', new Date(2026, 5, 5).getTime(), seeded(1)).log).toBe('No gift exchange event is active.')
})
