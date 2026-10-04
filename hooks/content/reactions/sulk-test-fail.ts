import { defineReaction } from '../types'

export default defineReaction({
  id: 'sulk-test-fail', on: 'test.fail', move: 'loaf', line: 'Those tests need a cuddle.', odds: 1, cooldownSec: 15,
})
