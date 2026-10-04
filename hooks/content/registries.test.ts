import { ACHIEVEMENTS } from '../collection'
import { expect, test } from 'claude-code/testing'
import { BEHAVIORS, EVENTS, EXPEDITIONS, FURNITURE, GOALS, INTERACTIONS, MATERIALS, MOVES, QUESTS, REACTIONS, SHOP, SKILL_FILES, SPEECH, WORLDS } from './index'
import { behaviorProblems, eventProblems, expeditionProblems, furnitureProblems, goalProblems, interactionProblems, materialProblems, questProblems, reactionProblems, shopProblems, skillProblems, speechProblems, unlockProblems, worldProblems } from './types'
import { dailyStock } from '../home'
import { newHome } from '../game'
import { skillTotals } from '../skills'
import { STOCK, TOTALS } from './legacy-fixture'

test('all content modules validate and every registry has unique ids', () => {
  for (const [registry, problems] of [
    [SKILL_FILES, SKILL_FILES.flatMap(s => skillProblems(s, SKILL_FILES))], [FURNITURE, FURNITURE.flatMap(s => furnitureProblems(s, MATERIALS))],
    [SHOP, SHOP.flatMap(s => [...shopProblems(s, MATERIALS, FURNITURE), ...unlockProblems(s.unlock, { expeditions: EXPEDITIONS, shop: SHOP, worlds: WORLDS, achievements: ACHIEVEMENTS })])],
    [MATERIALS, MATERIALS.flatMap(materialProblems)], [REACTIONS, REACTIONS.flatMap(s => reactionProblems(s, MOVES))],
    [INTERACTIONS, INTERACTIONS.flatMap(s => interactionProblems(s, MOVES))], [EVENTS, EVENTS.flatMap(eventProblems)],
    [EXPEDITIONS, EXPEDITIONS.flatMap(s => [...expeditionProblems(s, MATERIALS, [...FURNITURE, ...SHOP]), ...unlockProblems(s.unlock, { expeditions: EXPEDITIONS, shop: SHOP, worlds: WORLDS, achievements: ACHIEVEMENTS })])],
    [QUESTS, QUESTS.flatMap(s => questProblems(s, MATERIALS, FURNITURE))],
    [BEHAVIORS, BEHAVIORS.flatMap(s => behaviorProblems(s, MOVES))],
    [GOALS, GOALS.flatMap(goalProblems)],
    [SPEECH, SPEECH.flatMap(s => speechProblems(s, { behaviors: BEHAVIORS, interactions: INTERACTIONS }))],
    [WORLDS, WORLDS.flatMap(w => worldProblems(w, MATERIALS, WORLDS))],
  ] as const) {
    expect(problems).toEqual([])
    expect(new Set(registry.map(s => s.id)).size).toBe(registry.length)
  }
})
test('Nyan retains the exact pre-refactor 40-day sequence with the late pack installed', () => {
  const stock = Array.from({ length: 40 }, (_, d) => dailyStock(new Date(2026, 0, 1 + d, 12).getTime()).map(i => i.id))
  expect(stock).toEqual(STOCK)
  expect(dailyStock(new Date(2026, 9, 1, 12).getTime()).every(i => !i.cost && !i.minTier)).toBe(true)
})
test('every legacy skill total is unchanged on the captured fixed cat', () => {
  const cat = { ...newHome(0).cats[0]!, skills: { claws: 3, nose: 1, prowl: 1, apex: 1, paws: 3, purr: 1, charm: 1, beloved: 1, catnap: 3, deep: 1, walk: 1, lucid: 1 } }
  const totals = skillTotals(cat)
  for (const [key, n] of Object.entries(TOTALS)) expect(totals[key as keyof typeof totals]).toBe(n)
})
test('validators reject excess bonuses, broken references, NaN and out-of-season metadata', () => {
  expect(furnitureProblems({ ...FURNITURE[0]!, mods: { coin: 2.51 } }, MATERIALS).length).toBeGreaterThan(0)
  expect(furnitureProblems({ ...FURNITURE[0]!, slot: 'bed', bowl: { cap: 30, portion: 30 } }, MATERIALS).length).toBeGreaterThan(0)
  expect(skillProblems({ ...SKILL_FILES[0]!, per: { expTime: -0.5 } }, SKILL_FILES).length).toBeGreaterThan(0)
  expect(expeditionProblems({ ...EXPEDITIONS[0]!, minutes: 9 }, MATERIALS).length).toBeGreaterThan(0)
  expect(expeditionProblems({ ...EXPEDITIONS[0]!, loot: { ...EXPEDITIONS[0]!.loot, coins: [0, 241] } }, MATERIALS).length).toBeGreaterThan(0)
  expect(expeditionProblems({ ...EXPEDITIONS[0]!, available: { months: [0] } }, MATERIALS).length).toBeGreaterThan(0)
  expect(reactionProblems({ ...REACTIONS[0]!, odds: NaN }, MOVES).length).toBeGreaterThan(0)
  expect(interactionProblems({ ...INTERACTIONS[0]!, roles: { lead: 'missing', partner: 'sit' } }, MOVES).length).toBeGreaterThan(0)
  expect(behaviorProblems({ ...BEHAVIORS[0]!, move: 'missing', seconds: 601 }, MOVES).length).toBeGreaterThan(0)
  expect(goalProblems({ ...GOALS[0]!, need: { ...GOALS[0]!.need, weight: 11 } }).length).toBeGreaterThan(0)
  expect(speechProblems({ ...SPEECH[0]!, on: 'idle', role: 'lead', lines: ['{nope}'] }, { behaviors: BEHAVIORS, interactions: INTERACTIONS }).length).toBeGreaterThan(0)
  expect(worldProblems({ ...WORLDS[0]!, cost: { coins: -1 } }, MATERIALS, WORLDS).length).toBeGreaterThan(0)
  expect(shopProblems({ ...SHOP[0]!, cost: { materials: { unknown: 1 } } }, MATERIALS, FURNITURE).length).toBeGreaterThan(0)
})

test('unlock references use achievements and map grants; miles listings cannot hide other costs', () => {
  expect(unlockProblems({ achievement: 'typo' }, { achievements: ACHIEVEMENTS })).toEqual(['unlock: unknown achievement'])
  expect(unlockProblems({ achievement: ACHIEVEMENTS[0]!.id }, { achievements: ACHIEVEMENTS })).toEqual([])
  const map = { ...SHOP.find(s => s.kind === 'map')!, id: 'map-listing', grants: 'map-token' }
  expect(unlockProblems({ item: 'map-token' }, { shop: [map] })).toEqual([])
  expect(unlockProblems({ item: 'map-listing' }, { shop: [map] })).toEqual(['unlock: unknown map'])
  const miles = SHOP.find(s => s.shop === 'miles')!
  for (const cost of [{ coins: 10 }, { miles: 0 }, { miles: 10, materials: { feather: 1 } }, { miles: 10, coins: 1 }])
    expect(shopProblems({ ...miles, cost }, MATERIALS, FURNITURE).length).toBeGreaterThan(0)
})
