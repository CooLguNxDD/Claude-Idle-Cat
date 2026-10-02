export type EffectKind = 'hearts' | 'fish' | 'yarn' | 'coins' | 'levelup' | 'shop' | 'adopt'
export type Effect = { kind: EffectKind; at: number }
export type Upgrades = { feeder: number; toy: number; bed: number }

export type Coat = 'ginger' | 'tabby' | 'grey' | 'black' | 'white' | 'cream' | 'calico' | 'tuxedo' | 'siamese'
export type Eyes = 'green' | 'blue' | 'yellow' | 'odd'
export type Personality = 'lazy' | 'playful' | 'greedy' | 'shy' | 'cuddly' | 'curious'
export type Genes = { coat: Coat; eyes: Eyes; personality: Personality; isShiny: boolean }

export type Cat = {
  id: string
  name: string
  genes: Genes
  bornAt: number
  hunger: number
  joy: number
  energy: number
  xp: number
  level: number
  isAsleep: boolean
  skills: Record<string, number>
}

export type Home = {
  version: 2
  coins: number
  cats: Cat[]
  activeId: string
  maxCats: number
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
    'afk-cat': { home: Home | null }
  }
}
