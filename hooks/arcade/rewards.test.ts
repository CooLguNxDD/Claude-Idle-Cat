import { expect, test } from 'claude-code/testing'

import { settle } from '../collection'
import { activeCat, newHome } from '../game'
import { seeded } from '../rng'
import { CUDDLE, PRIZE_CHANCE, rollPrize } from './prizes'
import { ENERGY_COST, PAID_PLAYS, finishGame, parseMessage, playsLeft, quitGame, startGame } from './rewards'

const at = (day: number, hour = 12) => new Date(2026, 0, 1 + day, hour).getTime()
// An rng that never wins a prize, so payouts stay exact.
const never = () => 0.999
const rested = <T extends ReturnType<typeof newHome>>(h: T): T => ({ ...h, cats: h.cats.map(c => ({ ...c, energy: 100 })) })

test('a round costs energy and pays a medal only for the round that was started', async () => {
  const t = at(0)
  const home = startGame(newHome(t), 'dash', t)
  expect(activeCat(home).energy).toBe(activeCat(newHome(t)).energy - ENERGY_COST)
  expect(home.arcade.open?.game).toBe('dash')
  expect(finishGame(newHome(t), 'dash', 900, 60_000, t + 60_000, never)).toEqual(newHome(t))
  const done = finishGame(home, 'dash', 900, 60_000, t + 60_000, never)
  expect(done.arcade.open).toBeNull()
  expect(done.coins).toBeGreaterThan(home.coins)
  expect(done.arcade.best.dash).toBe(900)
  expect(done.log).toMatch(/gold medal/)
  expect(done.arcade.golds).toBe(1)
  expect(done.miles.counts.games).toBe(1)
  expect('gold' in settle(done, t).achievements).toBe(true)
})

test('a forged score is clamped to what the time allows', async () => {
  const t = at(0)
  const done = finishGame(startGame(newHome(t), 'dash', t), 'dash', 999_999, 60_000, t + 2000, never)
  expect(done.arcade.best.dash).toBeLessThan(250)
  expect(parseMessage({ kind: 'result', game: 'dash', score: 'lots', ms: 1 })).toBeNull()
  expect(parseMessage({ kind: 'result', game: 'chess', score: 1, ms: 1 })).toBeNull()
  expect(parseMessage({ kind: 'quit', game: 'dash' })).toEqual({ kind: 'quit', game: 'dash' })
})

test('three paid plays a day, reset the next day; tired cats cannot play', async () => {
  const t = at(3)
  let home = newHome(t)
  for (let i = 0; i < PAID_PLAYS; i++) home = finishGame(startGame(rested(home), 'dash', t), 'dash', 300, 60_000, t + 60_000, never)
  expect(playsLeft(home, 'dash', t)).toBe(0)
  home = rested(home)
  const unpaid = finishGame(startGame(home, 'dash', t), 'dash', 300, 60_000, t + 60_000, never)
  expect(unpaid.coins).toBe(home.coins)
  expect(unpaid.log).toMatch(/no coins/)
  expect(playsLeft(home, 'dash', at(4))).toBe(PAID_PLAYS)
  const tired = { ...home, cats: home.cats.map(c => ({ ...c, energy: 5 })) }
  expect(startGame(tired, 'dash', t).arcade.open).toBeNull()
  expect(quitGame(startGame(home, 'dash', t)).arcade.open).toBeNull()
})

test('a paid round may win a prize, folded into the payout and the log', async () => {
  const t = at(5)
  const home = startGame(newHome(t), 'dash', t)
  const plain = finishGame(home, 'dash', 900, 60_000, t + 60_000, never)
  let wins = 0
  for (let seed = 1; seed <= 200; seed++) {
    const done = finishGame(home, 'dash', 900, 60_000, t + 60_000, seeded(seed))
    if (!done.log.includes('🎁')) continue
    wins++
    const cat = activeCat(done)
    const base = activeCat(plain)
    const isBetter = done.coins > plain.coins || cat.xp !== base.xp || cat.level !== base.level ||
      cat.hunger > base.hunger || cat.energy > base.energy || cat.friendship > base.friendship ||
      Object.keys(done.pocket).length > 0
    expect(isBetter).toBe(true)
  }
  // Gold wins about half the time.
  expect(wins).toBeGreaterThan(70)
  expect(wins).toBeLessThan(130)
})

test('unpaid rounds never roll; a cuddly cat favours cuddles', async () => {
  const t = at(6)
  let home = newHome(t)
  for (let i = 0; i < PAID_PLAYS; i++) home = finishGame(startGame(rested(home), 'dash', t), 'dash', 300, 60_000, t + 60_000, never)
  const unpaid = finishGame(startGame(rested(home), 'dash', t), 'dash', 900, 60_000, t + 60_000, () => 0)
  expect(unpaid.log).not.toMatch(/🎁/)
  const cat = { ...activeCat(home), genes: { ...activeCat(home).genes, personality: 'cuddly' as const } }
  const rng = seeded(9)
  let cuddles = 0
  for (let i = 0; i < 600; i++) {
    const prize = rollPrize(home, cat, 'gold', rng)
    if (prize?.id !== 'cuddle') continue
    cuddles++
    expect(prize.cat(cat).friendship).toBe(cat.friendship + CUDDLE)
  }
  // 2/7 of the ~50% wins, against 1/6 for an even pick.
  expect(cuddles).toBeGreaterThan(600 * PRIZE_CHANCE.gold / 6)
  expect(rollPrize(home, cat, null, () => 0.5)).toBeNull()
})

test('the cat that started the round is paid, even after switching cats', async () => {
  const t = at(7)
  const two = { ...newHome(t), cats: [...newHome(t).cats, { ...activeCat(newHome(t)), id: 'c2', name: 'Bean' }] }
  const started = startGame(two, 'dash', t)
  const done = finishGame({ ...started, activeId: 'c2' }, 'dash', 900, 60_000, t + 60_000, never)
  const [mochi, bean] = done.cats
  expect(done.activeId).toBe('c2')
  expect(mochi!.xp).toBeGreaterThan(0)
  expect(mochi!.joy).toBeGreaterThan(activeCat(two).joy)
  expect(bean!).toEqual(two.cats[1]!)
  expect(done.log).toMatch(/^Mochi scored/)
})
