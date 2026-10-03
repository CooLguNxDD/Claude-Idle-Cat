import type { Cat, Home } from '../types'
import { INTERACTIONS } from './content'
import type { Interaction } from './content/types'
import { catsAtHome } from './away'
import { friendLevel } from './friends'
import { moodOf } from './game'
import { homeMods } from './home'
import { skillTotals } from './skills'
import { localDay } from './time'
import type { Rng } from './rng'
import { forceMove, FPS, startMotion } from './motion'
import type { Motion, MotionCtx } from './motion'

export const DAILY_BOND_CAP = 10
export const bondKey = (a: string, b: string) => [a, b].sort().join('|')
export const bondLevel = (h: Home, a: string, b: string) => friendLevel(h.bonds[bondKey(a, b)]?.points ?? 0)
export const partnerOf = (home: Home, lead: string, rng: Rng): Cat | null => {
  const pool = catsAtHome(home).filter(c => c.id !== lead)
  return pool[Math.floor(rng() * pool.length)] ?? null
}
export const pickInteraction = (home: Home, lead: Cat, partner: Cat, rng: Rng): Interaction | null => {
  if (!catsAtHome(home).some(c => c.id === lead.id) || !catsAtHome(home).some(c => c.id === partner.id) || lead.id === partner.id) return null
  const points = home.bonds[bondKey(lead.id, partner.id)]?.points ?? 0
  const pool = INTERACTIONS.filter(i => points >= i.when.minBond && (!i.when.moods || [lead, partner].every(c => i.when.moods!.includes(moodOf(c)))) && (!i.when.pair || [lead, partner].every(c => i.when.pair!.includes(c.genes.personality))))
  let roll = rng() * pool.reduce((sum, i) => sum + i.when.weight, 0)
  for (const i of pool) if ((roll -= i.when.weight) < 0) return i
  return null
}
export const addBond = (home: Home, a: string, b: string, n: number, now: number): Home => {
  if (!Number.isFinite(n) || n <= 0) return home
  if (a === b || !home.cats.some(c => c.id === a) || !home.cats.some(c => c.id === b)) return home
  const key = bondKey(a, b), day = localDay(now)
  const old = home.bonds[key] ?? { points: 0, day, today: 0 }
  const today = old.day === day ? old.today : 0
  const cats = home.cats.filter(c => c.id === a || c.id === b)
  const bonus = Math.max(...cats.map(c => skillTotals(c).bond)) * homeMods(home).bond * (home.owned.includes('bond-bell') ? 1.25 : 1)
  const gained = Math.max(0, Math.min(DAILY_BOND_CAP - today, Math.floor(n * bonus)))
  return { ...home, bonds: { ...home.bonds, [key]: { points: old.points + gained, day, today: today + gained } } }
}
export type PairRun = { id: string; leadId: string; partnerId: string; lead: Motion; partner: Motion; left: number; elapsed: number }
export const startPair = (i: Interaction, leadId: string, partnerId: string, motion: Motion, ctx: MotionCtx, rng: Rng): PairRun => ({
  id: i.id, leadId, partnerId, lead: forceMove(motion, i.roles.lead, ctx, rng, i.seconds),
  partner: forceMove(startMotion(Math.max(ctx.minX, Math.min(ctx.maxX, motion.x + 100))), i.roles.partner, ctx, rng, i.seconds),
  left: Math.round(i.seconds * FPS), elapsed: 0,
})
export const stepPair = (run: PairRun, ctx: MotionCtx): PairRun => {
  const i = INTERACTIONS.find(i => i.id === run.id)!
  const elapsed = run.elapsed + 1
  const gap = { touch: 42, face: 64, chase: 80, pile: 28 }[i.spacing]
  const center = Math.max(ctx.minX, Math.min(ctx.maxX - gap, run.lead.x))
  const lx = i.spacing === 'chase' ? Math.max(ctx.minX, Math.min(ctx.maxX - gap, center + Math.sin(elapsed / 12) * 2)) : center
  const px = Math.max(ctx.minX, Math.min(ctx.maxX, lx + gap))
  const toward = (m: Motion, target: number, facing: 1 | -1): Motion => ({ ...m, x: m.x + Math.sign(target - m.x) * Math.min(4, Math.abs(target - m.x)), facing, frame: m.frame + 1 })
  return { ...run, lead: toward(run.lead, lx, 1), partner: toward(run.partner, px, i.spacing === 'chase' ? 1 : -1), left: run.left - 1, elapsed }
}
