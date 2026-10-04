import type { Cat, Personality } from '../types'
import { localDay } from './time'

const DAY = 86_400_000
export const dayOf = localDay
export const DAILY_CAP = 10

// Animal Crossing-style friendship: six levels, unlocking more as it grows.
export const LEVELS = [
  { name: 'Stranger', at: 0 },
  { name: 'Acquaintance', at: 30 },
  { name: 'Buddy', at: 80 },
  { name: 'Friend', at: 150 },
  { name: 'Close friend', at: 250 },
  { name: 'Best friend', at: 400 },
] as const
export const NICKNAME_LEVEL = 3
export const CATCHPHRASE_LEVEL = 4
export const PHOTO_LEVEL = 6

export const friendLevel = (points: number) => LEVELS.filter(l => points >= l.at).length
export const levelName = (points: number) => LEVELS[friendLevel(points) - 1]?.name ?? 'Stranger'
export const toNextLevel = (points: number) => {
  const next = LEVELS[friendLevel(points)]
  return next ? { need: next.at - points, at: next.at } : null
}
export const hasPhoto = (cat: Cat) => friendLevel(cat.friendship) >= PHOTO_LEVEL

export type Gift = { id: string; name: string; price: number; loves: Personality }
export const GIFTS: readonly Gift[] = [
  { id: 'tuna', name: 'tuna can', price: 12, loves: 'greedy' },
  { id: 'feather', name: 'feather', price: 8, loves: 'playful' },
  { id: 'pillow', name: 'tiny pillow', price: 15, loves: 'lazy' },
  { id: 'ribbon', name: 'ribbon', price: 10, loves: 'cuddly' },
  { id: 'bell', name: 'jingle bell', price: 10, loves: 'curious' },
  { id: 'box', name: 'small box', price: 6, loves: 'shy' },
]
export const giftById = (id: string) => GIFTS.find(g => g.id === id)
export const giftPoints = (cat: Cat, gift: Gift) => (gift.loves === cat.genes.personality ? 15 : 6)

const today = (cat: Cat, now: number) =>
  cat.daily.day === dayOf(now) ? cat.daily : { day: dayOf(now), points: 0, gifted: false }

// Everyday care adds friendship, up to DAILY_CAP points a day.
export const befriend = (cat: Cat, points: number, now: number): Cat => {
  const d = today(cat, now)
  const add = Math.max(0, Math.min(points, DAILY_CAP - d.points))
  return { ...cat, friendship: cat.friendship + add, daily: { ...d, points: d.points + add } }
}

export type GiftResult = { cat: Cat; points: number } | { reason: string }
// One gift per cat per day; a favorite counts much more.
export const receiveGift = (cat: Cat, gift: Gift, now: number): GiftResult => {
  const d = today(cat, now)
  if (d.gifted) return { reason: `${cat.name} already got a gift today.` }
  const points = giftPoints(cat, gift)
  return { points, cat: { ...cat, friendship: cat.friendship + points, daily: { ...d, gifted: true },
    lastGift: { id: gift.id, day: dayOf(now) } } }
}

const NICKNAMES: Record<Personality, string> = {
  lazy: 'pillow', playful: 'buddy', greedy: 'boss', shy: 'friend', cuddly: 'hooman', curious: 'coder',
}
const CATCHPHRASES: Record<Personality, string> = {
  lazy: '…zzz', playful: 'nya!', greedy: 'meowney', shy: 'mew', cuddly: 'purr', curious: 'hmm?',
}
const LINES: Record<Personality, readonly string[]> = {
  lazy: ["*yawns* oh, it's you", 'Is it nap time? It is always nap time.', 'Wake me when the fish arrives.'],
  playful: ['Throw the yarn! THROW IT!', 'I am so fast today!', 'Bet you cannot catch me!'],
  greedy: ['Did you bring snacks?', 'Coins! I love coins. Shiny.', 'That bowl looks… empty.'],
  shy: ['…hi.', '*peeks out of the box*', 'You are nice. I think.'],
  cuddly: ['Pets? Pets please.', 'I missed you!', '*purrs loudly*'],
  curious: ["What's that? And that?", 'I saw a bird. A BIRD.', 'What are you typing?'],
}
const GREETINGS = ['Hey', 'Oh hi', 'Psst']

// Nickname and catchphrase, the same rule dialogue uses. Seed keeps a line stable.
export const decorate = (cat: Cat, text: string, seed: number): string => {
  const p = cat.genes.personality
  const level = friendLevel(cat.friendship)
  const n = Math.abs(seed)
  let line = text
  if (level >= NICKNAME_LEVEL) line = `${GREETINGS[n % GREETINGS.length]}, ${NICKNAMES[p]}! ${line}`
  if (level >= CATCHPHRASE_LEVEL) line = `${line} ${CATCHPHRASES[p]}`
  return line
}

// What the cat says right now: changes by the hour, remembers yesterday's gift.
export const dialogue = (cat: Cat, now: number, hour: number): string => {
  const p = cat.genes.personality
  const seed = hour + cat.id.length + cat.name.length
  const gift = cat.lastGift && giftById(cat.lastGift.id)
  const days = cat.lastGift ? dayOf(now) - cat.lastGift.day : 99
  const line = gift && days === 0 ? (gift.loves === p ? `A ${gift.name}! My favorite!` : `Oh, a ${gift.name}. Thanks.`)
    : gift && days >= 1 && days <= 2 && gift.loves === p ? `Still thinking about that ${gift.name}…`
    : LINES[p][seed % LINES[p].length] ?? '…'
  return decorate(cat, line, seed)
}

export const NEW_FRIEND = { friendship: 0, daily: { day: 0, points: 0, gifted: false }, lastGift: null }
