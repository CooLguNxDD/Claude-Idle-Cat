import type { Cat, EffectKind, Genes, Home, Upgrades } from '../types'
import { GINGER, rollGenes } from './genes'
import { modsOf } from './mods'
import { pick } from './rng'
import type { Rng } from './rng'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
const MAX_AFK_MS = 8 * 60 * MINUTE
const EVENTS_PER_MIN = 0.02
// Time away never pushes a stat below this: cats get grumpy, never sad.
export const DECAY_FLOOR = 25
const START_MAX_CATS = 2

export type Action = 'feed' | 'play' | 'pet' | 'nap'
export type Item = keyof Upgrades
export type Mood = 'sleeping' | 'grumpy' | 'happy' | 'ok'
export type Stage = 'kitten' | 'cat' | 'chonk'

export const SHOP: Record<Item, { label: string; base: number; perk: string }> = {
  feeder: { label: 'Auto-feeder', base: 40, perk: 'feeds hungry cats' },
  toy: { label: 'Yarn toy', base: 25, perk: '+25% coins per level' },
  bed: { label: 'Cozy bed', base: 30, perk: 'naps restore energy faster' },
}
const MAX_UPGRADE = 5

const NAMES = ['Tofu', 'Miso', 'Sushi', 'Nori', 'Biscuit', 'Pudding', 'Luna', 'Pixel', 'Bean', 'Taro', 'Boba',
  'Ziggy', 'Kiwi', 'Waffles', 'Socks', 'Pepper', 'Mango', 'Dumpling']
const AFK_EVENTS = [
  'caught a mouse', 'found a coin under the sofa', 'knocked a cup off the desk (it had coins)',
  'won a staring contest with a pigeon', 'sold a hairball to a collector',
]

const clamp = (n: number) => Math.max(0, Math.min(100, n))
const decay = (from: number, by: number) => clamp(Math.max(Math.min(from, DECAY_FLOOR), from - by))
const dayOf = (now: number) => Math.floor(now / DAY)
const fx = (kind: EffectKind, at: number) => ({ kind, at })

export const newCat = (id: string, name: string, genes: Genes, now: number): Cat => ({
  id, name, genes, bornAt: now, hunger: 80, joy: 80, energy: 80, xp: 0, level: 1, isAsleep: false, skills: {},
})

export const newHome = (now: number, cat: Cat = newCat('c1', 'Mochi', GINGER, now)): Home => ({
  version: 2, coins: 10, cats: [cat], activeId: cat.id, maxCats: START_MAX_CATS, lastTick: now, frame: 0,
  log: `${cat.name} has moved in!`, streak: 0, lastDay: 0, upgrades: { feeder: 0, toy: 0, bed: 0 }, effect: null,
})

type V1Cat = Partial<{
  name: string; hunger: number; joy: number; energy: number; xp: number; level: number; coins: number
  isAsleep: boolean; lastTick: number; frame: number; log: string; streak: number; lastDay: number
  upgrades: Partial<Upgrades>
}>

// Loads any save: a v2 Home gets missing fields filled; a v1 single cat becomes a household of one.
export const migrate = (saved: unknown, now: number): Home => {
  if (!saved || typeof saved !== 'object') return newHome(now)
  const base = newHome(now)
  if ((saved as Home).version === 2) {
    const home = saved as Home
    return { ...base, ...home, upgrades: { ...base.upgrades, ...home.upgrades } }
  }
  const v1 = saved as V1Cat
  const cat: Cat = {
    ...newCat('c1', v1.name ?? 'Mochi', GINGER, v1.lastTick ?? now),
    hunger: v1.hunger ?? 80, joy: v1.joy ?? 80, energy: v1.energy ?? 80, xp: v1.xp ?? 0,
    level: v1.level ?? 1, isAsleep: v1.isAsleep ?? false,
  }
  return {
    ...newHome(now, cat), coins: v1.coins ?? 10, lastTick: v1.lastTick ?? now, frame: v1.frame ?? 0,
    log: `${cat.name} settled into the new home.`, streak: v1.streak ?? 0, lastDay: v1.lastDay ?? 0,
    upgrades: { ...base.upgrades, ...v1.upgrades },
  }
}

export const activeCat = (home: Home): Cat => home.cats.find(c => c.id === home.activeId) ?? (home.cats[0] as Cat)
const withCat = (home: Home, id: string, fn: (cat: Cat) => Cat): Home =>
  ({ ...home, cats: home.cats.map(c => (c.id === id ? fn(c) : c)) })

export const xpToNext = (level: number) => level * 50
export const stageOf = (level: number): Stage => (level < 5 ? 'kitten' : level < 10 ? 'cat' : 'chonk')
export const priceOf = (home: Home, item: Item) => Math.round(SHOP[item].base * 1.8 ** home.upgrades[item])
export const adoptPrice = (home: Home) => 100 * home.cats.length
export const catRate = (home: Home, cat: Cat) =>
  cat.level * modsOf(cat).coin * (1 + 0.25 * home.upgrades.toy) * (cat.hunger < 35 ? 0.75 : 1)
export const coinRate = (home: Home) => home.cats.reduce((sum, cat) => sum + catRate(home, cat), 0)

const gainXp = (home: Home, id: string, xp: number, now: number): Home => {
  let log = home.log
  let effect = home.effect
  const next = withCat(home, id, cat => {
    let c = { ...cat, xp: cat.xp + xp }
    while (c.xp >= xpToNext(c.level)) {
      const level = c.level + 1
      const evolved = stageOf(level) !== stageOf(c.level)
      effect = fx('levelup', now)
      log = evolved ? `${c.name} evolved into a ${stageOf(level)}!` : `${c.name} reached level ${level}!`
      c = { ...c, xp: c.xp - xpToNext(c.level), level }
    }
    return c
  })
  return { ...next, log, effect }
}

const tickCat = (home: Home, cat: Cat, min: number): Cat => {
  const m = modsOf(cat)
  const regen = 3 * (1 + 0.5 * home.upgrades.bed)
  const energy = cat.isAsleep ? clamp(cat.energy + regen * min) : decay(cat.energy, 0.2 * m.energyDecay * min)
  return {
    ...cat,
    hunger: decay(cat.hunger, 0.5 * min),
    joy: decay(cat.joy, 0.3 * min),
    energy,
    isAsleep: cat.isAsleep && energy < 100,
  }
}

// Advances real time since lastTick for every cat; offline time is capped at 8h.
export const tick = (home: Home, now: number, rng: Rng = Math.random): Home => {
  const min = Math.min(Math.max(0, now - home.lastTick), MAX_AFK_MS) / MINUTE
  let next: Home = {
    ...home,
    cats: home.cats.map(cat => tickCat(home, cat, min)),
    coins: home.coins + coinRate(home) * min,
    lastTick: now,
    frame: home.frame + 1,
  }
  for (const cat of home.cats) {
    const woke = cat.isAsleep && !next.cats.find(c => c.id === cat.id)?.isAsleep
    if (woke) next.log = `${cat.name} wakes up fully rested.`
  }
  if (home.upgrades.feeder > 0) {
    for (const cat of next.cats) {
      if (cat.hunger < 40 && next.coins >= 5) {
        next = withCat({ ...next, coins: next.coins - 5, effect: fx('fish', now),
          log: `The auto-feeder served ${cat.name} a fish.` }, cat.id, c => ({ ...c, hunger: clamp(c.hunger + 30) }))
      }
    }
  }
  const finder = pick(rng, home.cats)
  const events = Math.floor(min * EVENTS_PER_MIN * modsOf(finder).eventRate + rng())
  if (events > 0) {
    const gift = Math.round(5 * finder.level * events * modsOf(finder).gift)
    next = { ...next, coins: next.coins + gift, effect: fx('coins', now),
      log: `${finder.name} ${pick(rng, AFK_EVENTS)}! +${gift}c` }
  }
  return next
}

// Once per calendar day: a bonus that grows with the streak (capped at 7 days).
export const checkIn = (home: Home, now: number): { home: Home; bonus: number } => {
  const day = dayOf(now)
  if (day === home.lastDay) return { home, bonus: 0 }
  const streak = day === home.lastDay + 1 ? home.streak + 1 : 1
  const level = Math.max(...home.cats.map(c => c.level))
  const bonus = 10 * Math.min(streak, 7) * level
  return { bonus, home: { ...home, streak, lastDay: day, coins: home.coins + bonus, effect: fx('coins', now),
    log: `Day ${streak} streak! The cats bring you ${bonus}c.` } }
}

// Feed, play, pet or nap the active cat.
export const act = (home: Home, action: Action, now: number): Home => {
  const cat = activeCat(home)
  const m = modsOf(cat)
  if (action === 'nap') {
    const log = cat.isAsleep ? `${cat.name} wakes up and stretches.` : `${cat.name} curls up for a nap.`
    return withCat({ ...home, log }, cat.id, c => ({ ...c, isAsleep: !c.isAsleep }))
  }
  if (cat.isAsleep) return { ...home, log: `Shh… ${cat.name} is sleeping.` }
  if (action === 'feed') {
    if (home.coins < 5) return { ...home, log: 'Not enough coins for fish (5).' }
    const fed = withCat({ ...home, coins: home.coins - 5, effect: fx('fish', now),
      log: `${cat.name} munches a fish. Nom. +2xp` }, cat.id, c => ({ ...c, hunger: clamp(c.hunger + 30) }))
    return gainXp(fed, cat.id, 2, now)
  }
  if (action === 'play') {
    if (cat.energy < 10) return { ...home, log: `${cat.name} is too tired to play.` }
    const played = withCat({ ...home, effect: fx('yarn', now), log: `${cat.name} chases the yarn ball! +5xp` }, cat.id,
      c => ({ ...c, energy: clamp(c.energy - 10), joy: clamp(c.joy + 25 * m.playJoy), hunger: clamp(c.hunger - 5) }))
    return gainXp(played, cat.id, 5, now)
  }
  const petted = withCat({ ...home, effect: fx('hearts', now), log: `${cat.name} purrs. +1xp` }, cat.id,
    c => ({ ...c, joy: clamp(c.joy + 5 * m.petJoy) }))
  return gainXp(petted, cat.id, 1, now)
}

export const buy = (home: Home, item: Item, now: number): Home => {
  const { label } = SHOP[item]
  if (home.upgrades[item] >= MAX_UPGRADE) return { ...home, log: `${label} is already maxed.` }
  const price = priceOf(home, item)
  if (home.coins < price) return { ...home, log: `${label} costs ${price}c. Keep idling!` }
  return { ...home, coins: home.coins - price, upgrades: { ...home.upgrades, [item]: home.upgrades[item] + 1 },
    effect: fx('shop', now), log: `Bought ${label} lv${home.upgrades[item] + 1}!` }
}

const nextId = (home: Home) => `c${Math.max(0, ...home.cats.map(c => Number(c.id.slice(1)) || 0)) + 1}`

// Takes in a new cat with random genes, if the house has room and the fee is paid.
export const adopt = (home: Home, now: number, rng: Rng = Math.random, name?: string): Home => {
  if (home.cats.length >= home.maxCats) return { ...home, log: `The house is full (${home.maxCats} cats).` }
  const price = adoptPrice(home)
  if (home.coins < price) return { ...home, log: `Adoption costs ${price}c.` }
  const taken = new Set(home.cats.map(c => c.name))
  const free = NAMES.filter(n => !taken.has(n))
  const cat = newCat(nextId(home), name?.slice(0, 20) || pick(rng, free.length ? free : NAMES), rollGenes(rng), now)
  return { ...home, coins: home.coins - price, cats: [...home.cats, cat], activeId: cat.id, effect: fx('adopt', now),
    log: `Welcome home, ${cat.name}!${cat.genes.isShiny ? ' ✨ A shiny cat!' : ''}` }
}

export const switchTo = (home: Home, nameOrId: string): Home => {
  const key = nameOrId.toLowerCase()
  const cat = home.cats.find(c => c.id === nameOrId || c.name.toLowerCase() === key)
  return cat ? { ...home, activeId: cat.id, log: `${cat.name} is front and centre.` }
    : { ...home, log: `No cat named ${nameOrId}.` }
}

export const rename = (home: Home, name: string): Home => {
  const cat = activeCat(home)
  const clean = name.slice(0, 20)
  return withCat({ ...home, log: `${cat.name} is now ${clean}!` }, cat.id, c => ({ ...c, name: clean }))
}

// Claude's work tips the household; xp goes to the active cat.
export const reward = (home: Home, coins: number, xp = 0, now = home.lastTick): Home => {
  const paid = { ...home, coins: home.coins + coins }
  return xp > 0 ? gainXp(paid, home.activeId, xp, now) : paid
}

export const moodOf = (cat: Cat): Mood => {
  if (cat.isAsleep) return 'sleeping'
  if (Math.min(cat.hunger, cat.joy, cat.energy) < 35) return 'grumpy'
  return cat.joy > 70 ? 'happy' : 'ok'
}

export const bar = (n: number, width = 10) => {
  const full = Math.round((clamp(n) / 100) * width)
  return '█'.repeat(full) + '░'.repeat(width - full)
}
