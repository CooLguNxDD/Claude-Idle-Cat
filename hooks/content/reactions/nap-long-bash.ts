import { defineReaction } from '../types'

export default defineReaction({
  id: 'nap-long-bash', on: 'tool.long', move: 'reaction-nap', line: 'Wake me when it finishes…', odds: 1, cooldownSec: 30, tools: ['Bash'],
})
