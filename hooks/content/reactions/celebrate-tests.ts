import { defineReaction } from '../types'

export default defineReaction({
  id: 'celebrate-tests', on: 'test.pass', move: 'celebrate', line: 'Tests passed! Happy paws.', odds: 1, cooldownSec: 15,
})
