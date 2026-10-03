import type { Home } from '../types'
import { FURNITURE, SHOP } from './content'
import type { Cost } from './content/types'
import { isUnlocked, unlockHint } from './content/types'
import { track } from './collection'
import { place } from './home'
import { catsAtHome } from './away'
import type { LearnCheck } from './skills'

export const costText = (c: Cost) => [c.coins ? `${c.coins}c` : '', c.miles ? `${c.miles} miles` : '', ...Object.entries(c.materials ?? {}).map(([id, n]) => `${n} ${id}`)].filter(Boolean).join(' + ') || 'free'
export const canPay = (h: Home, cost: Cost): boolean => h.coins >= (cost.coins ?? 0) && h.miles.total >= (cost.miles ?? 0) && Object.entries(cost.materials ?? {}).every(([id, n]) => (h.materials[id] ?? 0) >= n)
export const payCost = (h: Home, cost: Cost): Home => ({ ...h, coins: h.coins - (cost.coins ?? 0), miles: { ...h.miles, total: h.miles.total - (cost.miles ?? 0) }, materials: Object.fromEntries(Object.entries(h.materials).map(([id, n]) => [id, n - (cost.materials?.[id] ?? 0)])) })
export const canCraft = (h: Home, id: string): LearnCheck => {
  const s = SHOP.find(i => i.id === id && i.shop === 'curio')
  if (!s) return { ok: false, reason: 'Pip has never heard of that.' }
  if (!isUnlocked(h, s.unlock)) return { ok: false, reason: `Needs ${unlockHint(s.unlock)}.` }
  if (['furniture', 'map', 'charm'].includes(s.kind) && h.owned.includes(s.grants)) return { ok: false, reason: 'Already owned.' }
  const f = s.kind === 'furniture' ? FURNITURE.find(f => f.id === s.grants) : undefined
  if (f && h.tier < (f.minTier ?? 0)) return { ok: false, reason: `Needs house tier ${f.minTier}.` }
  if (!canPay(h, s.cost)) return { ok: false, reason: `Costs ${costText(s.cost)}.` }
  return { ok: true }
}
export const craft = (h: Home, id: string, now: number): Home => {
  const check = canCraft(h, id)
  if (!check.ok) return { ...h, log: check.reason }
  const item = SHOP.find(i => i.id === id)!, paid = payCost(h, item.cost)
  let next = ['gear', 'consumable'].includes(item.kind) ? { ...paid, gear: { ...paid.gear, [item.grants]: (paid.gear[item.grants] ?? 0) + 1 } } : { ...paid, owned: [...paid.owned, item.grants] }
  if (item.kind === 'furniture') next = place(next, item.grants)
  return track({ ...next, log: `Pip crafted ${item.name}!`, effect: { kind: 'shop', at: now } }, 'craft', 1, now)
}
export const drinkTea = (h: Home, catId: string): Home => {
  if (!(h.gear['catnip-tea'] ?? 0) || !catsAtHome(h).some(c => c.id === catId)) return { ...h, log: 'Tea needs a cat at home and a cup in your bag.' }
  return { ...h, gear: { ...h.gear, 'catnip-tea': h.gear['catnip-tea']! - 1 }, cats: h.cats.map(c => c.id === catId ? { ...c, energy: 100 } : c), log: 'Catnip tea restored all energy.' }
}
