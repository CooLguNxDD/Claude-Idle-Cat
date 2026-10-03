import { expect, test } from 'claude-code/testing'

import type { Coat } from '../types'
import { coatPixel, rollGenes, SHINY_ODDS } from './genes'
import { modsOf } from './mods'
import { newCat } from './game'
import { seeded } from './rng'
import { FLAVORS } from './theme'
import { COATS } from './adoption/registry'

const NOW = new Date(2026, 9, 15, 12).getTime()

test('rolls cover every coat and land near the shiny odds', async () => {
  const rng = seeded(42)
  const coats = new Set<Coat>()
  let shiny = 0
  const n = 10_000
  for (let i = 0; i < n; i++) {
    const g = rollGenes(rng, NOW)
    coats.add(g.coat)
    if (g.isShiny) shiny++
  }
  expect(coats.size).toBe(COATS.length)
  expect(shiny / n).toBeGreaterThan(SHINY_ODDS * 0.6)
  expect(shiny / n).toBeLessThan(SHINY_ODDS * 1.4)
})

test('the same seed gives the same cat', async () => {
  expect(rollGenes(seeded(5), NOW)).toEqual(rollGenes(seeded(5), NOW))
})

test('coats paint differently and odd eyes differ per side', async () => {
  const f = FLAVORS.mocha
  const base = { eyes: 'odd', personality: 'lazy', isShiny: false } as const
  const fur = (coat: Coat) => coatPixel({ ...base, coat }, f, 'f', 2, 3)
  expect(fur('black')).not.toBe(fur('white'))
  expect(fur('ginger')).not.toBe(fur('grey'))
  const g = { ...base, coat: 'grey' as const }
  expect(coatPixel(g, f, 'E', 4, 5)).not.toBe(coatPixel(g, f, 'E', 9, 5))
})

test('personality changes the rules', async () => {
  const genes = { coat: 'grey', eyes: 'green', isShiny: false } as const
  expect(modsOf(newCat('c1', 'A', { ...genes, personality: 'greedy' }, 0)).coin).toBe(1.2)
  expect(modsOf(newCat('c1', 'A', { ...genes, personality: 'lazy' }, 0)).energyDecay).toBe(0.5)
})
