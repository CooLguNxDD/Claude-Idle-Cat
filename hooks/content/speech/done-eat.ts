import { defineSpeech } from '../types'

export default defineSpeech({
  id: 'done-eat', on: 'done', about: ['eat-bowl'], when: { weight: 1 }, glyph: '*', lines: ['Crunch crunch. Done.', 'The bowl is quieter now.', 'I left some. Maybe.', 'Fed. For the next minute.'],
})
