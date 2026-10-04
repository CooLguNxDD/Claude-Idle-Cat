import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'done-eat-fancy', on: 'done', about: ['eat-bowl'], when: { weight: 4, minBowl: 14 }, glyph: '*',
  lines: ['The {bowl} tastes expensive.', '{bowl}. I expected nothing less.', 'Fancy kibble, from the {bowl}.', 'Worth every coin in the {bowl}.'],
})
