import { expect, test } from 'claude-code/testing'
import { catRef, wordsOf } from './commands'
import { newHome } from './game'

test('quoted household and visitor names resolve like ids, while backup paths retain separators', () => {
  const h = newHome(0), cat = h.cats[0]!
  const home = { ...h, cats: [{ ...cat, name: 'Sir Miso' }], visitors: [{ id: 'v1', name: 'Captain Bean', genes: cat.genes, arrivedAt: 0, leavesAt: 1000, gift: 10 }] }
  expect(wordsOf('send garden-patrol "Sir Miso" +trail-snacks')).toEqual(['send', 'garden-patrol', 'Sir Miso', '+trail-snacks'])
  expect(wordsOf("exchange 'Sir Miso' 'Captain Bean'").slice(1).map(name => catRef(home, name))).toEqual(['c1', 'v1'])
  expect(catRef(home, 'sir miso')).toBe('c1'); expect(catRef(home, 'c1')).toBe('c1')
  expect(wordsOf('import "C:\\My Cats\\backup.json"')).toEqual(['import', 'C:\\My Cats\\backup.json'])
  expect(wordsOf("rename O'Malley")).toEqual(['rename', "O'Malley"])
})
