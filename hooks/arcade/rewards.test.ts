import { expect, test } from 'claude-code/testing'

import { activeCat, newHome } from '../game'
import { ENERGY_COST, PAID_PLAYS, finishGame, parseMessage, playsLeft, quitGame, startGame } from './rewards'

const at = (day: number, hour = 12) => new Date(2026, 0, 1 + day, hour).getTime()
const rested = <T extends ReturnType<typeof newHome>>(h: T): T => ({ ...h, cats: h.cats.map(c => ({ ...c, energy: 100 })) })

test('a round costs energy and pays a medal only for the round that was started', async () => {
  const t = at(0)
  const home = startGame(newHome(t), 'dash', t)
  expect(activeCat(home).energy).toBe(activeCat(newHome(t)).energy - ENERGY_COST)
  expect(home.arcade.open?.game).toBe('dash')
  expect(finishGame(newHome(t), 'dash', 900, 60_000, t + 60_000)).toEqual(newHome(t))
  const done = finishGame(home, 'dash', 900, 60_000, t + 60_000)
  expect(done.arcade.open).toBeNull()
  expect(done.coins).toBeGreaterThan(home.coins)
  expect(done.arcade.best.dash).toBe(900)
  expect(done.log).toMatch(/gold medal/)
})

test('a forged score is clamped to what the time allows', async () => {
  const t = at(0)
  const done = finishGame(startGame(newHome(t), 'dash', t), 'dash', 999_999, 60_000, t + 2000)
  expect(done.arcade.best.dash).toBeLessThan(250)
  expect(parseMessage({ kind: 'result', game: 'dash', score: 'lots', ms: 1 })).toBeNull()
  expect(parseMessage({ kind: 'result', game: 'chess', score: 1, ms: 1 })).toBeNull()
  expect(parseMessage({ kind: 'quit', game: 'dash' })).toEqual({ kind: 'quit', game: 'dash' })
})

test('three paid plays a day, reset the next day; tired cats cannot play', async () => {
  const t = at(3)
  let home = newHome(t)
  for (let i = 0; i < PAID_PLAYS; i++) home = finishGame(startGame(rested(home), 'dash', t), 'dash', 300, 60_000, t + 60_000)
  expect(playsLeft(home, 'dash', t)).toBe(0)
  home = rested(home)
  const unpaid = finishGame(startGame(home, 'dash', t), 'dash', 300, 60_000, t + 60_000)
  expect(unpaid.coins).toBe(home.coins)
  expect(unpaid.log).toMatch(/no coins/)
  expect(playsLeft(home, 'dash', at(4))).toBe(PAID_PLAYS)
  const tired = { ...home, cats: home.cats.map(c => ({ ...c, energy: 5 })) }
  expect(startGame(tired, 'dash', t).arcade.open).toBeNull()
  expect(quitGame(startGame(home, 'dash', t)).arcade.open).toBeNull()
})
