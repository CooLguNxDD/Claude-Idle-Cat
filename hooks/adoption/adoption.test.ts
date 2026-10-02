import { expect, test } from 'claude-code/testing'
import type { Genes, Home } from '../../types'
import { adopt, adoptPrice, adoptVisitor, migrate, newHome } from '../game'
import { rollGenes, SHINY_ODDS, coatPixel } from '../genes'
import { parseBackup, toBackup } from '../backup'
import { paneArtOf } from '../art/cats'
import { frameCells, ROWS } from '../scene'
import { shelterCells } from '../scene/shelter'
import { seeded } from '../rng'
import { FLAVORS } from '../theme'
import { COATS, MARKINGS, RARITIES, SILHOUETTES, rarityOf, rollCoat } from './registry'

test('rarity boundaries, seeded odds and independent shiny rolls match the published pool', async () => {
  const rolls = [0, 0.60, 0.85, 0.95, 0.99]
  const tiers = Object.keys(RARITIES)
  rolls.forEach((roll, i) => expect(rarityOf({ coat: rollCoat(() => roll) })).toBe(tiers[i]))
  const counts: Record<string, number> = {}
  const rng = seeded(371)
  let shinies = 0
  const n = 50_000
  for (let i = 0; i < n; i++) {
    const g = rollGenes(rng)
    const rarity = rarityOf(g)
    counts[rarity] = (counts[rarity] ?? 0) + 1
    if (g.isShiny) shinies++
    expect(MARKINGS.includes(g.marking!)).toBe(true)
    expect(SILHOUETTES.includes(g.silhouette!)).toBe(true)
  }
  for (const [id, rarity] of Object.entries(RARITIES))
    expect(Math.abs(counts[id]! / n * 100 - rarity.odds)).toBeLessThan(0.8)
  expect(Math.abs(shinies / n - SHINY_ODDS)).toBeLessThan(0.003)
})

test('a paid pull is one adoption; blocked pulls leave coins, RNG, receipt and charm untouched', async () => {
  const initial: Home = { ...newHome(1), coins: 1000, shinyCharm: true }
  const paid = adopt(initial, 2, seeded(5), 'Bean')
  expect(paid.coins).toBe(initial.coins - adoptPrice(initial))
  expect(paid.cats.length).toBe(2)
  expect(paid.cats[1]!.genes.isShiny).toBe(true)
  expect(paid.shinyCharm).toBe(false)
  expect(paid.shelter).toEqual({ pulls: 1, last: { catId: 'c2', at: 2, cost: 100 } })
  let consumed = 0
  const rng = () => { consumed++; return 0 }
  const full = adopt({ ...paid, shinyCharm: true }, 3, rng)
  expect(full.coins).toBe(paid.coins)
  expect(full.shelter).toEqual(paid.shelter)
  expect(full.shinyCharm).toBe(true)
  const poor = adopt({ ...initial, coins: 0 }, 3, rng)
  expect(poor.shelter.pulls).toBe(0)
  expect(poor.shinyCharm).toBe(true)
  expect(consumed).toBe(0)
})

test('old cats retain their genes and new adoption variants survive backups and visitor adoption', async () => {
  const base = newHome(1)
  const { shelter: _, ...old } = base
  expect(migrate(old, 2).cats[0]!.genes).toEqual(base.cats[0]!.genes)
  expect(migrate(old, 2).shelter).toEqual({ pulls: 0, last: null })
  const genes: Genes = { coat: 'nebula', eyes: 'odd', personality: 'curious', isShiny: true,
    marking: 'blaze', silhouette: 'fluffy' }
  const visited = { ...base, shinyCharm: true, visitors: [
    { id: 'v2', name: 'Nova', genes, gift: 17, arrivedAt: 1, leavesAt: 100 },
  ] }
  const adopted = adoptVisitor(visited, 'v2', 3)
  expect(adopted.cats[1]!.genes).toEqual(genes)
  expect(adopted.shelter).toEqual({ pulls: 0, last: { catId: 'c2', at: 3, cost: 0 } })
  expect(adopted.coins).toBe(base.coins + 17)
  expect(adopted.shinyCharm).toBe(true)
  const restored = parseBackup(toBackup(adopted, 4), 5)
  if (!('home' in restored)) throw new Error(restored.error)
  expect(restored.home.cats).toEqual(adopted.cats)
  expect(restored.home.shelter).toEqual(adopted.shelter)
})

test('all coats and silhouettes paint in every theme; shelter opening stays within the pane', async () => {
  const base: Genes = { coat: 'ginger', eyes: 'odd', personality: 'playful', isShiny: false }
  for (const f of Object.values(FLAVORS)) {
    for (const coat of COATS) for (const silhouette of SILHOUETTES) {
      const genes: Genes = { ...base, coat, silhouette }
      for (const row of paneArtOf(genes).frames[0]!) for (const ch of row)
        if (['f', 'd', 'w', 'E'].includes(ch)) expect(Number.isInteger(coatPixel(genes, f, ch, 6, 8))).toBe(true)
      const home = newHome(1)
      home.cats[0]!.genes = genes
      for (const cols of [34, 56]) {
        const cells = frameCells({ home, now: 2, hour: 12, tick: 8, cols, flavor: f })
        expect(cells.length).toBe(Math.ceil(cols * ROWS * 12 / 3) * 4)
      }
    }
    const home = adopt({ ...newHome(1), coins: 1000 }, 2, seeded(7))
    for (const cols of [34, 56]) {
      const frames = [0, 800, 2000].map(t => shelterCells(home, t + 2, t / 125, f, cols))
      expect(new Set(frames).size).toBe(3)
      for (const cells of frames) expect(cells.length).toBe(Math.ceil(cols * ROWS * 12 / 3) * 4)
    }
    const paints = MARKINGS.map(marking => {
      const g = { ...base, marking }
      return Array.from({ length: 13 * 14 }, (_, i) => coatPixel(g, f, 'f', i % 14, Math.floor(i / 14))).join(',')
    })
    expect(new Set(paints).size).toBe(MARKINGS.length)
  }
})
