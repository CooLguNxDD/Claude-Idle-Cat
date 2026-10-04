import { expect, test } from 'claude-code/testing'
import { migrate, newHome } from '../game'
import { seeded } from '../rng'
import { applyCatCommand, BREED_COST } from './commands'

test('a pull waits for open and confirm; failures spend nothing', () => {
  const home = { ...newHome(1), coins: 1000, shinyCharm: true }
  let calls = 0
  const rng = () => { calls++; return 0.99 }
  const blocked = applyCatCommand({ ...home, coins: 0 }, { type: 'shelter.pull' }, 2, rng)
  expect(blocked.coins).toBe(0)
  expect(blocked.shinyCharm).toBe(true)
  expect(calls).toBe(0)
  const pulled = applyCatCommand(home, { type: 'shelter.pull', name: 'Bean' }, 2, seeded(5))
  expect(pulled.cats.length).toBe(1)
  expect(pulled.coins).toBe(900)
  expect(pulled.shinyCharm).toBe(false)
  expect(pulled.shelter.pending?.name).toBe('Bean')
  expect(pulled.shelter.pending?.genes.isShiny).toBe(true)
  expect(pulled.shelter.pulls).toBe(0)
  const again = applyCatCommand(pulled, { type: 'shelter.pull' }, 3, rng)
  expect(again.coins).toBe(pulled.coins)
  expect(calls).toBe(0)
  const closed = applyCatCommand(pulled, { type: 'shelter.confirm' }, 3)
  expect(closed.cats.length).toBe(1)
  const opened = applyCatCommand(pulled, { type: 'shelter.open' }, 4)
  expect(opened.shelter.pending?.openedAt).toBe(4)
  const named = applyCatCommand(opened, { type: 'shelter.rename', name: 'Nori' }, 4)
  const confirmed = applyCatCommand(named, { type: 'shelter.confirm' }, 5)
  expect(confirmed.cats[1]?.name).toBe('Nori')
  expect(confirmed.shelter.pending).toBeNull()
  expect(confirmed.shelter.pulls).toBe(1)
  expect(confirmed.shelter.last).toEqual({ catId: 'c2', at: 5, cost: 100 })
  expect(migrate({ ...confirmed, shelter: { ...confirmed.shelter, pending: { id: 'nope' } } }, 6).shelter.pending).toBeNull()
})

test('a breed reroll keeps personality until confirm and rollback spends the fee', () => {
  const home = { ...newHome(1), coins: 40 }
  const poor = applyCatCommand(home, { type: 'breed.reroll', catId: 'c1' }, 2, seeded(1))
  expect(poor.coins).toBe(40)
  expect(poor.shelter.offer).toBeNull()
  const rich = { ...home, coins: 500 }
  const rolled = applyCatCommand(rich, { type: 'breed.reroll', catId: 'c1' }, 2, seeded(3))
  expect(rolled.coins).toBe(500 - BREED_COST)
  expect(rolled.shelter.offer?.openedAt).toBeNull()
  expect(applyCatCommand(rolled, { type: 'breed.confirm', catId: 'c1' }, 3).cats[0]!.genes).toEqual(rich.cats[0]!.genes)
  const opened = applyCatCommand(rolled, { type: 'breed.open' }, 3)
  expect(opened.shelter.offer?.openedAt).toBe(3)
  expect(opened.cats[0]!.genes).toEqual(rich.cats[0]!.genes)
  expect(opened.shelter.offer?.before.personality).toBe(opened.shelter.offer?.after.personality)
  const undone = applyCatCommand(opened, { type: 'breed.rollback', catId: 'c1' }, 4)
  expect(undone.coins).toBe(opened.coins)
  expect(undone.cats[0]!.genes).toEqual(rich.cats[0]!.genes)
  expect(undone.shelter.offer).toBeNull()
  const again = applyCatCommand(rich, { type: 'breed.reroll', catId: 'c1' }, 2, seeded(3))
  const kept = applyCatCommand(applyCatCommand(again, { type: 'breed.open' }, 4), { type: 'breed.confirm', catId: 'c1' }, 5)
  expect(kept.cats[0]!.genes).toEqual(again.shelter.offer?.after)
  expect(kept.coins).toBe(500 - BREED_COST)
  const dearer = applyCatCommand(kept, { type: 'breed.reroll', catId: 'c1' }, 6, seeded(4))
  expect(dearer.coins).toBe(kept.coins - BREED_COST)
  const seen = applyCatCommand(dearer, { type: 'breed.open' }, 7)
  const rerolled = applyCatCommand(seen, { type: 'breed.again' }, 8, seeded(9))
  expect(rerolled.coins).toBe(seen.coins - BREED_COST)
  expect(rerolled.shelter.offer?.openedAt).toBeNull()
  expect(rerolled.shelter.offer?.before).toEqual(seen.shelter.offer?.before)
  expect(rerolled.cats[0]!.genes).toEqual(rich.cats[0]!.genes)
})
