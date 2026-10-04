import type { Cost } from './content/types'
import type { ColorName } from './theme'
import { FURNITURE } from './content'
import type { Home, Personality, Slot } from '../types'
import { seeded } from './rng'
import { localDay } from './time'

export type HomeMods = { coin: number; regen: number; autoFeed: boolean; eventRate: number; joyDecay: number; gift: number; expTime: number; bond: number; matOdds: number }
export type BowlStats = { cap: number; portion: number; joy?: number; energy?: number; xp?: number }
export type Furniture = {
  id: string; name: string; slot: Slot; price: number; perk: string
  mods: Partial<HomeMods>; bait: number; likes?: Personality
  bowl?: BowlStats
  // Paw Miles-only items never appear in Nyan's stock.
  miles?: number
  // Seasonal items are stocked only in these months.
  minTier?: number
  cost?: Cost
  art?: { rows: readonly string[]; colors: Record<string, ColorName> }
  months?: number[]
}

// Starter items cost nothing and are owned from day one.
export const CATALOG = FURNITURE
const BY_ID = new Map(CATALOG.map(f => [f.id, f]))
export const furniture = (id: string | undefined) => (id ? BY_ID.get(id) : undefined)
export const STARTER = CATALOG.filter(f => f.price === 0 && !f.miles && !f.cost).map(f => f.id)

// House tiers, paid off through Tom Mew's interest-free loan. There is no top tier.
export type Tier = { name: string; maxCats: number; slots: Slot[]; loan: number }
const SLOTS: Slot[] = ['bowl', 'bed', 'toy', 'rug', 'plant', 'hanging']
const NAMES = ['Cottage', 'House', 'Manor', 'Villa', 'Mansion', 'Castle', 'Palace']
export const BASE_LOAN = 400
// Each new house costs twice the last; clamped so huge tiers stay exact integers.
export const loanFor = (n: number) => (n <= 0 ? 0 : Math.min(BASE_LOAN * 2 ** (n - 1), Number.MAX_SAFE_INTEGER))
const tierName = (n: number) => NAMES[n] ?? `${NAMES[NAMES.length - 1]} ${n - NAMES.length + 2}`
export const tierAt = (n: number): Tier => {
  const i = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  return { name: tierName(i), maxCats: 2 + i, slots: SLOTS.slice(0, [3, 5][i] ?? SLOTS.length), loan: loanFor(i) }
}
export const tierOf = (home: Home) => tierAt(home.tier)
export const maxCats = (home: Home) => tierOf(home).maxCats
export const LOAN_SHARE = 0.25

export const homeMods = (home: Home): HomeMods => {
  const m: HomeMods = { coin: 1, regen: 1, autoFeed: false, eventRate: 1, joyDecay: 1, gift: 1, expTime: 1, bond: 1, matOdds: 1 }
  for (const slot of tierOf(home).slots) {
    const item = furniture(home.decor[slot])
    if (!item) continue
    const { autoFeed, ...rest } = item.mods
    if (autoFeed) m.autoFeed = true
    for (const [key, value] of Object.entries(rest) as [Exclude<keyof HomeMods, 'autoFeed'>, number][]) m[key] *= value
  }
  return m
}

// Visitor pull of the placed decor, and the personalities it attracts.
export const baitOf = (home: Home) => {
  const likes: Partial<Record<Personality, number>> = {}
  let total = 0
  for (const slot of tierOf(home).slots) {
    const item = furniture(home.decor[slot])
    if (!item) continue
    total += item.bait
    if (item.likes) likes[item.likes] = (likes[item.likes] ?? 0) + item.bait
  }
  return { total, likes }
}

const SUFFIXES = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi']
// Short coin label: 1600c, then 12.8kc, 3.4Mc …; past the suffixes, scientific.
export const fmtCoins = (n: number) => {
  if (!Number.isFinite(n)) return '∞c'
  const v = Math.floor(n)
  if (Math.abs(v) < 10_000) return `${v}c`
  const e = Math.min(Math.floor(Math.log10(Math.abs(v)) / 3), SUFFIXES.length)
  if (e >= SUFFIXES.length) return `${v.toExponential(2)}c`
  return `${(v / 1000 ** e).toFixed(1).replace(/\.0$/, '')}${SUFFIXES[e]}c`
}

export const SHOP_OPEN = 8
export const SHOP_CLOSE = 22
export const isShopOpen = (hour: number) => hour >= SHOP_OPEN && hour < SHOP_CLOSE
const DAY = 86_400_000
export const STOCK_SIZE = 4

// Nyan's stock changes every day: the same day always shows the same items.
export const dailyStock = (now: number): Furniture[] => {
  const rng = seeded(localDay(now) * 7919 + 13)
  const month = new Date(now).getMonth() + 1
  const pool = CATALOG.filter(f => f.price > 0 && !f.cost && !f.minTier && (!f.months || f.months.includes(month)))
  const picked: Furniture[] = []
  while (picked.length < STOCK_SIZE && picked.length < pool.length) {
    const item = pool[Math.floor(rng() * pool.length)]
    if (item && !picked.includes(item)) picked.push(item)
  }
  return picked
}

const fx = (at: number) => ({ kind: 'shop' as const, at })

export const buyFurniture = (home: Home, id: string, now: number, hour: number): Home => {
  const item = furniture(id)
  if (!item) return { ...home, log: 'Nyan has never heard of that.' }
  if (!isShopOpen(hour)) return { ...home, log: `Nyan's shop is closed. It opens at ${SHOP_OPEN}:00.` }
  if (!dailyStock(now).includes(item)) return { ...home, log: `${item.name} isn't in stock today.` }
  if (home.owned.includes(id)) return { ...home, log: `You already own a ${item.name}.` }
  if (home.coins < item.price) return { ...home, log: `${item.name} costs ${item.price}c.` }
  const bought = { ...home, coins: home.coins - item.price, owned: [...home.owned, id], effect: fx(now),
    log: `Bought a ${item.name}!` }
  return tierOf(home).slots.includes(item.slot) ? place(bought, id) : { ...bought,
    log: `Bought a ${item.name}. Expand the house to make room for it.` }
}

export const place = (home: Home, id: string): Home => {
  const item = furniture(id)
  if (!item || !home.owned.includes(id)) return { ...home, log: "You don't own that." }
  if (home.tier < (item.minTier ?? 0)) return { ...home, log: `Needs ${tierAt(item.minTier!).name}.` }
  if (!tierOf(home).slots.includes(item.slot)) return { ...home, log: `The ${tierOf(home).name} has no ${item.slot} spot yet.` }
  return { ...home, decor: { ...home.decor, [item.slot]: id }, log: `Placed the ${item.name}.` }
}

// Tom Mew expands the house right away; income pays the loan back with no interest or deadline.
export const takeLoan = (home: Home): Home => {
  if (home.loan > 0) return { ...home, log: `Tom Mew: "Pay off the ${fmtCoins(Math.ceil(home.loan))} first, yes yes!"` }
  const tier = tierOf(home)
  const next = tierAt(home.tier + 1)
  if (next.maxCats <= tier.maxCats) return { ...home, log: 'Tom Mew: "Even I can\'t build bigger than this!"' }
  return { ...home, tier: home.tier + 1, loan: next.loan,
    log: `Tom Mew built you a ${next.name}! Loan: ${fmtCoins(next.loan)}, paid from income.` }
}

export const payLoan = (home: Home, amount: number): Home => {
  const pay = Math.min(amount, home.loan, Math.floor(home.coins))
  if (pay <= 0) return { ...home, log: home.loan > 0 ? 'Not enough coins.' : 'No loan to pay.' }
  const loan = home.loan - pay
  return { ...home, coins: home.coins - pay, loan,
    log: loan === 0 ? 'Loan paid off! Tom Mew has more ideas…' : `Paid ${pay}c. ${fmtCoins(Math.ceil(loan))} left.` }
}

// Takes LOAN_SHARE of fresh income toward the loan; returns the home with both updated.
export const repayFromIncome = (home: Home, income: number): Home => {
  if (home.loan <= 0 || income <= 0) return home
  const pay = Math.min(home.loan, income * LOAN_SHARE)
  return { ...home, coins: home.coins - pay, loan: home.loan - pay,
    log: home.loan - pay <= 0 ? 'Loan paid off! Tom Mew has more ideas…' : home.log }
}
