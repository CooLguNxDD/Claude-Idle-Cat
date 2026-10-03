import { defineReaction } from '../types'

export default defineReaction({
  id: 'stretch-turn-done', on: 'turn.done', move: 'stretch', line: 'A good stretch after a reply.', odds: 0.5, cooldownSec: 30,
})
