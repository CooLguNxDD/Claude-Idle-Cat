import { expect, test } from 'claude-code/testing'

import { BEHAVIORS } from './content'
import type { Behavior } from './content/types'
import { plan } from './goap'

const awake = { isAwake: true, isHungry: false, isTired: false, isLonely: false, isBored: false, hasEnergy: true, bowlHasFood: false, hasBuddy: false }

test('a single step satisfies a goal the behaviour posts', () => {
  const steps = plan({ ...awake, isHungry: true, bowlHasFood: true }, { isHungry: false }, BEHAVIORS)
  expect(steps?.map(b => b.id)).toEqual(['eat-bowl'])
})

test('a lonely tired cat naps before it can play', () => {
  const facts = { ...awake, isTired: true, hasEnergy: false, isLonely: true, hasBuddy: true, isBored: true }
  const steps = plan(facts, { isLonely: false }, BEHAVIORS)
  expect(steps?.map(b => b.id)).toEqual(['nap-bed', 'play-buddy'])
})

test('an impossible want is null and equal inputs plan the same way', () => {
  expect(plan({ ...awake, isAwake: false }, { isAwake: true }, BEHAVIORS)).toBeNull()
  const goal = { isHungry: false }
  const facts = { ...awake, isHungry: true, bowlHasFood: true }
  expect(plan(facts, goal, BEHAVIORS)?.map(b => b.id)).toEqual(plan(facts, goal, BEHAVIORS)?.map(b => b.id))
  const alt = (id: string): Behavior => ({ id, label: id, pre: {}, post: { isHungry: false }, cost: 1, seconds: 1, move: 'sit', effect: {}, line: id })
  expect(plan({ isHungry: true }, { isHungry: false }, [alt('first'), alt('second')])?.map(b => b.id)).toEqual(['first'])
})
