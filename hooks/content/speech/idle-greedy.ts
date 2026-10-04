import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'idle-greedy', on: 'idle', when: { personality: ['greedy'], weight: 1 }, glyph: '!', lines: ['Did you bring snacks?', 'Coins! I love coins. Shiny.', 'That bowl looks empty.', 'I can hear a can opening.'],
})
