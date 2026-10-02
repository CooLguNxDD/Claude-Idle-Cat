import type { Home, Personality, Slot } from '../types'
import { seeded } from './rng'

export type HomeMods = { coin: number; regen: number; autoFeed: boolean; eventRate: number; joyDecay: number; gift: number }
export type Furniture = {
  id: string; name: string; slot: Slot; price: number; perk: string
  mods: Partial<HomeMods>; bait: number; likes?: Personality
  // Paw Miles-only items never appear in Nyan's stock.
  miles?: number
}

// Starter items cost nothing and are owned from day one.
export const CATALOG: readonly Furniture[] = [
  { id: 'bowl', name: 'Basic bowl', slot: 'bowl', price: 0, perk: 'a bowl', mods: {}, bait: 1 },
  { id: 'feeder', name: 'Auto-feeder', slot: 'bowl', price: 60, perk: 'feeds hungry cats', mods: { autoFeed: true }, bait: 2, likes: 'greedy' },
  { id: 'sushi', name: 'Sushi bar', slot: 'bowl', price: 320, perk: 'auto-feeds, +30% gifts', mods: { autoFeed: true, gift: 1.3 }, bait: 4, likes: 'greedy' },
  { id: 'box', name: 'Cardboard box', slot: 'bed', price: 0, perk: 'irresistible', mods: {}, bait: 2, likes: 'shy' },
  { id: 'cozy', name: 'Cozy bed', slot: 'bed', price: 80, perk: '+50% sleep regen', mods: { regen: 1.5 }, bait: 2, likes: 'lazy' },
  { id: 'heated', name: 'Heated bed', slot: 'bed', price: 260, perk: '+100% sleep regen', mods: { regen: 2 }, bait: 3, likes: 'lazy' },
  { id: 'yarn', name: 'Yarn ball', slot: 'toy', price: 0, perk: 'a classic', mods: {}, bait: 1, likes: 'playful' },
  { id: 'wand', name: 'Feather wand', slot: 'toy', price: 60, perk: '+25% coins', mods: { coin: 1.25 }, bait: 2, likes: 'playful' },
  { id: 'laser', name: 'Laser dot', slot: 'toy', price: 220, perk: '+50% coins', mods: { coin: 1.5 }, bait: 3, likes: 'playful' },
  { id: 'tree', name: 'Cat tree', slot: 'toy', price: 480, perk: '+75% coins', mods: { coin: 1.75 }, bait: 4, likes: 'curious' },
  { id: 'rug', name: 'Round rug', slot: 'rug', price: 50, perk: 'joy fades 10% slower', mods: { joyDecay: 0.9 }, bait: 1, likes: 'cuddly' },
  { id: 'quilt', name: 'Patchwork quilt', slot: 'rug', price: 180, perk: 'joy fades 25% slower', mods: { joyDecay: 0.75 }, bait: 2, likes: 'cuddly' },
  { id: 'cactus', name: 'Little cactus', slot: 'plant', price: 40, perk: 'decor', mods: {}, bait: 1, likes: 'shy' },
  { id: 'catnip', name: 'Catnip pot', slot: 'plant', price: 140, perk: 'joy fades 20% slower', mods: { joyDecay: 0.8 }, bait: 3, likes: 'cuddly' },
  { id: 'birds', name: 'Bird feeder', slot: 'hanging', price: 150, perk: '+50% AFK events', mods: { eventRate: 1.5 }, bait: 3, likes: 'curious' },
  { id: 'lantern', name: 'Paper lantern', slot: 'hanging', price: 120, perk: 'glows at night', mods: {}, bait: 2, likes: 'lazy' },
  { id: 'chime', name: 'Wind chime', slot: 'hanging', price: 90, perk: '+20% gifts', mods: { gift: 1.2 }, bait: 2, likes: 'shy' },
  { id: 'goldbowl', name: 'Golden bowl', slot: 'bowl', price: 0, miles: 800, perk: 'auto-feeds, +50% gifts', mods: { autoFeed: true, gift: 1.5 }, bait: 5, likes: 'greedy' },
  { id: 'rainbow', name: 'Rainbow rug', slot: 'rug', price: 0, miles: 1000, perk: 'joy fades 40% slower', mods: { joyDecay: 0.6 }, bait: 4, likes: 'cuddly' },
  { id: 'moonlamp', name: 'Moon lamp', slot: 'hanging', price: 0, miles: 1200, perk: 'double AFK events', mods: { eventRate: 2 }, bait: 4, likes: 'curious' },
]
const BY_ID = new Map(CATALOG.map(f => [f.id, f]))
export const furniture = (id: string | undefined) => (id ? BY_ID.get(id) : undefined)
export const STARTER = CATALOG.filter(f => f.price === 0 && !f.miles).map(f => f.id)

// House tiers, paid off through Tom Mew's interest-free loan.
export const TIERS = [
  { name: 'Cottage', maxCats: 2, slots: ['bowl', 'bed', 'toy'] as Slot[], loan: 0 },
  { name: 'House', maxCats: 3, slots: ['bowl', 'bed', 'toy', 'rug', 'plant'] as Slot[], loan: 500 },
  { name: 'Manor', maxCats: 4, slots: ['bowl', 'bed', 'toy', 'rug', 'plant', 'hanging'] as Slot[], loan: 1500 },
]
export const tierOf = (home: Home) => TIERS[Math.min(home.tier, TIERS.length - 1)] ?? TIERS[0]!
export const maxCats = (home: Home) => tierOf(home).maxCats
export const LOAN_SHARE = 0.25

export const homeMods = (home: Home): HomeMods => {
  const m: HomeMods = { coin: 1, regen: 1, autoFeed: false, eventRate: 1, joyDecay: 1, gift: 1 }
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

export const SHOP_OPEN = 8
export const SHOP_CLOSE = 22
export const isShopOpen = (hour: number) => hour >= SHOP_OPEN && hour < SHOP_CLOSE
const DAY = 86_400_000
export const STOCK_SIZE = 4

// Nyan's stock changes every day: the same day always shows the same items.
export const dailyStock = (now: number): Furniture[] => {
  const rng = seeded(Math.floor(now / DAY) * 7919 + 13)
  const pool = CATALOG.filter(f => f.price > 0)
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
  if (!tierOf(home).slots.includes(item.slot)) return { ...home, log: `The ${tierOf(home).name} has no ${item.slot} spot yet.` }
  return { ...home, decor: { ...home.decor, [item.slot]: id }, log: `Placed the ${item.name}.` }
}

// Tom Mew expands the house right away; income pays the loan back with no interest or deadline.
export const takeLoan = (home: Home): Home => {
  const next = TIERS[home.tier + 1]
  if (!next) return { ...home, log: 'Tom Mew: "This is already the finest manor in town!"' }
  if (home.loan > 0) return { ...home, log: `Tom Mew: "Pay off the ${Math.ceil(home.loan)}c first, yes yes!"` }
  return { ...home, tier: home.tier + 1, loan: next.loan,
    log: `Tom Mew built you a ${next.name}! Loan: ${next.loan}c, paid from income.` }
}

export const payLoan = (home: Home, amount: number): Home => {
  const pay = Math.min(amount, home.loan, Math.floor(home.coins))
  if (pay <= 0) return { ...home, log: home.loan > 0 ? 'Not enough coins.' : 'No loan to pay.' }
  const loan = home.loan - pay
  return { ...home, coins: home.coins - pay, loan,
    log: loan === 0 ? 'Loan paid off! Tom Mew has more ideas…' : `Paid ${pay}c. ${Math.ceil(loan)}c left.` }
}

// Takes LOAN_SHARE of fresh income toward the loan; returns the home with both updated.
export const repayFromIncome = (home: Home, income: number): Home => {
  if (home.loan <= 0 || income <= 0) return home
  const pay = Math.min(home.loan, income * LOAN_SHARE)
  return { ...home, coins: home.coins - pay, loan: home.loan - pay,
    log: home.loan - pay <= 0 ? 'Loan paid off! Tom Mew has more ideas…' : home.log }
}
