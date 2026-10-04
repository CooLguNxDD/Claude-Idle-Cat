import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'fill', on: 'fill', when: { weight: 1 }, glyph: '!', lines: ['{food} portions. Noted.', 'The bowl has a future.', 'Fish sound. I heard that.', 'Refill accepted. Grudgingly.', 'More food. Correct choice.', 'Bowl status: less tragic.'],
})
