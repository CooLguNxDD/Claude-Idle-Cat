import type { GameId } from '../../types'
import type { FlavorName } from '../theme'

export const BACKGROUND_IDS = ['dash', 'catch', 'laser', 'whack', 'tank', 'lanes'] as const satisfies readonly GameId[]
export const backgroundUrl = (id: GameId, flavor: FlavorName) => `/art/${id}.${flavor}.png`
export type Background = { w: number; h: number; px: Uint32Array }
export const WORLD_W = 112
export const WORLD_H = 64
export const ART_W = 320
export const ART_H = 180
