import type { Home } from '../types'
import { EXPEDITIONS, TRAIL_EVENTS } from './content'
import type { Expedition, TrailBackdrop, TrailEvent, TrailKind } from './content/types'
import { seeded } from './rng'
import type { Rng } from './rng'

// Cosmetic: a run's story replays from its seed and wall-clock span; it only reveals the loot frozen at departure.
type Run = Home['expeditions']['runs'][number]
export type Finds = { coins: number; materials: Record<string, number>; critters: string[]; item?: string }
export type Beat = { event: TrailEvent; at: number; until: number; finds: Finds }
export type Trail = { exp?: Expedition; backdrop: TrailBackdrop; beats: Beat[]; startAt: number; endsAt: number }
export type Stage = 'approach' | 'action' | 'resolve'
export type BeatView = { beat: Beat; index: number; t: number; stage: Stage; move: string; progress: number }

const TRAIL_SALT = 0x7a11c47
/** Loop fractions: the party walks in, plays the event's moves, then the outcome shows. */
export const APPROACH = 0.3
export const RESOLVE = 0.85
const FIND_KINDS: readonly TrailKind[] = ['forage', 'treasure', 'boss', 'discover']
const FALLBACK: TrailEvent = { id: 'head-home', label: 'Head home', kind: 'return', moves: ['walk'], seconds: 6, weight: 1, line: 'Heading home!' }

const none = (): Finds => ({ coins: 0, materials: {}, critters: [] })
const pickEvent = (rng: Rng, pool: readonly TrailEvent[], last?: string) => {
  const total = pool.reduce((n, e) => n + e.weight, 0)
  for (let tries = 0; tries < 3; tries++) {
    let roll = rng() * total
    const e = pool.find(e => (roll -= e.weight) < 0) ?? pool[pool.length - 1]!
    if (e.id !== last || tries === 2) return e
  }
  return pool[0]!
}

/** The beats a run plays between departure and return, rebuilt identically on every reload. */
export const trailOf = (run: Run, events: readonly TrailEvent[] = TRAIL_EVENTS, expeditions: readonly Expedition[] = EXPEDITIONS): Trail => {
  const exp = expeditions.find(e => e.id === run.exp)
  const byId = new Map(events.map(e => [e.id, e]))
  const listed = exp?.flow?.events?.map(id => byId.get(id)).filter((e): e is TrailEvent => !!e)
  const pool = listed?.length ? listed : events.filter(e => !e.trails || e.trails.includes(run.exp))
  const back = pool.find(e => e.kind === 'return') ?? events.find(e => e.kind === 'return') ?? FALLBACK
  const middle = pool.filter(e => e.kind !== 'return' && e.kind !== 'boss' && e.weight > 0)
  const boss = exp?.flow?.boss ? byId.get(exp.flow.boss) : undefined
  const rng = seeded((run.seed ^ TRAIL_SALT) >>> 0)
  // An imported run may end at or before it starts; every beat still fits inside [startAt, endsAt].
  const endsAt = Math.max(run.startAt, run.endsAt), span = Math.max(1, endsAt - run.startAt)
  const count = Math.max(2, Math.min(9, Math.round(span / 600_000)))
  const picked: TrailEvent[] = []
  const walk = middle.find(e => e.kind === 'walk')
  if (walk) picked.push(walk)
  // Reserve one finding beat so even the shortest trail reveals loot on the way out.
  const finders = middle.filter(e => FIND_KINDS.includes(e.kind))
  if (finders.length && picked.length < count) picked.push(pickEvent(rng, finders, picked.at(-1)?.id))
  while (middle.length && picked.length < count) picked.push(pickEvent(rng, middle, picked.at(-1)?.id))
  if (boss && picked.length >= 3) picked.splice(Math.floor(picked.length * 0.8), 0, boss)
  picked.push(back)
  const shares = picked.map(e => (e.kind === 'boss' ? 1.6 : e.kind === 'return' ? 0.6 : 0.8 + 0.4 * rng()))
  const sum = shares.reduce((n, s) => n + s, 0)
  let at = run.startAt
  const beats: Beat[] = picked.map((event, i) => {
    const until = i === picked.length - 1 ? endsAt : Math.min(endsAt, at + Math.round((span * shares[i]!) / sum))
    const beat = { event, at, until, finds: none() }
    at = until
    return beat
  })
  dealLoot(beats, run.loot)
  return { ...(exp ? { exp } : {}), backdrop: exp?.flow?.backdrop ?? 'garden', beats, startAt: run.startAt, endsAt }
}

// Deals the frozen loot over the finding beats in order, so the last tally equals the claim.
const dealLoot = (beats: Beat[], loot: Run['loot']) => {
  const finders = beats.filter(b => FIND_KINDS.includes(b.event.kind))
  const holders = finders.length ? finders : [beats[beats.length - 1]!]
  const chests = holders.filter(b => b.event.kind === 'treasure' || b.event.kind === 'boss')
  const coinBeats = chests.length ? chests : holders
  const units = Object.keys(loot.materials).sort().flatMap(id => Array.from({ length: loot.materials[id]! }, () => id))
  units.forEach((id, k) => { const m = holders[k % holders.length]!.finds.materials; m[id] = (m[id] ?? 0) + 1 })
  const share = Math.floor(loot.coins / coinBeats.length)
  coinBeats.forEach((b, i) => { b.finds.coins = share + (i === coinBeats.length - 1 ? loot.coins - share * coinBeats.length : 0) })
  const spotters = holders.filter(b => b.event.kind === 'discover' || b.event.kind === 'forage')
  loot.critters.forEach((id, k) => { (spotters.length ? spotters : holders)[k % (spotters.length || holders.length)]!.finds.critters.push(id) })
  if (loot.item) (holders.find(b => b.event.kind === 'boss') ?? chests.at(-1) ?? holders.at(-1)!).finds.item = loot.item
}

const loopOf = (e: TrailEvent) => e.seconds * 1000
/** Where the party is at `now`: the beat, its loop position and the move to show. */
export const beatAt = (trail: Trail, now: number): BeatView => {
  const found = trail.beats.findIndex(b => now < b.until)
  const index = found < 0 ? trail.beats.length - 1 : found
  const beat = trail.beats[index]!
  const elapsed = Math.max(0, now - beat.at)
  const t = (elapsed % loopOf(beat.event)) / loopOf(beat.event)
  const stage: Stage = beat.event.kind === 'walk' || beat.event.kind === 'return' ? 'approach' : t < APPROACH ? 'approach' : t < RESOLVE ? 'action' : 'resolve'
  const moves = beat.event.moves
  const move = stage === 'approach' ? (beat.event.kind === 'walk' || beat.event.kind === 'return' ? moves[0]! : 'walk')
    : stage === 'resolve' ? moves[moves.length - 1]! : moves[Math.min(moves.length - 1, Math.floor(((t - APPROACH) / (RESOLVE - APPROACH)) * moves.length))]!
  const progress = Math.max(0, Math.min(1, (now - trail.startAt) / Math.max(1, trail.endsAt - trail.startAt)))
  return { beat, index, t, stage, move, progress }
}

/** True once the beat's first loop has reached its outcome, or the beat is over. */
export const isFound = (beat: Beat, now: number) => now >= beat.until || now - beat.at >= loopOf(beat.event) * RESOLVE

/** The loot revealed so far; it only grows and equals the frozen loot when the run is due. */
export const foundSoFar = (trail: Trail, now: number): Finds => {
  const out = none()
  for (const b of trail.beats) {
    if (!isFound(b, now)) continue
    out.coins += b.finds.coins
    for (const [id, n] of Object.entries(b.finds.materials)) out.materials[id] = (out.materials[id] ?? 0) + n
    out.critters.push(...b.finds.critters)
    if (b.finds.item) out.item = b.finds.item
  }
  return out
}

/** The run's cats still in the household, in run order; the last one leads the line and the caption. */
export const partyOf = (home: Home, run: Run) => {
  const cats = run.cats.map(id => home.cats.find(c => c.id === id)).filter((c): c is Home['cats'][number] => !!c)
  return { cats, lead: cats.at(-1)?.name ?? 'The party' }
}
/** The beat's caption with the lead cat's name. */
export const captionOf = (beat: Beat, lead: string) => beat.event.line.replaceAll('{cat}', lead)
/** One-line summary of finds, e.g. "12c · 3 feather · 1 critter". */
export const findsText = (f: Finds) => [f.coins ? `${f.coins}c` : '', ...Object.entries(f.materials).map(([id, n]) => `${n} ${id}`),
  f.critters.length ? `${f.critters.length} critter${f.critters.length > 1 ? 's' : ''}` : '', f.item ? `rare ${f.item}` : ''].filter(Boolean).join(' · ')
