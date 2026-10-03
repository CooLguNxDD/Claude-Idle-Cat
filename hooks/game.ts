import { normalizeProgression } from './progression-save'
import { catsAtHome, isAway } from './away'
import type { Cat, EffectKind, Genes, Home, Slot } from '../types'
import { RARITIES, rarityOf } from './adoption/registry'
import { emptyShelter, normalizeShelter } from './adoption/state'
import { celebrate, spoil } from './calendar'
import { EMPTY_BOOK, EMPTY_MILES, track } from './collection'
import type { Counter } from './collection'
import { addToPocket, critter, donate, findCritters } from './critters'
import { NEW_FRIEND, befriend, giftById, levelName, receiveGift } from './friends'
import { GINGER, rollGenes } from './genes'
import { STARTER, buyFurniture, homeMods, maxCats, repayFromIncome } from './home'
import { modsOf } from './mods'
import { pick } from './rng'
import { FORM_LEVEL, canLearn, formOf, learn, respecPrice } from './skills'
import type { Rng } from './rng'
import { localDay } from './time'
import { stepVisitors } from './visitors'
import { emptyWeather, normalizeWeather } from './weather/state'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
const MAX_AFK_MS = 8 * 60 * MINUTE
const EVENTS_PER_MIN = 0.02
// Idle time earns a share of the full rate; Claude's work pays in minutes of it.
export const IDLE_SHARE = 0.5
const TOOL_MINUTES = 0.15
// Only some tool calls pay, so a long run of calls is a few tips, not a steady wage.
export const TOOL_CHANCE = 0.2
const MINUTES_PER_USD = 8
// A reply pays its active time, up to this many minutes: a long sleep or an unanswered prompt can't farm it.
export const ACTIVE_CAP_MINUTES = 30
// Claude's pay in a chat grows from 1x to RAMP_MAX over its first RAMP_MINUTES of active time.
const RAMP_MINUTES = 60
const RAMP_MAX = 2
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
const dayOf = localDay
const fx = (kind: EffectKind, at: number) => ({ kind, at })

export const newCat = (id: string, name: string, genes: Genes, now: number): Cat => ({
  id, name, genes, bornAt: now, hunger: 80, joy: 80, energy: 80, xp: 0, level: 1, isAsleep: false, skills: {},
  ...NEW_FRIEND,
})

// Fills fields older saves lack on a cat.
const normalizeCat = (cat: Cat): Cat => ({ ...NEW_FRIEND, ...cat })

const STARTER_DECOR: Partial<Record<Slot, string>> = { bowl: 'bowl', bed: 'box', toy: 'yarn' }

export const newHome = (now: number, cat: Cat = newCat('c1', 'Mochi', GINGER, now)): Home => ({
  version: 3, coins: 10, cats: [cat], activeId: cat.id, lastTick: now, frame: 0,
  log: `${cat.name} has moved in!`, streak: 0, lastDay: 0, effect: null,
  tier: 0, loan: 0, owned: [...STARTER], decor: { ...STARTER_DECOR }, visitors: [], nextId: 2,
  book: EMPTY_BOOK, pocket: {}, museum: [], miles: EMPTY_MILES, achievements: {}, shinyCharm: false,
  celebrated: [], catnip: { week: 0, qty: 0, paid: 0 }, arcade: { day: 0, plays: {}, best: {}, golds: 0, open: null },
  rev: 0, prefs: { glow: true, crt: false }, weather: emptyWeather(), shelter: emptyShelter(),
  world: { id: 'backyard' },
  expeditions: { runs: [], done: {}, inbox: [] }, materials: {}, gear: {}, bonds: {},
  quests: { day: 0, progress: {}, claimed: [] }, exchanges: { day: 0, pairs: [], visitors: [] },
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
  if (version === 3) {
    const home = saved as Home
    // A round left open by a closed session is dropped (its energy stays spent).
    return { ...base, ...home, cats: home.cats.map(normalizeCat), arcade: { ...base.arcade, ...home.arcade, open: null },
      weather: normalizeWeather(home.weather, now), shelter: normalizeShelter(home.shelter, home.cats), ...normalizeProgression(home, home.cats) }
  }
  if (version === 2) {
    const { upgrades, maxCats: _old, ...v2 } = saved as V2Home & { maxCats?: number }
    const nextId = Math.max(0, ...v2.cats.map(c => Number(c.id.slice(1)) || 0)) + 1
    return { ...base, ...v2, cats: v2.cats.map(normalizeCat), version: 3, ...furnitureFromUpgrades(upgrades), nextId,
      weather: normalizeWeather(v2.weather, now), shelter: normalizeShelter(v2.shelter, v2.cats) }
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

// Falls back to the first cat at home; all-away households retain a read-only display cat.
export const activeCat = (home: Home): Cat => {
  const here = catsAtHome(home)
  return here.find(c => c.id === home.activeId) ?? here[0] ?? home.cats[0]!
}
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
export const coinRate = (home: Home) => catsAtHome(home).reduce((sum, cat) => sum + catRate(home, cat), 0)
export const idleRate = (home: Home) => coinRate(home) * IDLE_SHARE
export const toolPay = (home: Home) => coinRate(home) * TOOL_MINUTES
// A tool call pays toolPay with probability TOOL_CHANCE, else nothing.
export const rollToolPay = (home: Home, rng: Rng) => (rng() < TOOL_CHANCE ? toolPay(home) : 0)
// Active minutes a reply counts for: its wall-clock length, capped.
export const activeMinutes = (durationMs: number) =>
  Number.isFinite(durationMs) ? Math.min(Math.max(0, durationMs) / MINUTE, ACTIVE_CAP_MINUTES) : 0
// What a reply pays for the time it ran: one active minute is one minute of the full rate.
export const activePay = (home: Home, durationMs: number) => coinRate(home) * activeMinutes(durationMs)
// Pay multiplier for a chat that has run this many active minutes.
export const rampOf = (chatMinutes: number) =>
  1 + (RAMP_MAX - 1) * Math.min(Math.max(0, chatMinutes) / RAMP_MINUTES, 1)
// What a reply's API spend (US dollars) pays; no cap.
export const spendPay = (home: Home, usd: number) =>
  coinRate(home) * Math.max(0, usd) * MINUTES_PER_USD

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
export const tick = (home: Home, now: number, rng: Rng = Math.random): Home => tickTally(home, now, rng).home

// tick, plus the coins it spent on its own (loan repayment, auto-feeder), so earnings count gross.
export const tickTally = (home: Home, now: number, rng: Rng = Math.random): { home: Home; deducted: number } => {
  const cap = MAX_AFK_MS + Math.max(...home.cats.map(c => modsOf(c).offlineHours)) * 60 * MINUTE
  const min = Math.min(Math.max(0, now - home.lastTick), cap) / MINUTE
  const here = catsAtHome(home), hereIds = new Set(here.map(c => c.id))
  const income = here.reduce((sum, cat) => sum + catRate(home, cat), 0) * IDLE_SHARE * min
  let next: Home = repayFromIncome({
    ...home,
    cats: home.cats.map(cat => hereIds.has(cat.id) ? tickCat(home, cat, min) : cat),
    coins: home.coins + income,
    lastTick: now,
    frame: home.frame + 1,
  }, income)
  let deducted = home.loan - next.loan
  const deco = homeMods(home)
  const ticked = new Map(next.cats.map(c => [c.id, c]))
  for (const cat of home.cats) {
    const woke = cat.isAsleep && !ticked.get(cat.id)?.isAsleep
    if (woke) next.log = `${cat.name} wakes up fully rested.`
  }
  if (deco.autoFeed) {
    for (const cat of next.cats.filter(c => hereIds.has(c.id))) {
      if (cat.hunger < 40 && next.coins >= 5) {
        deducted += 5
        next = withCat({ ...next, coins: next.coins - 5, effect: fx('fish', now),
          log: `The auto-feeder served ${cat.name} a fish.` }, cat.id, c => ({ ...c, hunger: clamp(c.hunger + 30) }))
      }
    }
  }
  const finder = here.length ? pick(rng, here) : null
  const events = finder ? Math.floor(min * EVENTS_PER_MIN * modsOf(finder).eventRate * deco.eventRate + rng()) : 0
  if (events > 0 && finder) {
    const gift = Math.round(5 * finder.level * events * modsOf(finder).gift * deco.gift)
    next = { ...next, coins: next.coins + gift, effect: fx('coins', now),
      log: `${finder.name} ${pick(rng, AFK_EVENTS)}! +${gift}c` }
  }
  const date = new Date(now)
  const found = findCritters(home, min, date.getMonth() + 1, date.getHours(), rng, here.map(c => modsOf(c).eventRate))
  if (found.length > 0) {
    const names = found.map(id => critter(id)?.name ?? id)
    const who = pick(rng, here).name
    next = track({ ...addToPocket(next, found), effect: fx('catch', now),
      log: found.length === 1 ? `${who} brought home a ${names[0]}!` : `The cats brought home ${found.length} critters!` },
    'catch', found.length, now)
  }
  return { home: celebrate(spoil(stepVisitors(next, now, min, rng), now), now), deducted }
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

// Feed, play, pet or nap the active cat; each one counts toward today's Paw Miles.
export const act = (home: Home, action: Action, now: number): Home => {
  if (!catsAtHome(home).length) return { ...home, log: 'All cats are away on expeditions.' }
  const done = care(home, action, now)
  // Only a successful action sets a new effect.
  return action !== 'nap' && done.effect !== home.effect ? track(done, action as Counter, 1, now) : done
}

const care = (home: Home, action: Action, now: number): Home => {
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
      log: `${cat.name} munches a fish. Nom. +2xp` }, cat.id, c => befriend({ ...c, hunger: clamp(c.hunger + 30) }, 1, now))
    return gainXp(fed, cat.id, 2, now)
  }
  if (action === 'play') {
    if (cat.energy < 10) return { ...home, log: `${cat.name} is too tired to play.` }
    const played = withCat({ ...home, effect: fx('yarn', now), log: `${cat.name} chases the yarn ball! +5xp` }, cat.id,
      c => befriend({ ...c, energy: clamp(c.energy - 10), joy: clamp(c.joy + 25 * m.playJoy), hunger: clamp(c.hunger - 5) }, 2, now))
    return gainXp(played, cat.id, 5, now)
  }
  const petted = withCat({ ...home, effect: fx('hearts', now), log: `${cat.name} purrs. +1xp` }, cat.id,
    c => befriend({ ...c, joy: clamp(c.joy + 5 * m.petJoy) }, 2, now))
  return gainXp(petted, cat.id, 1, now)
}

// Takes in a new cat with random genes, if the house has room and the fee is paid.
export const adopt = (home: Home, now: number, rng: Rng = Math.random, name?: string): Home => {
  if (home.cats.length >= maxCats(home)) return { ...home, log: `The house is full (${maxCats(home)} cats).` }
  const price = adoptPrice(home)
  if (home.coins < price) return { ...home, log: `Adoption costs ${price}c.` }
  const taken = new Set(home.cats.map(c => c.name))
  const free = NAMES.filter(n => !taken.has(n))
  const genes = { ...rollGenes(rng, now), ...(home.shinyCharm ? { isShiny: true } : {}) }
  const cat = newCat(`c${home.nextId}`, name?.slice(0, 20) || pick(rng, free.length ? free : NAMES), genes, now)
  return { ...home, coins: home.coins - price, cats: [...home.cats, cat], activeId: cat.id, nextId: home.nextId + 1,
    shinyCharm: false, shelter: { pulls: home.shelter.pulls + 1, last: { catId: cat.id, at: now, cost: price } },
    effect: fx('adopt', now), log: `Welcome home, ${cat.name}! ${RARITIES[rarityOf(genes)].label} ${genes.coat}.${genes.isShiny ? ' ✨ A shiny cat!' : ''}` }
}

// A stray in the yard moves in for free (if there's room) and keeps its gift for later.
export const adoptVisitor = (home: Home, visitorId: string, now: number): Home => {
  const visitor = home.visitors.find(v => v.id === visitorId)
  if (!visitor) return { ...home, log: 'That stray already wandered off.' }
  if (home.cats.length >= maxCats(home)) return { ...home, log: `The house is full (${maxCats(home)} cats).` }
  const cat = newCat(`c${home.nextId}`, visitor.name, visitor.genes, now)
  return { ...home, cats: [...home.cats, cat], activeId: cat.id, nextId: home.nextId + 1,
    visitors: home.visitors.filter(v => v.id !== visitorId), coins: home.coins + visitor.gift,
    shelter: { ...home.shelter, last: { catId: cat.id, at: now, cost: 0 } },
    effect: fx('adopt', now), log: `${visitor.name} decided to stay! (+${visitor.gift}c gift)` }
}

export const switchTo = (home: Home, nameOrId: string): Home => {
  const key = nameOrId.toLowerCase()
  const cat = home.cats.find(c => c.id === nameOrId || c.name.toLowerCase() === key)
  if (cat && isAway(home, cat.id)) return { ...home, log: `${cat.name} is away on an expedition.` }
  return cat ? { ...home, activeId: cat.id, log: `${cat.name} is front and centre.` }
    : { ...home, log: `No cat named ${nameOrId}.` }
}

// Cycles the active cat through the household in adoption order.
export const nextCat = (home: Home): Home => {
  const here = catsAtHome(home)
  if (!here.length) return { ...home, log: 'All cats are away on expeditions.' }
  if (here.length !== home.cats.length) return switchTo(home, here[(here.findIndex(c => c.id === activeCat(home).id) + 1) % here.length]!.id)
  if (home.cats.length < 2) return { ...home, log: `${activeCat(home).name} is the only cat here. Adopt (a) a friend!` }
  const at = home.cats.findIndex(c => c.id === home.activeId)
  return switchTo(home, home.cats[(at + 1) % home.cats.length]!.id)
}

export const rename = (home: Home, name: string): Home => {
  const cat = activeCat(home)
  const clean = name.slice(0, 20)
  return withCat({ ...home, log: `${cat.name} is now ${clean}!` }, cat.id, c => ({ ...c, name: clean }))
}

// Spends one of the active cat's skill points.
export const learnSkill = (home: Home, id: string): Home => {
  if (!catsAtHome(home).length) return { ...home, log: 'All cats are away on expeditions.' }
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

// One gift a day per cat, bought on the spot; favorites count much more.
export const giveGift = (home: Home, giftId: string, now: number): Home => {
  if (!catsAtHome(home).length) return { ...home, log: 'All cats are away on expeditions.' }
  const gift = giftById(giftId)
  const cat = activeCat(home)
  if (!gift) return { ...home, log: 'No such gift.' }
  if (home.coins < gift.price) return { ...home, log: `A ${gift.name} costs ${gift.price}c.` }
  const result = receiveGift(cat, gift, now)
  if ('reason' in result) return { ...home, log: result.reason }
  const before = levelName(cat.friendship)
  const after = levelName(result.cat.friendship)
  const loved = gift.loves === cat.genes.personality ? ' It was their favorite!' : ''
  const up = after !== before ? ` You are now: ${after}.` : ''
  return track(withCat({ ...home, coins: home.coins - gift.price, effect: fx('gift', now),
    log: `${cat.name} got a ${gift.name} (+${result.points}).${loved}${up}` }, cat.id, () => result.cat), 'gift', 1, now)
}

export const buyItem = (home: Home, id: string, now: number, hour: number): Home => {
  const next = buyFurniture(home, id, now, hour)
  return next.owned.length > home.owned.length ? track(next, 'buy', 1, now) : next
}

export const donateCritter = (home: Home, id: string, now: number): Home => {
  const next = donate(home, id)
  return next.museum.length > home.museum.length ? track(next, 'donate', 1, now) : next
}

// Coming back after a while: the cats greet you and report what happened.
export const WELCOME_AFTER_MS = 30 * MINUTE
export const welcomeBack = (before: Home, after: Home, now: number): Home => {
  const away = now - before.lastTick
  if (away < WELCOME_AFTER_MS) return after
  const hours = Math.round((away / 3_600_000) * 10) / 10
  const earned = Math.floor(after.coins - before.coins)
  const strays = after.nextId - before.nextId
  const parts = [`+${earned}c`, strays > 0 ? `${strays} stray${strays > 1 ? 's' : ''} came by` : '']
  return { ...after, effect: fx('welcome', now),
    log: `Welcome back! You were away ${hours}h: ${parts.filter(Boolean).join(', ')}.` }
}

// Claude's work tips the household; xp goes to the active cat.
export const reward = (home: Home, coins: number, xp = 0, now = home.lastTick, catId?: string): Home => {
  const paid = { ...home, coins: home.coins + coins }
  const target = catId ?? (catsAtHome(home).length ? activeCat(home).id : undefined)
  return xp > 0 && target ? gainXp(paid, target, xp, now) : paid
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
