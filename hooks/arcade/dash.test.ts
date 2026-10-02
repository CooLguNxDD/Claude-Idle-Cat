import { expect, test } from 'claude-code/testing'

import { STEP } from './engine'
import { NO_MODS } from './game'
import type { Input } from './game'
import { dash } from './games/dash'
import type { DashState } from './games/dash'

const W = 48
const H = 32
const run = (seconds: number, press: (s: DashState) => Input[] = () => []) => {
  let s = dash.init(7, NO_MODS, W, H)
  for (let i = 0; i < seconds * 60 && !s.isOver; i++) s = dash.step(s, STEP, press(s))
  return s
}
const nextThreat = (s: DashState) =>
  s.things.filter(th => th.kind !== 'fish' && th.x + th.w > 5).sort((a, b) => a.x - b.x)[0]

test('with no input the first flowerpot ends the run', async () => {
  const s = run(60)
  expect(s.isOver).toBe(true)
  expect(s.t).toBeLessThan(10)
  expect(dash.score(s)).toBeLessThan(dash.medals[0])
})

test('jumping pots and ducking pigeons survives the round', async () => {
  const s = run(60, st => {
    const th = nextThreat(st)
    if (!th || th.x - 16 > st.speed * 0.2) return []
    return [{ kind: 'key', key: th.kind === 'bird' ? 'down' : ' ' }]
  })
  expect(s.t).toBeGreaterThan(59)
  expect(dash.score(s)).toBeGreaterThan(dash.medals[0])
  expect(dash.score(s)).toBeLessThanOrEqual(dash.maxScore(60_000))
})

test('a jump leaves the ground and lands again', async () => {
  let s = dash.init(1, NO_MODS, W, H)
  s = dash.step(s, STEP, [{ kind: 'key', key: 'up' }])
  for (let i = 0; i < 20; i++) s = dash.step(s, STEP, [])
  expect(s.y).toBeLessThan(s.ground - 10)
  for (let i = 0; i < 60; i++) s = dash.step(s, STEP, [])
  expect(s.y).toBe(s.ground)
})
