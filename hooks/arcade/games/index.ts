import type { Game, GameId } from '../game'
import { fishCatch } from './catch'
import { dash } from './dash'
import { tank } from './tank'
import { laser } from './laser'
import { whack } from './whack'

// Every arcade game, in picker order.
export const GAMES: readonly Game<any>[] = [dash, fishCatch, laser, whack, tank]
export const gameOf = (id: string): Game<any> | undefined => GAMES.find(g => g.id === id)
export const isGameId = (id: unknown): id is GameId => typeof id === 'string' && GAMES.some(g => g.id === id)
