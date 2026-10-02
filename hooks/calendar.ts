import type { Cat, Home } from '../types'
import { seeded } from './rng'
import { localDay } from './time'

const DAY = 86_400_000
export type Season = 'winter' | 'spring' | 'summer' | 'autumn'

export const seasonOf = (month: number): Season =>
  month === 12 || month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn'

// Extra decor for special months on top of the season.
export const festivalOf = (month: number) => (month === 10 ? 'pumpkins' : month === 12 ? 'lights' : null)

// A cat's birthday is the yearly anniversary of the day it joined.
export const isBirthday = (cat: Cat, now: number) => {
  const born = new Date(cat.bornAt)
  const today = new Date(now)
  return now - cat.bornAt > 300 * DAY && born.getMonth() === today.getMonth() && born.getDate() === today.getDate()
}

export const BIRTHDAY_GIFT = 100
export const celebrate = (home: Home, now: number): Home => {
  const year = new Date(now).getFullYear()
  const due = home.cats.filter(c => isBirthday(c, now) && !home.celebrated.includes(`${c.id}:${year}`))
  if (due.length === 0) return home
  const names = due.map(c => c.name).join(' and ')
  return { ...home, celebrated: [...home.celebrated, ...due.map(c => `${c.id}:${year}`)],
    coins: home.coins + BIRTHDAY_GIFT * due.length, effect: { kind: 'birthday', at: now },
    log: `Happy birthday, ${names}! 🎂 +${BIRTHDAY_GIFT * due.length}c` }
}

// Catnip market: Daisy Meow sells on Sunday mornings, Nyan buys Mon–Sat, and it spoils after Saturday.
export const weekOf = (now: number) => Math.floor((localDay(now) + 4) / 7)
const weekday = (now: number) => new Date(now).getDay()
export const DAISY_FROM = 5
export const DAISY_UNTIL = 12

type Pattern = 'random' | 'falling' | 'spike' | 'bump'
const patternOf = (week: number): Pattern => (['random', 'falling', 'spike', 'bump'] as const)[Math.floor(seeded(week * 97)() * 4)] ?? 'random'

export const buyPrice = (now: number) => 90 + Math.floor(seeded(weekOf(now) * 53)() * 21)

// Nyan's offer for one bundle, per half-day slot (Mon AM = 0 … Sat PM = 11).
export const sellPrice = (now: number, hour: number) => {
  const week = weekOf(now)
  const slot = (weekday(now) - 1) * 2 + (hour < 12 ? 0 : 1)
  const base = buyPrice(now)
  const rng = seeded(week * 131 + slot)
  const peak = 2 + Math.floor(seeded(week * 7)() * 5)
  switch (patternOf(week)) {
    case 'falling': return Math.round(base * (0.9 - slot * 0.04 - rng() * 0.03))
    case 'spike': return Math.round(base * (slot === peak ? 2 + rng() * 4 : slot === peak - 1 || slot === peak + 1 ? 1.4 : 0.8 - rng() * 0.2))
    case 'bump': return Math.round(base * (slot === peak ? 1.6 + rng() * 0.4 : 0.85 - rng() * 0.15))
    default: return Math.round(base * (0.6 + rng() * 0.8))
  }
}

export type Market = { kind: 'buy'; price: number } | { kind: 'sell'; price: number } | { kind: 'closed'; why: string }
export const marketNow = (now: number, hour: number, shopOpen: boolean): Market => {
  if (weekday(now) === 0) {
    return hour >= DAISY_FROM && hour < DAISY_UNTIL ? { kind: 'buy', price: buyPrice(now) }
      : { kind: 'closed', why: `Daisy Meow sells catnip Sundays ${DAISY_FROM}:00–${DAISY_UNTIL}:00.` }
  }
  return shopOpen ? { kind: 'sell', price: sellPrice(now, hour) } : { kind: 'closed', why: "Nyan's shop is closed." }
}

// Catnip from an earlier week has spoiled.
export const spoil = (home: Home, now: number): Home =>
  home.catnip.qty > 0 && home.catnip.week !== weekOf(now)
    ? { ...home, catnip: { week: weekOf(now), qty: 0, paid: 0 }, log: `Your ${home.catnip.qty} catnip bundles spoiled. Sell by Saturday!` }
    : home

export const buyCatnip = (home: Home, qty: number, now: number, hour: number, shopOpen: boolean): Home => {
  const market = marketNow(now, hour, shopOpen)
  if (market.kind !== 'buy') return { ...home, log: market.kind === 'closed' ? market.why : 'Daisy Meow only comes on Sundays.' }
  const cost = market.price * qty
  if (home.coins < cost) return { ...home, log: `${qty} bundles cost ${cost}c.` }
  const have = spoil(home, now).catnip
  const total = have.qty + qty
  return { ...home, coins: home.coins - cost, log: `Bought ${qty} catnip bundles at ${market.price}c.`,
    catnip: { week: weekOf(now), qty: total, paid: Math.round((have.paid * have.qty + cost) / total) } }
}

export const sellCatnip = (home: Home, now: number, hour: number, shopOpen: boolean): Home => {
  const fresh = spoil(home, now)
  if (fresh.catnip.qty === 0) return { ...fresh, log: fresh === home ? 'You have no catnip.' : fresh.log }
  const market = marketNow(now, hour, shopOpen)
  if (market.kind !== 'sell') return { ...home, log: market.kind === 'closed' ? market.why : 'Nyan does not buy catnip on Sundays.' }
  const gain = market.price * home.catnip.qty
  const profit = gain - home.catnip.paid * home.catnip.qty
  return { ...home, coins: home.coins + gain, catnip: { ...home.catnip, qty: 0, paid: 0 },
    log: `Sold ${home.catnip.qty} catnip at ${market.price}c: ${profit >= 0 ? '+' : ''}${profit}c profit.` }
}
