import type { Mood } from './game'

const FACES: Record<Mood, [string, string]> = {
  happy: ['( ^.^ )', '( ^ω^ )'],
  ok: ['( o.o )', '( o.- )'],
  sad: ['( ;_; )', '( T_T )'],
  sleeping: ['( -.- ) z', '( -.- ) zZ'],
}

// Two frames per mood; the tail swishes on alternate ticks.
export const catArt = (mood: Mood, frame: number): string[] => {
  const i = (frame % 2) as 0 | 1
  const tail = i === 0 ? '  ~' : ' ~ '
  return [' /\\_/\\', FACES[mood][i], ` > ^ <${mood === 'sleeping' ? '' : tail}`]
}
