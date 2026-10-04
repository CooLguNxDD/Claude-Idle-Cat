import type { Home } from '../types'
import { EXPEDITIONS, FURNITURE, MATERIALS, QUESTS, SHOP } from './content'
import { CRITTERS } from './critters'
import { DAILY_BOND_CAP } from './pair'

const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const whole = (v: unknown, max = Number.MAX_SAFE_INTEGER): number => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0
const strings = (v: unknown): string[] => Array.isArray(v) ? [...new Set(v.filter((s): s is string => typeof s === 'string' && !!s.trim()))] : []
const counts = (v: unknown, ids: readonly string[], max = Number.MAX_SAFE_INTEGER) => Object.fromEntries(Object.entries(record(v)).filter(([id]) => ids.includes(id)).map(([id, n]) => [id, whole(n, max)]))
const finite = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max

// Repair untrusted progression fields without rerolling departure loot or releasing valid parties.
export const normalizeProgression = (saved: unknown, cats: Home['cats']): Pick<Home, 'materials' | 'gear' | 'bonds' | 'quests' | 'exchanges' | 'expeditions'> => {
  const h = record(saved), catIds = cats.map(c => c.id), materialIds = MATERIALS.map(m => m.id)
  const gearIds = SHOP.filter(s => s.kind === 'gear').map(s => s.id)
  const inventoryIds = SHOP.filter(s => s.kind === 'gear' || s.kind === 'consumable').map(s => s.grants)
  const ex = record(h.expeditions), runs: Home['expeditions']['runs'] = [], reserved = new Set<string>()
  for (const value of Array.isArray(ex.runs) ? ex.runs : []) {
    const r = record(value), loot = record(r.loot), ids = strings(r.cats), gear = strings(r.gear)
    if (typeof r.id !== 'string' || !r.id.trim() || runs.some(run => run.id === r.id) || runs.length >= 4 ||
      !EXPEDITIONS.some(e => e.id === r.exp) || !Array.isArray(r.cats) || ids.length !== r.cats.length || ids.length < 1 || ids.length > 4 ||
      ids.some(id => !catIds.includes(id) || reserved.has(id)) || !Array.isArray(r.gear) || gear.length !== r.gear.length || gear.length > 3 || gear.some(id => !gearIds.includes(id)) ||
      !finite(r.startAt, 0, 8.64e15) || !finite(r.endsAt, r.startAt + 600000, r.startAt + 43200000) ||
      !finite(r.seed, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER) || !Number.isInteger(r.seed) ||
      !finite(loot.coins, 0, Number.MAX_SAFE_INTEGER) || !Number.isInteger(loot.coins) || !Array.isArray(loot.critters) ||
      loot.critters.length > ids.length || loot.critters.some(id => !CRITTERS.some(c => c.id === id)) ||
      !finite(r.xp, 0, 200) || !Number.isInteger(r.xp) || !finite(r.bond, 0, 5)) continue
    const materials = counts(loot.materials, materialIds, 96)
    if (Object.values(materials).reduce((sum, n) => sum + n, 0) > 96) continue
    const item = typeof loot.item === 'string' && [...FURNITURE, ...SHOP].some(s => s.id === loot.item) ? loot.item : undefined
    runs.push({ id: r.id, exp: r.exp as string, cats: ids, gear, startAt: r.startAt, endsAt: r.endsAt, seed: r.seed,
      loot: { coins: loot.coins, materials, critters: [...loot.critters] as string[], ...(item ? { item } : {}) }, xp: r.xp, bond: r.bond,
      offlineSpeed: finite(r.offlineSpeed, 1, 1.2) ? r.offlineSpeed : 1,
      offlineAppliedAt: finite(r.offlineAppliedAt, r.startAt, 8.64e15) ? r.offlineAppliedAt : r.startAt })
    for (const id of ids) reserved.add(id)
  }
  const bonds: Home['bonds'] = {}
  for (const [key, value] of Object.entries(record(h.bonds))) {
    const ids = key.split('|'), b = record(value)
    if (ids.length === 2 && ids[0] !== ids[1] && ids.every(id => catIds.includes(id)) && [...ids].sort().join('|') === key)
      bonds[key] = { points: whole(b.points), day: whole(b.day), today: whole(b.today, DAILY_BOND_CAP) }
  }
  const q = record(h.quests), progress: Home['quests']['progress'] = {}
  for (const [id, value] of Object.entries(record(q.progress))) {
    const quest = QUESTS.find(q => q.id === id), p = record(value)
    if (!quest) continue
    const step = whole(p.step, quest.steps.length)
    progress[id] = { step, count: whole(p.count, quest.steps[step]?.goal ?? 0) }
  }
  const x = record(h.exchanges)
  return { materials: counts(h.materials, materialIds), gear: counts(h.gear, inventoryIds), bonds,
    quests: { day: whole(q.day), progress, claimed: strings(q.claimed).filter(id => QUESTS.some(q => q.id === id)) },
    exchanges: { day: whole(x.day), pairs: strings(x.pairs), visitors: strings(x.visitors) },
    expeditions: { runs, done: counts(ex.done, [...EXPEDITIONS.map(e => e.id), ...materialIds.map(id => `material:${id}`)]), inbox: strings(ex.inbox).filter(id => runs.some(r => r.id === id)) } }
}
