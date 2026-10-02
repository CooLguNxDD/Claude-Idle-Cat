import type { Game, GameId } from '../game'
import { dash } from './dash'

// Every arcade game, in picker order.
export const GAMES: readonly Game<any>[] = [dash]
export const gameOf = (id: string): Game<any> | undefined => GAMES.find(g => g.id === id)
export const isGameId = (id: unknown): id is GameId => typeof id === 'string' && GAMES.some(g => g.id === id)
