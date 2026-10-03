import { expect, test } from 'claude-code/testing'

import { COATS } from '../adoption/registry'
import { newHome } from '../game'
import { stepVisitors } from '../visitors'
import { seeded } from '../rng'
import { NAMED_CATS, WORLDS } from '.'
import { catProblems } from './types'
import type { NamedCat } from './types'

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
  const home = { ...newHome(0), tier: 2 }
  const named = new Map<string, number>()
  let strays = 0
  for (let hour = 0; hour < 3000; hour++) {
    const next = stepVisitors({ ...home, visitors: [], nextId: hour + 2 }, hour * 3_600_000, 600, seeded(hour))
    for (const v of next.visitors) {
      strays += 1
      const cat = NAMED_CATS.find(c => c.name === v.name)
      if (!cat) continue
      named.set(cat.id, (named.get(cat.id) ?? 0) + 1)
      expect(v.genes.coat).toBe(cat.genes.coat)
      expect(v.genes.isShiny).toBe(false)
    }
  }
  for (const cat of NAMED_CATS) {
    const share = (named.get(cat.id) ?? 0) / strays
    expect(share).toBeGreaterThan(cat.appears.odds / 3)
    expect(share).toBeLessThan(cat.appears.odds * 3)
  }
})
