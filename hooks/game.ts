import type { Cat, EffectKind, Upgrades } from '../types'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
const MAX_AFK_MS = 8 * 60 * MINUTE
const EVENTS_PER_MIN = 0.02

export type Action = 'feed' | 'play' | 'pet' | 'nap'
export type Item = keyof Upgrades
export type Mood = 'sleeping' | 'sad' | 'happy' | 'ok'
export type Stage = 'kitten' | 'cat' | 'chonk'

export const SHOP: Record<Item, { label: string; base: number; perk: string }> = {
  feeder: { label: 'Auto-feeder', base: 40, perk: 'feeds the cat when hungry' },
  toy: { label: 'Yarn toy', base: 25, perk: '+25% coins per level' },
  bed: { label: 'Cozy bed', base: 30, perk: 'naps restore energy faster' },
}
const MAX_UPGRADE = 5

const AFK_EVENTS = [
  'caught a mouse', 'found a coin under the sofa', 'knocked a cup off the desk (it had coins)',
  'won a staring contest with a pigeon', 'sold a hairball to a collector',
]

const clamp = (n: number) => Math.max(0, Math.min(100, n))
const dayOf = (now: number) => Math.floor(now / DAY)
const fx = (kind: EffectKind, at: number) => ({ kind, at })

export const newCat = (now: number, name = 'Mochi'): Cat => ({
  name, hunger: 80, joy: 80, energy: 80, xp: 0, level: 1, coins: 10,
  isAsleep: false, lastTick: now, frame: 0, log: `${name} has moved in!`,
  streak: 0, lastDay: 0, upgrades: { feeder: 0, toy: 0, bed: 0 }, effect: null,
})

// Fills fields a save from an older version of the mod lacks.
export const normalize = (saved: Partial<Cat>, now: number): Cat => {
  const base = newCat(now, saved.name)
  return { ...base, ...saved, upgrades: { ...base.upgrades, ...saved.upgrades } }
}

export const xpToNext = (level: number) => level * 50
export const stageOf = (level: number): Stage => (level < 5 ? 'kitten' : level < 10 ? 'cat' : 'chonk')
export const priceOf = (cat: Cat, item: Item) => Math.round(SHOP[item].base * 1.8 ** cat.upgrades[item])
export const coinRate = (cat: Cat) => cat.level * (1 + 0.25 * cat.upgrades.toy) * (cat.hunger < 20 ? 0.5 : 1)

const gainXp = (cat: Cat, xp: number, now: number): Cat => {
  let next = { ...cat, xp: cat.xp + xp }
  while (next.xp >= xpToNext(next.level)) {
    const level = next.level + 1
    const evolved = stageOf(level) !== stageOf(next.level)
    next = { ...next, xp: next.xp - xpToNext(next.level), level, effect: fx('levelup', now),
      log: evolved ? `${next.name} evolved into a ${stageOf(level)}!` : `${next.name} reached level ${level}!` }
  }
  return next
}

// Advances real time since lastTick; offline time is capped at 8h.
export const tick = (cat: Cat, now: number, rng: () => number = Math.random): Cat => {
  const min = Math.min(Math.max(0, now - cat.lastTick), MAX_AFK_MS) / MINUTE
  const regen = 3 * (1 + 0.5 * cat.upgrades.bed)
  const energy = cat.isAsleep ? cat.energy + regen * min : cat.energy - 0.2 * min
  let next: Cat = {
    ...cat,
    hunger: clamp(cat.hunger - 0.5 * min),
    joy: clamp(cat.joy - 0.3 * min),
    energy: clamp(energy),
    isAsleep: cat.isAsleep && energy < 100,
    coins: cat.coins + coinRate(cat) * min,
    lastTick: now,
    frame: cat.frame + 1,
  }
  if (cat.isAsleep && !next.isAsleep) next.log = `${cat.name} wakes up fully rested.`
  for (let i = 0; i < 10 && cat.upgrades.feeder > 0 && next.hunger < 40 && next.coins >= 5; i++) {
    next = { ...next, coins: next.coins - 5, hunger: clamp(next.hunger + 30), effect: fx('fish', now),
      log: `The auto-feeder served ${cat.name} a fish.` }
  }
  const events = Math.floor(min * EVENTS_PER_MIN + rng())
  if (events > 0) {
    const what = AFK_EVENTS[Math.floor(rng() * AFK_EVENTS.length)] ?? AFK_EVENTS[0]
    next = { ...next, coins: next.coins + 5 * cat.level * events, effect: fx('coins', now),
      log: `${cat.name} ${what}! +${5 * cat.level * events}c` }
  }
  return next
}

// Once per calendar day: a bonus that grows with the streak (capped at 7 days).
export const checkIn = (cat: Cat, now: number): { cat: Cat; bonus: number } => {
  const day = dayOf(now)
  if (day === cat.lastDay) return { cat, bonus: 0 }
  const streak = day === cat.lastDay + 1 ? cat.streak + 1 : 1
  const bonus = 10 * Math.min(streak, 7) * cat.level
  return { bonus, cat: { ...cat, streak, lastDay: day, coins: cat.coins + bonus, effect: fx('coins', now),
    log: `Day ${streak} streak! ${cat.name} brings you ${bonus}c.` } }
}

export const act = (cat: Cat, action: Action, now: number): Cat => {
  if (action === 'nap') {
    return { ...cat, isAsleep: !cat.isAsleep,
      log: cat.isAsleep ? `${cat.name} wakes up and stretches.` : `${cat.name} curls up for a nap.` }
  }
  if (cat.isAsleep) return { ...cat, log: `Shh… ${cat.name} is sleeping.` }
  if (action === 'feed') {
    if (cat.coins < 5) return { ...cat, log: 'Not enough coins for fish (5).' }
    return gainXp({ ...cat, coins: cat.coins - 5, hunger: clamp(cat.hunger + 30), effect: fx('fish', now),
      log: `${cat.name} munches a fish. Nom. +2xp` }, 2, now)
  }
  if (action === 'play') {
    if (cat.energy < 10) return { ...cat, log: `${cat.name} is too tired to play.` }
    return gainXp({ ...cat, energy: clamp(cat.energy - 10), joy: clamp(cat.joy + 25), effect: fx('yarn', now),
      hunger: clamp(cat.hunger - 5), log: `${cat.name} chases the yarn ball! +5xp` }, 5, now)
  }
  return gainXp({ ...cat, joy: clamp(cat.joy + 5), effect: fx('hearts', now), log: `${cat.name} purrs. +1xp` }, 1, now)
}

export const buy = (cat: Cat, item: Item, now: number): Cat => {
  const { label } = SHOP[item]
  if (cat.upgrades[item] >= MAX_UPGRADE) return { ...cat, log: `${label} is already maxed.` }
  const price = priceOf(cat, item)
  if (cat.coins < price) return { ...cat, log: `${label} costs ${price}c. Keep idling!` }
  return { ...cat, coins: cat.coins - price, upgrades: { ...cat.upgrades, [item]: cat.upgrades[item] + 1 },
    effect: fx('shop', now), log: `Bought ${label} lv${cat.upgrades[item] + 1}!` }
}

// Claude finishing a turn cheers the cat on.
export const reward = (cat: Cat, coins: number, xp = 0, now = cat.lastTick): Cat =>
  xp > 0 ? gainXp({ ...cat, coins: cat.coins + coins }, xp, now) : { ...cat, coins: cat.coins + coins }

export const moodOf = (cat: Cat): Mood => {
  if (cat.isAsleep) return 'sleeping'
  if (Math.min(cat.hunger, cat.joy, cat.energy) < 20) return 'sad'
  return cat.joy > 70 ? 'happy' : 'ok'
}

export const bar = (n: number, width = 10) => {
  const full = Math.round((clamp(n) / 100) * width)
  return '█'.repeat(full) + '░'.repeat(width - full)
}
