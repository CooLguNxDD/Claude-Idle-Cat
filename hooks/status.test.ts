import { expect, test } from 'claude-code/testing'
import { newHome } from './game'
import { statusText } from './status'

test('status names the active cat, coins, bowl and ready parties', () => {
  const h = newHome(0)
  const text = statusText({ ...h, coins: 42, bowl: { food: 2 } }, 0)
  expect(text).toContain('Mochi Lv')
  expect(text).toContain('42')
  expect(text).toContain('Bowl: 2/')
  expect(text).toContain('Expeditions: none out')
})
