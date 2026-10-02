import type { Cat, EffectKind, Genes, Home, Slot } from '../types'
import { GINGER, rollGenes } from './genes'
import { STARTER, homeMods, maxCats, repayFromIncome } from './home'
import { modsOf } from './mods'
import { pick } from './rng'
import { FORM_LEVEL, canLearn, formOf, learn, respecPrice } from './skills'
import type { Rng } from './rng'
import { stepVisitors } from './visitors'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
const MAX_AFK_MS = 8 * 60 * MINUTE
const EVENTS_PER_MIN = 0.02
// Time away never pushes a stat below this: cats get grumpy, never sad.
export const DECAY_FLOOR = 25

export type Action = 'feed' | 'play' | 'pet' | 'nap'
export type Mood = 'sleeping' | 'grumpy' | 'happy' | 'ok'
export type Stage = 'kitten' | 'cat'

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

const STARTER_DECOR: Partial<Record<Slot, string>> = { bowl: 'bowl', bed: 'box', toy: 'yarn' }

export const newHome = (now: number, cat: Cat = newCat('c1', 'Mochi', GINGER, now)): Home => ({
  version: 3, coins: 10, cats: [cat], activeId: cat.id, lastTick: now, frame: 0,
  log: `${cat.name} has moved in!`, streak: 0, lastDay: 0, effect: null,
  tier: 0, loan: 0, owned: [...STARTER], decor: { ...STARTER_DECOR }, visitors: [], nextId: 2,
})

type OldUpgrades = Partial<{ feeder: number; toy: number; bed: number }>
type V1Cat = Partial<{
  name: string; hunger: number; joy: number; energy: number; xp: number; level: number; coins: number
  isAsleep: boolean; lastTick: number; frame: number; log: string; streak: number; lastDay: number
  upgrades: OldUpgrades
}>
type V2Home = Omit<Home, 'version' | 'tier' | 'loan' | 'owned' | 'decor' | 'visitors' | 'nextId'> &
  { version: 2; upgrades?: OldUpgrades }

// The old 3-item shop levels become the matching furniture, owned and placed.
const furnitureFromUpgrades = (u: OldUpgrades = {}) => {
  const owned = [...STARTER]
  const decor = { ...STARTER_DECOR }
  const add = (id: string, slot: Slot) => { owned.push(id); decor[slot] = id }
  if ((u.feeder ?? 0) > 0) add('feeder', 'bowl')
  if ((u.toy ?? 0) > 0) add('wand', 'toy')
  if ((u.toy ?? 0) >= 3) add('laser', 'toy')
  if ((u.bed ?? 0) > 0) add('cozy', 'bed')
  if ((u.bed ?? 0) >= 3) add('heated', 'bed')
  return { owned, decor }
}

// Loads any save: v3 gets missing fields filled; v2 households and v1 single cats are converted.
export const migrate = (saved: unknown, now: number): Home => {
  if (!saved || typeof saved !== 'object') return newHome(now)
  const base = newHome(now)
  const version = (saved as { version?: number }).version
  if (version === 3) return { ...base, ...(saved as Home) }
  if (version === 2) {
    const { upgrades, maxCats: _old, ...v2 } = saved as V2Home & { maxCats?: number }
    const nextId = Math.max(0, ...v2.cats.map(c => Number(c.id.slice(1)) || 0)) + 1
    return { ...base, ...v2, version: 3, ...furnitureFromUpgrades(upgrades), nextId }
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
    ...furnitureFromUpgrades(v1.upgrades),
  }
}

export const activeCat = (home: Home): Cat => home.cats.find(c => c.id === home.activeId) ?? (home.cats[0] as Cat)
const withCat = (home: Home, id: string, fn: (cat: Cat) => Cat): Home =>
  ({ ...home, cats: home.cats.map(c => (c.id === id ? fn(c) : c)) })

export const xpToNext = (level: number) => level * 50
export const stageOf = (level: number): Stage => (level < 5 ? 'kitten' : 'cat')
// What the cat is called now: its evolved form from FORM_LEVEL, else its stage.
export const stageName = (cat: Cat): string => formOf(cat) ?? stageOf(cat.level)
export const adoptPrice = (home: Home) => 100 * home.cats.length
export const catRate = (home: Home, cat: Cat) =>
  cat.level * modsOf(cat).coin * homeMods(home).coin * (cat.hunger < 35 ? 0.75 : 1) *
  (cat.isAsleep ? modsOf(cat).sleepCoin : 1)
export const coinRate = (home: Home) => home.cats.reduce((sum, cat) => sum + catRate(home, cat), 0)

const gainXp = (home: Home, id: string, xp: number, now: number): Home => {
  let log = home.log
  let effect = home.effect
  const next = withCat(home, id, cat => {
    let c = { ...cat, xp: cat.xp + Math.round(xp * modsOf(cat).xp) }
    while (c.xp >= xpToNext(c.level)) {
      const level = c.level + 1
      c = { ...c, xp: c.xp - xpToNext(c.level), level }
      effect = fx(level === FORM_LEVEL ? 'evolve' : 'levelup', now)
      log = level === FORM_LEVEL ? `${c.name} evolved into a ${formOf(c)}!`
        : level === 5 ? `${c.name} grew into a cat! +1 skill point` : `${c.name} reached level ${level}! +1 skill point`
    }
    return c
  })
  return { ...next, log, effect }
}

const tickCat = (home: Home, cat: Cat, min: number): Cat => {
  const m = modsOf(cat)
  const regen = 3 * homeMods(home).regen * m.regen
  const energy = cat.isAsleep ? clamp(cat.energy + regen * min) : decay(cat.energy, 0.2 * m.energyDecay * min)
  return {
    ...cat,
    hunger: decay(cat.hunger, 0.5 * min),
    joy: decay(cat.joy, 0.3 * m.joyDecay * homeMods(home).joyDecay * min),
    energy,
    isAsleep: cat.isAsleep && energy < 100,
  }
}

// Advances real time since lastTick for every cat; offline time is capped at 8h.
export const tick = (home: Home, now: number, rng: Rng = Math.random): Home => {
  const cap = MAX_AFK_MS + Math.max(...home.cats.map(c => modsOf(c).offlineHours)) * 60 * MINUTE
  const min = Math.min(Math.max(0, now - home.lastTick), cap) / MINUTE
  const income = coinRate(home) * min
  let next: Home = repayFromIncome({
    ...home,
    cats: home.cats.map(cat => tickCat(home, cat, min)),
    coins: home.coins + income,
    lastTick: now,
    frame: home.frame + 1,
  }, income)
  const deco = homeMods(home)
  for (const cat of home.cats) {
    const woke = cat.isAsleep && !next.cats.find(c => c.id === cat.id)?.isAsleep
    if (woke) next.log = `${cat.name} wakes up fully rested.`
  }
  if (deco.autoFeed) {
    for (const cat of next.cats) {
      if (cat.hunger < 40 && next.coins >= 5) {
        next = withCat({ ...next, coins: next.coins - 5, effect: fx('fish', now),
          log: `The auto-feeder served ${cat.name} a fish.` }, cat.id, c => ({ ...c, hunger: clamp(c.hunger + 30) }))
      }
    }
  }
  const finder = pick(rng, home.cats)
  const events = Math.floor(min * EVENTS_PER_MIN * modsOf(finder).eventRate * deco.eventRate + rng())
  if (events > 0) {
    const gift = Math.round(5 * finder.level * events * modsOf(finder).gift * deco.gift)
    next = { ...next, coins: next.coins + gift, effect: fx('coins', now),
      log: `${finder.name} ${pick(rng, AFK_EVENTS)}! +${gift}c` }
  }
  return stepVisitors(next, now, min, rng)
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

// Takes in a new cat with random genes, if the house has room and the fee is paid.
export const adopt = (home: Home, now: number, rng: Rng = Math.random, name?: string): Home => {
  if (home.cats.length >= maxCats(home)) return { ...home, log: `The house is full (${maxCats(home)} cats).` }
  const price = adoptPrice(home)
  if (home.coins < price) return { ...home, log: `Adoption costs ${price}c.` }
  const taken = new Set(home.cats.map(c => c.name))
  const free = NAMES.filter(n => !taken.has(n))
  const cat = newCat(`c${home.nextId}`, name?.slice(0, 20) || pick(rng, free.length ? free : NAMES), rollGenes(rng), now)
  return { ...home, coins: home.coins - price, cats: [...home.cats, cat], activeId: cat.id, nextId: home.nextId + 1,
    effect: fx('adopt', now), log: `Welcome home, ${cat.name}!${cat.genes.isShiny ? ' ✨ A shiny cat!' : ''}` }
}

// A stray in the yard moves in for free (if there's room) and keeps its gift for later.
export const adoptVisitor = (home: Home, visitorId: string, now: number): Home => {
  const visitor = home.visitors.find(v => v.id === visitorId)
  if (!visitor) return { ...home, log: 'That stray already wandered off.' }
  if (home.cats.length >= maxCats(home)) return { ...home, log: `The house is full (${maxCats(home)} cats).` }
  const cat = newCat(`c${home.nextId}`, visitor.name, visitor.genes, now)
  return { ...home, cats: [...home.cats, cat], activeId: cat.id, nextId: home.nextId + 1,
    visitors: home.visitors.filter(v => v.id !== visitorId), coins: home.coins + visitor.gift,
    effect: fx('adopt', now), log: `${visitor.name} decided to stay! (+${visitor.gift}c gift)` }
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

// Spends one of the active cat's skill points.
export const learnSkill = (home: Home, id: string): Home => {
  const cat = activeCat(home)
  const check = canLearn(cat, id)
  if (!check.ok) return { ...home, log: `Can't learn that: ${check.reason}.` }
  const next = learn(cat, id)
  const form = formOf(next)
  const changed = form !== formOf(cat) ? ` ${cat.name} is now a ${form}!` : ''
  return withCat({ ...home, log: `${cat.name} learned a skill.${changed}` }, cat.id, () => next)
}

// Refunds every skill point of the active cat, for a fee.
export const respec = (home: Home, now: number): Home => {
  const cat = activeCat(home)
  const price = respecPrice(cat)
  if (home.coins < price) return { ...home, log: `Resetting skills costs ${price}c.` }
  return withCat({ ...home, coins: home.coins - price, effect: fx('shop', now),
    log: `${cat.name} forgot every skill. Points refunded.` }, cat.id, c => ({ ...c, skills: {} }))
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
