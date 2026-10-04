import type { Home } from '../types'
import { FURNITURE, SHOP } from './content'
import type { Cost, ShopItem } from './content/types'
import { isUnlocked, unlockHint } from './content/types'
import { track } from './collection'
import { place } from './home'
import { catsAtHome } from './away'
import { bowlOf } from './bowl'
type CraftCheck = { ok: true; item: ShopItem } | { ok: false; reason: string }

// Format optional coins, miles and material costs for display.
export const costText = (c: Cost) => [c.coins ? `${c.coins}c` : '', c.miles ? `${c.miles} miles` : '', ...Object.entries(c.materials ?? {}).map(([id, n]) => `${n} ${id}`)].filter(Boolean).join(' + ') || 'free'
// Check all currencies, treating missing material balances as zero.
export const canPay = (h: Home, cost: Cost): boolean => h.coins >= (cost.coins ?? 0) && h.miles.total >= (cost.miles ?? 0) && Object.entries(cost.materials ?? {}).every(([id, n]) => (h.materials[id] ?? 0) >= n)
// Failed payment is a no-op, including missing material balances.
export const payCost = (h: Home, cost: Cost): Home => !canPay(h, cost) ? h : ({ ...h, coins: h.coins - (cost.coins ?? 0), miles: { ...h.miles, total: h.miles.total - (cost.miles ?? 0) }, materials: Object.fromEntries(Object.entries(h.materials).map(([id, n]) => [id, n - (cost.materials?.[id] ?? 0)])) })
// Check the Curio listing, unlocks, ownership and all costs; return the checked item.
export const canCraft = (h: Home, id: string): CraftCheck => {
  const s = SHOP.find(i => i.id === id && i.shop === 'curio')
  if (!s) return { ok: false, reason: 'Pip has never heard of that.' }
  if (!isUnlocked(h, s.unlock)) return { ok: false, reason: `Needs ${unlockHint(s.unlock)}.` }
  if (['furniture', 'map', 'charm'].includes(s.kind) && h.owned.includes(s.grants)) return { ok: false, reason: 'Already owned.' }
  const f = s.kind === 'furniture' ? FURNITURE.find(f => f.id === s.grants) : undefined
  if (f && h.tier < (f.minTier ?? 0)) return { ok: false, reason: `Needs house tier ${f.minTier}.` }
  if (!canPay(h, s.cost)) return { ok: false, reason: `Costs ${costText(s.cost)}.` }
  return { ok: true, item: s }
}
// Pay validated costs and grant furniture, a permanent unlock or consumable inventory.
export const craft = (h: Home, id: string, now: number): Home => {
  const check = canCraft(h, id)
  if (!check.ok) return { ...h, log: check.reason }
  const item = check.item, paid = payCost(h, item.cost)
  let next = ['gear', 'consumable'].includes(item.kind) ? { ...paid, gear: { ...paid.gear, [item.grants]: (paid.gear[item.grants] ?? 0) + 1 } } : { ...paid, owned: [...paid.owned, item.grants] }
  // A crafted bowl replaces the placed one only when it holds more; a downgrade waits in storage.
  const made = item.kind === 'furniture' ? FURNITURE.find(f => f.id === item.grants) : undefined
  const isDowngrade = !!made?.bowl && !!h.decor.bowl && bowlOf(h).cap >= made.bowl.cap
  if (item.kind === 'furniture' && !isDowngrade) next = place(next, item.grants)
  return track({ ...next, log: isDowngrade ? `Pip crafted ${item.name}! Your ${bowlOf(h).name} stays out; place the new one from Home.` : `Pip crafted ${item.name}!`, effect: { kind: 'shop', at: now } }, 'craft', 1, now)
}
// Consume one tea to restore a cat at home to full energy.
export const drinkTea = (h: Home, catId: string): Home => {
  if (!(h.gear['catnip-tea'] ?? 0) || !catsAtHome(h).some(c => c.id === catId)) return { ...h, log: 'Tea needs a cat at home and a cup in your bag.' }
  return { ...h, gear: { ...h.gear, 'catnip-tea': h.gear['catnip-tea']! - 1 }, cats: h.cats.map(c => c.id === catId ? { ...c, energy: 100 } : c), log: 'Catnip tea restored all energy.' }
}
