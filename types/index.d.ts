export type EffectKind = 'hearts' | 'fish' | 'yarn' | 'coins' | 'levelup' | 'shop'
export type Effect = { kind: EffectKind; at: number }
export type Upgrades = { feeder: number; toy: number; bed: number }

export type Cat = {
  name: string
  hunger: number
  joy: number
  energy: number
  xp: number
  level: number
  coins: number
  isAsleep: boolean
  lastTick: number
  frame: number
  log: string
  streak: number
  lastDay: number
  upgrades: Upgrades
  effect: Effect | null
}

declare module 'claude-code' {
  interface PluginState {
    'afk-cat': { cat: Cat | null }
  }
}
