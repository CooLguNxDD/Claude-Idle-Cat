import type { Home } from '../types'
import { EXPEDITIONS, SHOP } from './content'
import type { Expedition } from './content/types'
import { isUnlocked, unlockHint } from './content/types'
import { isContentAvailable } from './content/availability'
import { coinRate, reward } from './game'
import { homeMods } from './home'
import { skillTotals } from './skills'
import type { LearnCheck } from './skills'
import { seeded, weighted } from './rng'
import { availableNow, addToPocket } from './critters'
import { addBond } from './pair'
import { track } from './collection'
import { materialBoost } from './events'
import { isAway } from './away'
export { isAway } from './away'

export type Loot = { coins: number; materials: Record<string, number>; critters: string[]; item?: string }
// Loot and bonuses are frozen at departure; claims never reroll or reread balance data.
export type ExpeditionRun = Home['expeditions']['runs'][number]
export const slotsOf = (h: Home): number => Math.min(4, 1 + [1, 2, 5].filter(t => h.tier >= t).length + (h.owned.includes('expedition-permit') ? 1 : 0))
export const partyLimit = (h: Home, e: Expedition, ids: readonly string[]) => Math.min(4, e.party[1] + Math.max(0, ...h.cats.filter(c => ids.includes(c.id)).map(c => skillTotals(c).party)))
export const canSend = (h: Home, expId: string, catIds: string[], now: number): LearnCheck => {
  const e = EXPEDITIONS.find(e => e.id === expId)
  if (!e) return { ok: false, reason: 'Unknown expedition.' }
  if (!Number.isFinite(now) || !isContentAvailable(e.available, now)) return { ok: false, reason: 'Out of season.' }
  if (!isUnlocked(h, e.unlock)) return { ok: false, reason: `Needs ${unlockHint(e.unlock)}.` }
  if (h.expeditions.runs.length >= slotsOf(h)) return { ok: false, reason: 'All expedition slots are full. Claim returning parties.' }
  if (new Set(catIds).size !== catIds.length || catIds.length < e.party[0] || catIds.length > partyLimit(h, e, catIds)) return { ok: false, reason: 'Invalid party size.' }
  if (catIds.some(id => !h.cats.some(c => c.id === id && c.level >= e.minLevel && c.energy >= e.cost.energy && !c.isAsleep) || isAway(h, id))) return { ok: false, reason: `Party needs awake cats at home, level ${e.minLevel} and ${e.cost.energy} energy each.` }
  if (h.coins < e.cost.coins) return { ok: false, reason: `Costs ${e.cost.coins}c.` }
  return { ok: true }
}
const rollLoot = (h: Home, e: Expedition, ids: string[], gearIds: string[], now: number, seed: number): Loot => {
  const rng = seeded(seed), cats = h.cats.filter(c => ids.includes(c.id)), gear = SHOP.filter(s => gearIds.includes(s.id))
  const bonus = cats.reduce((n, c) => n + (e.likes?.[c.genes.personality] ?? 1), 0) / cats.length
  const rate = Math.max(1, coinRate(h)), lootMod = gear.reduce((n, g) => n * (g.mods?.loot ?? 1), 1)
  const coins = Math.min(Math.floor(rate * 240), Math.floor((e.loot.coins[0] + rng() * (e.loot.coins[1] - e.loot.coins[0] + 1)) * rate * bonus * lootMod))
  const materials: Record<string, number> = {}, critters: string[] = []
  const date = new Date(now), pool = availableNow(date.getMonth() + 1, date.getHours()).filter(c => !e.loot.critterKinds || e.loot.critterKinds.includes(c.kind))
  const weights = Object.fromEntries(pool.map(c => [c.id, c.weight]))
  for (const c of cats) {
    const skills = skillTotals(c), extra = gear.reduce((n, g) => n + (g.mods?.matRolls ?? 0), 0)
    const rolls = Math.min(12, e.loot.rolls[0] + Math.floor(rng() * (e.loot.rolls[1] - e.loot.rolls[0] + 1)) + skills.matRolls + extra)
    const materialWeights = { ...e.loot.materials }
    if (materialWeights.stardust) materialWeights.stardust *= 1 + skills.stardust
    for (let n = 0; n < rolls; n++) {
      const id = weighted(rng, materialWeights)
      const multiplier = Math.min(2, bonus * materialBoost(now) * homeMods(h).matOdds)
      const qty = Math.floor(multiplier) + (rng() < multiplier % 1 ? 1 : 0)
      materials[id] = (materials[id] ?? 0) + qty
    }
    if (pool.length && rng() < Math.min(1, e.loot.critters * bonus)) critters.push(weighted(rng, weights))
  }
  const odds = Math.min(0.25, (e.loot.rare?.odds ?? 0) + Math.max(...cats.map(c => skillTotals(c).rareOdds)) + gear.reduce((n, g) => n + (g.mods?.rareOdds ?? 0), 0))
  const item = e.loot.rare && rng() < odds ? e.loot.rare.item : undefined
  return { coins, materials, critters, ...(item ? { item } : {}) }
}
export const send = (h: Home, expId: string, catIds: string[], gearIds: string[], now: number, seed: number): Home => {
  const check = canSend(h, expId, catIds, now)
  if (!check.ok) return { ...h, log: check.reason }
  if (!Number.isInteger(seed) || new Set(gearIds).size !== gearIds.length || gearIds.length > 3 || gearIds.some(id => !SHOP.some(g => g.id === id && g.kind === 'gear') || !(h.gear[id] ?? 0))) return { ...h, log: 'Invalid expedition gear or seed.' }
  const e = EXPEDITIONS.find(e => e.id === expId)!, cats = h.cats.filter(c => catIds.includes(c.id))
  const gear = { ...h.gear }
  for (const id of gearIds) gear[id]!--
  const timeGear = gearIds.reduce((m, id) => m * (SHOP.find(g => g.id === id)?.mods?.expTime ?? 1), 1)
  const skills = Math.min(...cats.map(c => skillTotals(c).expTime))
  const minutes = Math.max(10, Math.min(720, e.minutes * Math.max(0.5, skills * homeMods(h).expTime * timeGear)))
  const run: ExpeditionRun = { id: `exp-${h.nextId}`, exp: e.id, cats: [...catIds], gear: [...gearIds], startAt: now, endsAt: now + minutes * 60000, seed, loot: rollLoot(h, e, catIds, gearIds, now, seed), xp: e.xp, bond: e.bond, offlineSpeed: Math.max(...cats.map(c => skillTotals(c).expOffline)), offlineAppliedAt: now }
  const remaining = h.cats.filter(c => !catIds.includes(c.id) && !isAway(h, c.id))
  return { ...h, nextId: h.nextId + 1, coins: h.coins - e.cost.coins, gear, cats: h.cats.map(c => catIds.includes(c.id) ? { ...c, energy: c.energy - e.cost.energy } : c),
    activeId: catIds.includes(h.activeId) ? remaining[0]?.id ?? h.activeId : h.activeId,
    expeditions: { ...h.expeditions, runs: [...h.expeditions.runs, run] }, log: `Party departed for ${e.label}!` }
}
export const lootOf = (run: ExpeditionRun, _home?: Home): Loot => ({ ...run.loot, materials: { ...run.loot.materials }, critters: [...run.loot.critters] })
export const readyRuns = (h: Home, now: number) => h.expeditions.runs.filter(r => r.endsAt <= now)
export const finishExpeditions = (h: Home, now: number): Home => {
  const fresh = readyRuns(h, now).filter(r => !h.expeditions.inbox.includes(r.id)).map(r => r.id)
  return fresh.length ? { ...h, expeditions: { ...h.expeditions, inbox: [...h.expeditions.inbox, ...fresh] } } : h
}
export const claim = (h: Home, id: string, now: number): Home => {
  const run = h.expeditions.runs.find(r => r.id === id && r.endsAt <= now)
  if (!run) return h
  const loot = lootOf(run), materials = { ...h.materials }, done = { ...h.expeditions.done, [run.exp]: (h.expeditions.done[run.exp] ?? 0) + 1 }
  for (const [id, qty] of Object.entries(loot.materials)) {
    materials[id] = (materials[id] ?? 0) + qty
    done[`material:${id}`] = (done[`material:${id}`] ?? 0) + qty
  }
  let next: Home = { ...addToPocket(h, loot.critters), coins: h.coins + loot.coins, materials,
    owned: loot.item && !h.owned.includes(loot.item) ? [...h.owned, loot.item] : h.owned,
    expeditions: { runs: h.expeditions.runs.filter(r => r.id !== id), done, inbox: h.expeditions.inbox.filter(r => r !== id) } }
  for (const catId of run.cats) next = reward(next, 0, run.xp, now, catId)
  for (let a = 0; a < run.cats.length; a++) for (let b = a + 1; b < run.cats.length; b++) next = addBond(next, run.cats[a]!, run.cats[b]!, run.bond, now)
  return track({ ...next, log: `Returned: +${loot.coins}c, ${Object.entries(loot.materials).map(([id, n]) => `${n} ${id}`).join(', ')}!`, effect: { kind: 'gift', at: now } }, 'expedition', 1, now, loot.materials)
}

// Called once on session load before tick advances lastTick; normal online frames use endsAt.
export const resumeExpeditions = (h: Home, now: number): Home => ({ ...h, expeditions: { ...h.expeditions,
  runs: h.expeditions.runs.map(r => {
    const from = Math.max(h.lastTick, r.startAt, r.offlineAppliedAt ?? r.startAt)
    const elapsed = Math.max(0, Math.min(now, r.endsAt) - from)
    return { ...r, endsAt: Math.max(r.startAt + 600000, r.endsAt - elapsed * ((r.offlineSpeed ?? 1) - 1)), offlineAppliedAt: Math.max(from, now) }
  }),
} })
