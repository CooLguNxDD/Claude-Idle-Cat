import type { Behavior, Fact, Facts } from './content/types'
import { FACT_KEYS } from './content/types'

const keyOf = (facts: Facts) => FACT_KEYS.map(k => facts[k] ? '1' : '0').join('')
const matches = (facts: Facts, need: Facts) => (Object.keys(need) as Fact[]).every(k => (facts[k] ?? false) === need[k])
const unsatisfied = (facts: Facts, want: Facts) => (Object.keys(want) as Fact[]).filter(k => (facts[k] ?? false) !== want[k]).length

// a is strictly later in registry order than b.
const pathWorse = (a: readonly number[], b: readonly number[]) => {
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i]! > b[i]!
  return a.length > b.length
}

type Node = { facts: Facts; path: number[]; g: number; h: number }
const better = (a: Node, b: Node) => {
  const fa = a.g + a.h, fb = b.g + b.h
  if (fa !== fb) return fa < fb
  if (a.g !== b.g) return a.g < b.g
  return pathWorse(b.path, a.path)
}

/** A* over fact sets. Depth is at most 4. Equal costs keep the earlier registry order. */
export const plan = (facts: Facts, want: Facts, behaviors: readonly Behavior[]): Behavior[] | null => {
  if (matches(facts, want)) return []
  const open: Node[] = [{ facts, path: [], g: 0, h: unsatisfied(facts, want) }]
  const best = new Map<string, { g: number; path: number[] }>([[keyOf(facts), { g: 0, path: [] }]])
  let guard = 0
  while (open.length && guard++ < 4096) {
    open.sort((a, b) => better(a, b) ? -1 : better(b, a) ? 1 : 0)
    const cur = open.shift()!
    const seen = best.get(keyOf(cur.facts))
    if (seen && (seen.g < cur.g || (seen.g === cur.g && pathWorse(cur.path, seen.path)))) continue
    if (matches(cur.facts, want)) return cur.path.map(i => behaviors[i]!)
    if (cur.path.length >= 4) continue
    for (let i = 0; i < behaviors.length; i++) {
      const behavior = behaviors[i]!
      if (!matches(cur.facts, behavior.pre)) continue
      const nextFacts = { ...cur.facts, ...behavior.post }
      const g = cur.g + behavior.cost
      const path = [...cur.path, i]
      const prev = best.get(keyOf(nextFacts))
      if (prev && (prev.g < g || (prev.g === g && !pathWorse(prev.path, path)))) continue
      best.set(keyOf(nextFacts), { g, path })
      open.push({ facts: nextFacts, path, g, h: unsatisfied(nextFacts, want) })
    }
  }
  return null
}
