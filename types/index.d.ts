export type EffectKind = 'hearts' | 'fish' | 'yarn' | 'coins' | 'levelup' | 'evolve' | 'shop' | 'adopt' | 'visitor' | 'welcome' | 'gift'
export type Effect = { kind: EffectKind; at: number }

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
  friendship: number
  // Today's friendship: points earned (capped) and whether a gift was given.
  daily: { day: number; points: number; gifted: boolean }
  lastGift: { id: string; day: number } | null
}

// A stray in the yard: it stays a while, leaves a gift, and can be adopted.
export type Visitor = { id: string; name: string; genes: Genes; arrivedAt: number; leavesAt: number; gift: number }

export type Slot = 'bowl' | 'bed' | 'toy' | 'rug' | 'plant' | 'hanging'

export type View = 'cat' | 'skills' | 'home' | 'friends'

export type Home = {
  version: 3
  coins: number
  cats: Cat[]
  activeId: string
  lastTick: number
  frame: number
  log: string
  streak: number
  lastDay: number
  effect: Effect | null
  tier: number
  loan: number
  owned: string[]
  decor: Partial<Record<Slot, string>>
  visitors: Visitor[]
  nextId: number
}

declare module 'claude-code' {
  interface PluginState {
    'afk-cat': { home: Home | null; view: View }
  }
}
