import type { Game } from './game'

export type Medal = 'bronze' | 'silver' | 'gold'

export const medalOf = (game: Pick<Game<unknown>, 'medals'>, score: number): Medal | null =>
  score >= game.medals[2] ? 'gold' : score >= game.medals[1] ? 'silver' : score >= game.medals[0] ? 'bronze' : null
