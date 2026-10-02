import { expect, test } from 'claude-code/testing'

import type { Cat } from '../types'
import { act, activeCat, giveGift, migrate, newCat, newHome, welcomeBack } from './game'
import { DAILY_CAP, GIFTS, LEVELS, befriend, dayOf, dialogue, friendLevel, giftById, receiveGift } from './friends'

const DAY = 86_400_000
const local = (day: number, hour = 9) => new Date(2026, 0, 1 + day, hour).getTime()
const cat = (personality: Cat['genes']['personality'], friendship = 0): Cat =>
  ({ ...newCat('c1', 'Mochi', { coat: 'grey', eyes: 'green', personality, isShiny: false }, 0), friendship })

test('care earns friendship up to the daily cap, which resets the next day', async () => {
  let c = cat('lazy')
  for (let i = 0; i < 20; i++) c = befriend(c, 2, DAY)
  expect(c.friendship).toBe(DAILY_CAP)
  expect(befriend(c, 2, 2 * DAY).friendship).toBe(DAILY_CAP + 2)
})

test('one gift a day, and favorites count more', async () => {
  const greedy = cat('greedy')
  const loved = receiveGift(greedy, giftById('tuna')!, DAY)
  const meh = receiveGift(greedy, giftById('feather')!, DAY)
  if ('reason' in loved || 'reason' in meh) throw new Error('gift refused')
  expect(loved.points).toBeGreaterThan(meh.points)
  expect('reason' in receiveGift(loved.cat, giftById('tuna')!, DAY + 1000)).toBe(true)
  expect('reason' in receiveGift(loved.cat, giftById('tuna')!, 2 * DAY)).toBe(false)
  expect(GIFTS.every(g => giftById(g.id) === g)).toBe(true)
})

test('levels unlock nickname and catchphrase in dialogue, and it remembers gifts', async () => {
  expect(friendLevel(0)).toBe(1)
  expect(friendLevel(LEVELS[5]!.at)).toBe(6)
  const stranger = dialogue(cat('playful'), DAY, 3)
  const close = dialogue(cat('playful', LEVELS[4]!.at), DAY, 3)
  expect(close).toMatch(/buddy/)
  expect(close).toMatch(/nya!/)
  expect(stranger).not.toMatch(/buddy/)
  const gifted = { ...cat('greedy'), lastGift: { id: 'tuna', day: dayOf(local(1)) } }
  expect(dialogue(gifted, local(1), 3)).toMatch(/favorite/)
  expect(dialogue(gifted, local(2), 3)).toMatch(/Still thinking about that tuna/)
})

test('the household pays for gifts and logs level-ups', async () => {
  const home = { ...newHome(0), coins: 100, cats: [cat('greedy', 25)] }
  const after = giveGift(home, 'tuna', DAY)
  expect(after.coins).toBe(100 - giftById('tuna')!.price)
  expect(after.log).toMatch(/favorite/)
  expect(after.log).toMatch(/Acquaintance/)
  expect(giveGift(after, 'tuna', DAY).log).toMatch(/already/)
  expect(activeCat(act(home, 'pet', DAY)).friendship).toBe(27)
})

test('coming back after a while greets you with a summary', async () => {
  const before = { ...newHome(0), lastTick: 0 }
  const after = { ...before, coins: before.coins + 120, nextId: before.nextId + 2 }
  const greeted = welcomeBack(before, after, 3 * 3_600_000)
  expect(greeted.effect?.kind).toBe('welcome')
  expect(greeted.log).toMatch(/\+120c/)
  expect(greeted.log).toMatch(/2 strays/)
  expect(welcomeBack(before, after, 60_000)).toEqual(after)
})

test('older saves gain friendship fields', async () => {
  const old = { ...newHome(0), cats: [{ ...newHome(0).cats[0], friendship: undefined, daily: undefined }] }
  const fixed = migrate(JSON.parse(JSON.stringify(old)), 1)
  expect(fixed.cats[0]?.friendship).toBe(0)
  expect(fixed.cats[0]?.daily.points).toBe(0)
})
