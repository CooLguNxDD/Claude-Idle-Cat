import type { Mood } from './game'
import type { Form } from './skills'

const HATS: Record<Form, string> = { ninja: ' ~=====~', royal: '  \\w/', cloud: '  (‾‾)', chonk: '' }

const FACES: Record<Mood, [string, string]> = {
  happy: ['( ^.^ )', '( ^ω^ )'],
  ok: ['( o.o )', '( o.- )'],
  grumpy: ['( -_- )', '( ¬_¬ )'],
  sleeping: ['( -.- ) z', '( -.- ) zZ'],
}

// Two frames per mood; the tail swishes on alternate ticks.
export const catArt = (mood: Mood, frame: number, form: Form | null = null): string[] => {
  const i = (frame % 2) as 0 | 1
  const tail = i === 0 ? '  ~' : ' ~ '
  const swish = mood === 'sleeping' ? '' : tail
  const body = form === 'chonk' ? `(  ^  )${swish}` : ` > ^ <${swish}`
  return [...(form && form !== 'chonk' ? [HATS[form]] : []), ' /\\_/\\', FACES[mood][i], body]
}
