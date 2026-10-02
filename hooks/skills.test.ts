import { expect, test } from 'claude-code/testing'

import type { Cat } from '../types'
import { activeCat, learnSkill, newCat, newHome, respec, tick } from './game'
import { GINGER } from './genes'
import { modsOf } from './mods'
import { FORM_LEVEL, SKILLS, canLearn, formOf, freePoints, learn } from './skills'

const round = (n: number) => Math.round(n * 1000) / 1000
const atLevel = (level: number, skills: Record<string, number> = {}): Cat =>
  ({ ...newCat('c1', 'Mochi', GINGER, 0), level, skills })

test('one point per level, spent along prerequisites', async () => {
  const cat = atLevel(4)
  expect(freePoints(cat)).toBe(3)
  expect(canLearn(cat, 'nose')).toEqual({ ok: false, reason: 'needs Sharp Claws' })
  const learned = learn(learn(cat, 'claws'), 'nose')
  expect(learned.skills).toEqual({ claws: 1, nose: 1 })
  expect(freePoints(learned)).toBe(1)
  expect(canLearn(atLevel(1), 'claws')).toEqual({ ok: false, reason: 'no skill points' })
  expect(canLearn(atLevel(9, { claws: 3 }), 'claws')).toEqual({ ok: false, reason: 'maxed' })
})

test('skills multiply the rules on top of personality', async () => {
  const plain = modsOf(atLevel(5))
  const clawed = modsOf(atLevel(5, { claws: 2 }))
  expect(round(clawed.coin)).toBe(round(plain.coin * 1.4))
  expect(round(modsOf(atLevel(5, { paws: 1, purr: 1, charm: 1 })).joyDecay)).toBe(0.7)
  expect(modsOf(atLevel(5, { catnap: 1, deep: 1, walk: 1 })).offlineHours).toBe(4)
})

test('the strongest branch picks the form at level 10', async () => {
  expect(formOf(atLevel(FORM_LEVEL - 1, { claws: 3 }))).toBeNull()
  expect(formOf(atLevel(FORM_LEVEL, { claws: 3, paws: 1 }))).toBe('ninja')
  expect(formOf(atLevel(FORM_LEVEL, { paws: 3, purr: 1 }))).toBe('royal')
  expect(formOf(atLevel(FORM_LEVEL, { catnap: 2 }))).toBe('cloud')
  expect(formOf(atLevel(FORM_LEVEL))).toBe('chonk')
})

test('every prerequisite names a real skill in the same branch', async () => {
  for (const skill of SKILLS) {
    if (!skill.needs) continue
    expect(SKILLS.find(s => s.id === skill.needs)?.branch).toBe(skill.branch)
  }
})

test('learning and respec work on the household', async () => {
  const home = { ...newHome(0), coins: 1000, cats: [atLevel(FORM_LEVEL)] }
  const ninja = learnSkill(home, 'claws')
  expect(ninja.log).toMatch(/ninja/)
  const reset = respec(ninja, 1)
  expect(activeCat(reset).skills).toEqual({})
  expect(reset.coins).toBeLessThan(ninja.coins)
  expect(respec({ ...ninja, coins: 0 }, 1).log).toMatch(/costs/)
})

test('Dream Walk lets more time away count', async () => {
  const walker = { ...newHome(0), cats: [atLevel(5, { catnap: 1, deep: 1, walk: 1 })] }
  const plain = { ...newHome(0), cats: [atLevel(5)] }
  const away = 20 * 3_600_000
  expect(tick(walker, away, () => 0).coins).toBeGreaterThan(tick(plain, away, () => 0).coins)
})
