import { expect, test } from 'claude-code/testing'
import { send } from './expeditions'
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

test('status counts a finished party and points at /cat claim', () => {
  const sent = send({ ...newHome(0), coins: 1000 }, 'garden-patrol', ['c1'], [], 0, 7)
  const run = sent.expeditions.runs[0]!
  expect(statusText(sent, run.endsAt)).toContain('Expeditions: 1 out, 1 ready — /cat claim')
  expect(statusText(sent, run.endsAt)).toContain('Cats: 0 home, 1 away')
})
