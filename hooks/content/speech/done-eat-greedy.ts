import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'done-eat-greedy', on: 'done', about: ['eat-bowl'], when: { personality: ['greedy'], weight: 3 }, glyph: '!', lines: ['More. There should be more.', 'I finished. The bowl did not.', 'Seconds? I mean firsts again.', 'That portion was a suggestion.'],
})
