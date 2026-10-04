import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'plan-play', on: 'plan', about: ['play-buddy'], when: { weight: 1 }, glyph: '*', lines: ['{buddy}! Play. Now.', 'I found a friend and a plan.', 'Buddy protocol: engage.', 'Two cats. One game.'],
})
