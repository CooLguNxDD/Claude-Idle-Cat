import { expect, test } from 'claude-code/testing'

import { COATS } from '../adoption/registry'
import { newHome } from '../game'
import { stepVisitors } from '../visitors'
import { seeded } from '../rng'
import { NAMED_CATS, WORLDS } from '.'
import { catProblems } from './types'
import type { NamedCat } from './types'
import { isContentAvailable } from './availability'

test('every named cat is valid against the coat and world registries', () => {
  for (const cat of NAMED_CATS) expect(catProblems(cat, COATS, WORLDS.map(w => w.id), NAMED_CATS)).toEqual([])
  const bad: NamedCat = { id: 'X', name: '', genes: { coat: 'plaid', eyes: 'green', personality: 'lazy' }, bio: 'b',
    catchphrase: 'c', appears: { odds: 0.9, worlds: ['moon'] } }
  const problems = catProblems(bad, COATS, ['backyard'], [bad])
  expect(problems).toContain('X: unknown coat plaid')
  expect(problems).toContain('X: unknown world moon')
  expect(problems.length).toBe(5)
})

test('named cats visit as rare strays with their own name, genes and catchphrase', () => {
  const now = new Date(2026, 9, 15, 12).getTime()
  for (const world of WORLDS) {
    const home = { ...newHome(now), tier: 2, world: { id: world.id } }
    const named = new Map<string, number>()
    let strays = 0
    for (let visit = 0; visit < 1500; visit++) {
      const next = stepVisitors({ ...home, visitors: [], nextId: visit + 2 }, now, 500, seeded(visit))
      for (const v of next.visitors) {
        strays += 1
        const cat = NAMED_CATS.find(c => c.name === v.name)
        if (!cat) continue
        expect(!cat.appears.worlds || cat.appears.worlds.includes(world.id)).toBe(true)
        named.set(cat.id, (named.get(cat.id) ?? 0) + 1)
        expect(v.genes.coat).toBe(cat.genes.coat)
        expect(v.genes.marking).toBe(cat.genes.marking ?? 'classic')
        expect(v.genes.silhouette).toBe(cat.genes.silhouette ?? 'classic')
        expect(v.genes.isShiny).toBe(false)
        if (v.id === next.visitors.at(-1)!.id) expect(next.log).toContain(cat.catchphrase)
      }
    }
    for (const cat of NAMED_CATS) {
      const share = (named.get(cat.id) ?? 0) / strays
      if (!isContentAvailable(cat.appears.available, now) || (cat.appears.worlds && !cat.appears.worlds.includes(world.id))) {
        expect(share).toBe(0)
      } else {
        expect(share).toBeGreaterThan(cat.appears.odds / 3)
        expect(share).toBeLessThan(cat.appears.odds * 3)
      }
    }
  }
})

test('named cats do not duplicate a name already in the household or yard', () => {
  const now = new Date(2026, 9, 15).getTime()
  const home = { ...newHome(now), tier: 2 }
  const taken = NAMED_CATS.map((c, i) => ({ ...home.cats[0]!, id: `taken${i}`, name: c.name }))
  for (let i = 0; i < 300; i++) {
    const next = stepVisitors({ ...home, cats: taken, nextId: i + 50 }, now, 600, seeded(i))
    for (const v of next.visitors) expect(taken.some(c => c.name === v.name)).toBe(false)
  }
  const once = stepVisitors(home, now, 600, seeded(9))
  const twice = stepVisitors(once, now, 600, seeded(13))
  expect(new Set(twice.visitors.map(v => v.name)).size).toBe(twice.visitors.length)
})
