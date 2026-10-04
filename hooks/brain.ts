import type { Cat, Home } from '../types'
import { catsAtHome } from './away'
import { BOWL_CAP } from './bowl'
import { BEHAVIORS, GOALS } from './content'
import type { Behavior, Goal } from './content/types'
import { factsOf } from './brain/facts'
import { befriend } from './friends'
import { gainXp, withCat } from './game'
import { plan } from './goap'
import { addBond, bondKey, pickInteraction } from './pair'
import type { Rng } from './rng'
import { skillTotals } from './skills'
import { track } from './collection'

const clamp = (n: number) => Math.max(0, Math.min(100, n))
const dropIntent = (cat: Cat): Cat => {
  const { intent: _intent, ...rest } = cat
  return rest
}
const insistence = (goal: Goal, cat: Cat) => {
  const stat = cat[goal.need.stat]
  if (stat >= goal.need.below) return 0
  return goal.need.weight * (goal.need.below - stat) / goal.need.below * (goal.personality?.[cat.genes.personality] ?? 1)
}

export type BrainEvent = { on: 'plan' | 'done' | 'bowl.empty'; catId: string; about?: readonly string[]; buddyId?: string; vars?: Record<string, string> }
type BrainStep = { home: Home; event?: BrainEvent }
const complete = (home: Home, catId: string, now: number, rng: Rng): BrainStep => {
  const cat = home.cats.find(c => c.id === catId)
  const behavior = cat?.intent ? BEHAVIORS.find(b => b.id === cat.intent!.id) : undefined
  if (!cat || !behavior) return { home: cat ? withCat(home, catId, dropIntent) : home }
  const partner = cat.intent?.with ? home.cats.find(c => c.id === cat.intent!.with) : undefined
  const here = catsAtHome(home)
  if (behavior.partner && (!partner || partner.isAsleep || !here.some(c => c.id === partner.id))) return { home: withCat(home, catId, dropIntent) }
  const fx = behavior.effect
  if ((fx.bowl ?? 0) < 0 && home.bowl.food + (fx.bowl ?? 0) < 0) return {
    home: { ...withCat(home, catId, dropIntent), log: `${cat.name} finds the bowl empty.` },
    event: { on: 'bowl.empty', catId, vars: { food: 'kibble' } },
  }
  const interaction = behavior.partner && partner ? pickInteraction(home, cat, partner, rng) : null
  let next: Home = { ...home, bowl: { food: Math.max(0, Math.min(BOWL_CAP, home.bowl.food + (fx.bowl ?? 0))) } }
  next = withCat(next, catId, c => {
    let updated: Cat = { ...c, hunger: clamp(c.hunger + (fx.hunger ?? 0)), energy: clamp(c.energy + (fx.energy ?? 0)),
      joy: clamp(c.joy + (fx.joy ?? 0)), isAsleep: fx.sleep ? true : c.isAsleep }
    if (fx.friendship) updated = befriend(updated, fx.friendship, now)
    return dropIntent(updated)
  })
  if (partner && fx.joy) next = withCat(next, partner.id, c => ({ ...c, joy: clamp(c.joy + fx.joy!) }))
  const bond = interaction?.bond ?? fx.bond ?? 0
  // The brain alone pays an intent's bond; the on-screen pair run only animates it.
  if (behavior.partner && partner && bond > 0) {
    const key = bondKey(catId, partner.id), before = next.bonds[key]?.points ?? 0
    next = addBond(next, catId, partner.id, bond, now)
    const pair = [catId, partner.id]
    if (next.cats.some(c => pair.includes(c.id) && skillTotals(c).harmony > 0))
      next = { ...next, cats: next.cats.map(c => pair.includes(c.id) ? { ...c, joy: clamp(c.joy + 5) } : c) }
    next = track(next, 'bond', (next.bonds[key]?.points ?? 0) - before, now)
  }
  const line = `${cat.name} ${behavior.line}`
  const logged = { ...next, log: line }
  const done = !fx.xp ? logged : gainXp(logged, catId, fx.xp, now)
  return { home: done, event: { on: 'done', catId, about: [behavior.id], ...(partner ? { buddyId: partner.id } : {}) } }
}

const choose = (home: Home, cat: Cat, now: number, rng: Rng): BrainStep => {
  const facts = factsOf(home, cat)
  const ranked = GOALS.map(goal => ({ goal, n: insistence(goal, cat) })).filter(row => row.n > 0)
    .sort((a, b) => b.n - a.n || GOALS.indexOf(a.goal) - GOALS.indexOf(b.goal))
  for (const { goal } of ranked) {
    const steps = plan(facts, goal.want, BEHAVIORS)
    const first: Behavior | undefined = steps?.[0]
    if (!first) continue
    let withId: string | undefined
    if (first.partner) {
      const pool = catsAtHome(home).filter(c => c.id !== cat.id && !c.isAsleep)
      const buddy = pool[Math.floor(rng() * pool.length)]
      if (!buddy) continue
      withId = buddy.id
    }
    return { home: withCat(home, cat.id, c => ({ ...c, intent: { id: first.id, at: now, ...(withId ? { with: withId } : {}) } })),
      event: { on: 'plan', catId: cat.id, about: [first.id], ...(withId ? { buddyId: withId } : {}) } }
  }
  if (facts.isHungry && !facts.bowlHasFood) {
    const line = `${cat.name} meows at the empty bowl.`
    if (home.log !== line) return { home: { ...home, log: line }, event: { on: 'bowl.empty', catId: cat.id, vars: { food: 'kibble' } } }
  }
  return { home }
}

/** A held intent (its cat still walking or playing it out on screen) waits, but never longer than this past due. */
export const HOLD_MAX_MS = 120_000
const isDue = (cat: Cat, behavior: Behavior, now: number, isHeld: (cat: Cat) => boolean) => {
  const age = now - cat.intent!.at, due = behavior.seconds * 1000
  return age >= due && (age >= due + HOLD_MAX_MS || !isHeld(cat))
}

/** One pass for every cat at home: finish a due intent, then pick at most one new plan. */
export const thinkWithEvents = (home: Home, now: number, rng: Rng, isHeld: (cat: Cat) => boolean = () => false): { home: Home; events: BrainEvent[] } => {
  let next = home
  const events: BrainEvent[] = []
  for (const cat of catsAtHome(home)) {
    const current = next.cats.find(c => c.id === cat.id) ?? cat
    if (current.isAsleep) {
      if (current.intent) next = withCat(next, current.id, dropIntent)
      continue
    }
    const behavior = current.intent ? BEHAVIORS.find(b => b.id === current.intent!.id) : undefined
    if (current.intent && !behavior) next = withCat(next, current.id, dropIntent)
    else if (current.intent && behavior && isDue(current, behavior, now, isHeld)) {
      const step = complete(next, current.id, now, rng)
      next = step.home
      if (step.event) events.push(step.event)
    }
    const after = next.cats.find(c => c.id === cat.id) ?? current
    if (!after.intent && !after.isAsleep) {
      const step = choose(next, after, now, rng)
      next = step.home
      if (step.event) events.push(step.event)
    }
  }
  return { home: next, events }
}
export const think = (home: Home, now: number, rng: Rng, isHeld: (cat: Cat) => boolean = () => false): Home =>
  thinkWithEvents(home, now, rng, isHeld).home
