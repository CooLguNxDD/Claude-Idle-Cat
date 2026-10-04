import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'plan-eat', on: 'plan', about: ['eat-bowl'], when: { weight: 1 }, glyph: '!', lines: ['Bowl time. I decided.', '{name} has a plan: eat.', 'That kibble is calling.', 'Walking to the bowl. Officially.'],
})
