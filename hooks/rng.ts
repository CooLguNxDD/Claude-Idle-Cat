export type Rng = () => number

// mulberry32: a small seeded generator, so rolls are repeatable in tests.
export const seeded = (seed: number): Rng => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)] as T

// Picks a key with probability proportional to its weight.
export const weighted = <K extends string>(rng: Rng, weights: Record<K, number>): K => {
  const entries = Object.entries(weights) as [K, number][]
  let roll = rng() * entries.reduce((sum, [, w]) => sum + w, 0)
  for (const [key, w] of entries) {
    roll -= w
    if (roll < 0) return key
  }
  return (entries[entries.length - 1] as [K, number])[0]
}
