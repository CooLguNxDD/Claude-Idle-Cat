import type { Home } from '../types'
import { QUESTS } from './content'
import type { Counter } from './collection'
import { isContentAvailable } from './content/availability'
import { seeded } from './rng'
import { localDay } from './time'

// Seeded weighted selection of two eligible quest chains per local day, without repeats.
export const questsFor = (now: number) => {
  const rng = seeded(localDay(now) * 101 + 17)
  const pool = QUESTS.filter(q => isContentAvailable(q.available, now)), out: typeof pool = []
  while (out.length < 2 && pool.length) {
    let roll = rng() * pool.reduce((s, q) => s + q.weight, 0)
    const idx = pool.findIndex(q => (roll -= q.weight) < 0)
    out.push(pool.splice(Math.max(0, idx), 1)[0]!)
  }
  return out
}
// Read today's progress or an empty state after local midnight.
export const questState = (home: Home, now: number) => home.quests.day === localDay(now) ? home.quests : { day: localDay(now), progress: {}, claimed: [] }
// Advance only each chain's current step from one tracked action or material payload.
export const advanceQuests = (home: Home, counter: Counter, n: number, now: number, materials: Record<string, number> = {}): Home => {
  const state = questState(home, now), progress = { ...state.progress }
  for (const q of questsFor(now)) {
    if (state.claimed.includes(q.id)) continue
    const p = progress[q.id] ?? { step: 0, count: 0 }, step = q.steps[p.step]
    if (!step || step.counter !== counter) continue
    const count = Math.min(step.goal, p.count + Math.max(0, step.material ? materials[step.material] ?? 0 : n))
    progress[q.id] = count >= step.goal ? { step: p.step + 1, count: 0 } : { ...p, count }
  }
  return { ...home, quests: { ...state, progress } }
}
// Pay a completed daily chain once and record its claim for today.
export const claimQuest = (home: Home, id: string, now: number): Home => {
  const q = questsFor(now).find(q => q.id === id), state = questState(home, now)
  if (!q || state.claimed.includes(id) || (state.progress[id]?.step ?? 0) < q.steps.length) return home
  const materials = { ...home.materials }
  for (const [id, n] of Object.entries(q.reward.materials ?? {})) materials[id] = (materials[id] ?? 0) + n
  return { ...home, coins: home.coins + (q.reward.coins ?? 0), miles: { ...home.miles, total: home.miles.total + (q.reward.miles ?? 0) }, materials,
    owned: q.reward.item && !home.owned.includes(q.reward.item) ? [...home.owned, q.reward.item] : home.owned,
    quests: { ...state, claimed: [...state.claimed, id] }, log: `Quest complete: ${q.label}!` }
}
