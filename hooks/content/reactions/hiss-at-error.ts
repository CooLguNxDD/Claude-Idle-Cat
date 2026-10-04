import { defineReaction } from '../types'

export default defineReaction({
  id: 'hiss-at-error', on: 'tool.error', move: 'hiss', line: 'Hiss! That tool needs another try.', odds: 0.7, cooldownSec: 30,
})
