export type EffectKind = 'hearts' | 'fish' | 'yarn' | 'coins' | 'levelup' | 'evolve' | 'shop' | 'adopt' | 'visitor' | 'welcome' | 'gift' | 'catch' | 'award' | 'birthday' | 'medal'
export type Effect = { kind: EffectKind; at: number }

export type Coat = 'ginger' | 'tabby' | 'grey' | 'black' | 'white' | 'cream' | 'calico' | 'tuxedo' | 'siamese'
  | 'chocolate' | 'cinnamon' | 'silver' | 'smoke' | 'tortoiseshell' | 'ragdoll' | 'bengal' | 'lynx' | 'nebula'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type Marking = 'classic' | 'socks' | 'blaze' | 'mask' | 'spots'
export type Silhouette = 'classic' | 'fluffy' | 'fold'
export type Eyes = 'green' | 'blue' | 'yellow' | 'odd'
export type Personality = 'lazy' | 'playful' | 'greedy' | 'shy' | 'cuddly' | 'curious'
export type Genes = { coat: Coat; eyes: Eyes; personality: Personality; isShiny: boolean
  marking?: Marking; silhouette?: Silhouette }

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

export type View = 'cat' | 'skills' | 'home' | 'friends' | 'book' | 'miles' | 'arcade' | 'weather' | 'adopt'
export type Route = { view: View; history: View[] }
export type Shelter = { pulls: number; last: { catId: string; at: number; cost: number } | null }

export type WeatherCondition = 'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'
export type WeatherLocation = { label: string; latitude: number; longitude: number; source: 'city' | 'coordinates' | 'device' }
export type WeatherReading = {
  code: number; condition: WeatherCondition; temperatureC: number; windKph: number; windDegrees: number
  cloudPercent: number; precipitationMm: number; isDay: boolean; observedAt: number; fetchedAt: number; utcOffset: number
}
export type WeatherState = {
  location: WeatherLocation | null; units: 'c' | 'f'; current: WeatherReading | null
  attemptedAt: number | null; error: string | null; candidates: WeatherLocation[]; notice: string | null
}

export type GameId = 'dash' | 'catch' | 'laser' | 'whack' | 'tank' | 'lanes'
// Mini-games: today's paid plays, best scores, and the round in progress (paid only if it was started).
export type Arcade = {
  day: number
  plays: Partial<Record<GameId, number>>
  best: Partial<Record<GameId, number>>
  golds: number
  open: { game: GameId; at: number; catId?: string } | null
}

// What the household has collected, recorded the first time it is seen.
export type Book = { coats: Coat[]; forms: string[]; shinies: string[]; visitors: string[]; photos: string[] }
// Paw Miles: today's task counters, which tasks paid out, and the running total.
export type Miles = { total: number; day: number; counts: Record<string, number>; done: string[] }

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
  book: Book
  pocket: Record<string, number>
  museum: string[]
  miles: Miles
  achievements: Record<string, number>
  shinyCharm: boolean
  // Birthdays already celebrated, as `${catId}:${year}`.
  celebrated: string[]
  // Catnip bought from Daisy Meow this week; it spoils after Saturday.
  catnip: { week: number; qty: number; paid: number }
  arcade: Arcade
  // Bumped on every save, so a session can tell when another one saved after it.
  rev: number
  // Browser arcade display settings.
  prefs: { glow: boolean; crt: boolean }
  weather: WeatherState
  shelter: Shelter
}

declare module 'claude-code' {
  interface PluginState {
    'afk-cat': { home: Home | null; route: Route; isCatListOpen: boolean }
  }
}
