import { expect, test } from 'claude-code/testing'
import { newHome } from './game'
import { craft, drinkTea, payCost } from './shop'
import { canLearn } from './skills'
import { homeMods } from './home'

test('Curio crafting pays exact material costs, enforces tier and grants furniture once', () => {
  const h = { ...newHome(0), coins: 10000, materials: { 'pine-cone': 15, shell: 12 } }
  expect(craft(h, 'map-table', 0).coins).toBe(h.coins)
  const bought = craft({ ...h, tier: 3 }, 'map-table', 0)
  expect(bought.coins).toBe(8800); expect(bought.materials).toEqual({ 'pine-cone': 5, shell: 12 })
  expect(bought.owned).toContain('map-table'); expect(bought.decor.toy).toBe('map-table'); expect(homeMods(bought).expTime).toBe(0.9)
  expect(craft(bought, 'map-table', 0).coins).toBe(bought.coins)
  expect(craft({ ...h, tier: 3, materials: {} }, 'map-table', 0).owned).not.toContain('map-table')
})
test('maps and charms are permanent, while gear and tea are inventory consumables', () => {
  const h = { ...newHome(0), coins: 10000, tier: 5, materials: { stardust: 10, 'neon-scrap': 10, feather: 10, 'pine-cone': 20 } }
  const map = craft(h, 'star-map', 0)
  expect(map.owned).toContain('star-map'); expect(map.materials['neon-scrap']).toBe(5)
  const tea = craft(map, 'catnip-tea', 0)
  expect(tea.gear['catnip-tea']).toBe(1)
  const drank = drinkTea({ ...tea, cats: tea.cats.map(c => ({ ...c, energy: 10 })) }, 'c1')
  expect(drank.gear['catnip-tea']).toBe(0); expect(drank.cats[0]!.energy).toBe(100)
  expect(drinkTea(drank, 'c1').gear).toEqual(drank.gear)
})
test('tier two skills preserve branches and require level 15, 20 or 25', () => {
  const cat = { ...newHome(0).cats[0]!, level: 14, skills: { apex: 1 } }
  expect(canLearn(cat, 'scout').ok).toBe(false); expect(canLearn({ ...cat, level: 15 }, 'scout').ok).toBe(true)
  expect(canLearn({ ...cat, level: 19, skills: { scout: 1 } }, 'trailblazer').ok).toBe(false)
  expect(canLearn({ ...cat, level: 24, skills: { trailblazer: 1 } }, 'legend').ok).toBe(false)
})

test('direct cost payment never spends missing materials or any other unaffordable currency', () => {
  const h = { ...newHome(0), materials: { shell: 5 }, miles: { ...newHome(0).miles, total: 10 } }
  for (const cost of [{ coins: 20 }, { miles: 11 }, { materials: { feather: 1 } }]) expect(payCost(h, cost)).toBe(h)
  const paid = payCost(h, { coins: 5, miles: 2, materials: { shell: 3 } })
  expect(paid.coins).toBe(5); expect(paid.miles.total).toBe(8); expect(paid.materials.shell).toBe(2)
})
