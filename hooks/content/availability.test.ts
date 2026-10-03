import { expect, test } from 'claude-code/testing'
import { availableBreeds, COATS, RARITIES, YEAR_ROUND_COATS, rarityOf, rollCoat } from '../adoption/registry'
import { parseBackup, toBackup } from '../backup'
import { ACHIEVEMENTS, settle } from '../collection'
import { adopt, adoptVisitor, migrate, newHome } from '../game'
import { rollGenes } from '../genes'
import { seeded } from '../rng'
import { stepVisitors } from '../visitors'
import { WORLDS } from '.'
import { isContentAvailable } from './availability'
import { availabilityProblems } from './types'

const OCT = new Date(2026, 9, 15, 12).getTime()
const NOV = new Date(2026, 10, 1).getTime()

test('availability uses the local October boundaries and rejects invalid month lists', () => {
  const available = { months: [10] }
  expect(isContentAvailable(available, new Date(2026, 9, 1).getTime() - 1)).toBe(false)
  expect(isContentAvailable(available, new Date(2026, 9, 1).getTime())).toBe(true)
  expect(isContentAvailable(available, NOV - 1)).toBe(true)
  expect(isContentAvailable(available, NOV)).toBe(false)
  expect(isContentAvailable(undefined, NOV)).toBe(true)
  for (const months of [[], [0], [13], [1.5]]) expect(availabilityProblems({ months }, 'content').length).toBe(1)
  expect(availabilityProblems({ months: [1, 12] }, 'content')).toEqual([])
  for (let month = 0; month < 12; month++) {
    const pool = availableBreeds(new Date(2026, month, 15).getTime())
    expect(pool.some(b => b.id === 'ghost')).toBe(month === 9)
    for (const rarity of Object.keys(RARITIES)) expect(pool.some(b => b.rarity === rarity)).toBe(true)
  }
})

test('seasonal filtering preserves rarity odds and draws seven numbers for genes', () => {
  for (const now of [OCT, NOV]) {
    let draws = 0
    rollGenes(() => { draws++; return 0.5 }, now)
    expect(draws).toBe(7)
    const rng = seeded(371)
    const counts: Record<string, number> = {}
    const coats = new Set<string>()
    const n = 20_000
    for (let i = 0; i < n; i++) {
      const coat = rollCoat(rng, now)
      coats.add(coat)
      const rarity = rarityOf({ coat })
      counts[rarity] = (counts[rarity] ?? 0) + 1
    }
    for (const [rarity, info] of Object.entries(RARITIES))
      expect(Math.abs(counts[rarity]! / n * 100 - info.odds)).toBeLessThan(1)
    expect(coats.size).toBe(now === OCT ? COATS.length : YEAR_ROUND_COATS.length)
    expect(coats.has('ghost')).toBe(now === OCT)
  }
})

test('shelter, ordinary strays and named visitors share October eligibility in every world', () => {
  const epics = availableBreeds(OCT).filter(b => b.rarity === 'epic')
  const ghostRoll = (epics.findIndex(b => b.id === 'ghost') + 0.5) / epics.length
  const pulls = () => {
    const values = [0.96, ghostRoll]
    return () => values.shift() ?? 0.5
  }
  expect(adopt({ ...newHome(OCT), coins: 1000 }, OCT, pulls()).cats[1]!.genes.coat).toBe('ghost')
  expect(adopt({ ...newHome(NOV), coins: 1000 }, NOV, pulls()).cats[1]!.genes.coat).not.toBe('ghost')
  for (const world of WORLDS) {
    for (const now of [OCT, NOV]) {
      let hasBoo = false
      let hasPlainGhost = false
      const home = { ...newHome(now), tier: 2, world: { id: world.id } }
      for (let i = 0; i < 1000; i++) {
        const next = stepVisitors({ ...home, nextId: i + 2 }, now, 600, seeded(i))
        for (const visitor of next.visitors) {
          if (now === NOV) {
            expect(visitor.name).not.toBe('Boo')
            expect(visitor.genes.coat).not.toBe('ghost')
          }
          if (visitor.name === 'Boo') hasBoo = true
          if (visitor.genes.coat === 'ghost' && visitor.name !== 'Boo') hasPlainGhost = true
        }
      }
      expect(hasBoo).toBe(now === OCT)
      expect(hasPlainGhost).toBe(now === OCT)
    }
  }
})

test('October visitors can stay and be adopted in November and ghost backups retain their coat', () => {
  const home = newHome(NOV - 1000)
  const ghost = { id: 'v2', name: 'Boo', genes: { coat: 'ghost', eyes: 'blue', personality: 'shy', isShiny: false } as const,
    gift: 17, arrivedAt: NOV - 1000, leavesAt: NOV + 3600_000 }
  const visiting = stepVisitors({ ...home, visitors: [ghost] }, NOV, 0, seeded(1))
  expect(visiting.visitors[0]!.genes.coat).toBe('ghost')
  const adopted = adoptVisitor(visiting, 'v2', NOV)
  expect(adopted.cats[1]!.genes.coat).toBe('ghost')
  const result = parseBackup(toBackup(adopted, NOV), NOV)
  expect('home' in result).toBe(true)
  if ('home' in result) expect(migrate(result.home, NOV).cats[1]!.genes.coat).toBe('ghost')
})

test('Full palette requires year-round coats and pays only once without revoking old awards', () => {
  const home = newHome(NOV)
  const complete = { ...home, book: { ...home.book, coats: [...YEAR_ROUND_COATS] } }
  const achievement = ACHIEVEMENTS.find(a => a.id === 'coats18')!
  expect(achievement.test(complete)).toBe(true)
  expect(achievement.test({ ...complete, book: { ...complete.book, coats: YEAR_ROUND_COATS.slice(1) } })).toBe(false)
  const paid = settle(complete, NOV)
  expect(paid.achievements.coats18).toBe(NOV)
  expect(settle(paid, NOV + 1).miles.total).toBe(paid.miles.total)
  const awarded = { ...home, achievements: { coats18: NOV - 1 } }
  expect(settle(awarded, NOV).achievements.coats18).toBe(NOV - 1)
})
