import { SKILL_FILES } from './content'
import type { Cat } from '../types'

export type Branch = 'hunter' | 'cuddler' | 'dreamer'
export type Form = 'ninja' | 'royal' | 'cloud' | 'chonk'
export const FORM_LEVEL = 10

export type SkillEffect = Partial<{
  coin: number; eventRate: number; gift: number; petJoy: number; playJoy: number; xp: number
  joyDecay: number; regen: number; energyDecay: number; offlineHours: number; sleepCoin: number
  expTime: number; matRolls: number; rareOdds: number; bond: number; party: number
  expOffline: number; stardust: number; harmony: number; oracle: number
}>
export type Skill = { id: string; branch: Branch; name: string; maxRank: number; needs?: string; perk: string; per: SkillEffect; minLevel?: number }

export const BRANCHES: Record<Branch, { title: string; form: Form; blurb: string }> = {
  hunter: { title: 'Hunter', form: 'ninja', blurb: 'coins, AFK finds and gifts' },
  cuddler: { title: 'Cuddler', form: 'royal', blurb: 'joy and xp' },
  dreamer: { title: 'Dreamer', form: 'cloud', blurb: 'sleep and time away' },
}

// Each rank multiplies by `1 + per` (or adds, for offlineHours).
export const SKILLS = SKILL_FILES
const BY_ID = new Map(SKILLS.map(s => [s.id, s]))

export const rankOf = (cat: Cat, id: string) => cat.skills[id] ?? 0
export const spentPoints = (cat: Cat) => Object.values(cat.skills).reduce((sum, r) => sum + r, 0)
export const freePoints = (cat: Cat) => Math.max(0, cat.level - 1 - spentPoints(cat))
export const branchPoints = (cat: Cat, branch: Branch) =>
  SKILLS.filter(s => s.branch === branch).reduce((sum, s) => sum + rankOf(cat, s.id), 0)

export type LearnCheck = { ok: true } | { ok: false; reason: string }
export const canLearn = (cat: Cat, id: string): LearnCheck => {
  const skill = BY_ID.get(id)
  if (!skill) return { ok: false, reason: 'no such skill' }
  if (cat.level < (skill.minLevel ?? 1)) return { ok: false, reason: `needs level ${skill.minLevel}` }
  if (rankOf(cat, id) >= skill.maxRank) return { ok: false, reason: 'maxed' }
  if (skill.needs && rankOf(cat, skill.needs) === 0) {
    return { ok: false, reason: `needs ${BY_ID.get(skill.needs)?.name ?? skill.needs}` }
  }
  if (freePoints(cat) === 0) return { ok: false, reason: 'no skill points' }
  return { ok: true }
}

export const learn = (cat: Cat, id: string): Cat =>
  canLearn(cat, id).ok ? { ...cat, skills: { ...cat.skills, [id]: rankOf(cat, id) + 1 } } : cat

export const respecPrice = (cat: Cat) => 25 * cat.level

// The branch with the most points decides the form at FORM_LEVEL; no points means a chonk.
export const formOf = (cat: Cat): Form | null => {
  if (cat.level < FORM_LEVEL) return null
  const ranked = (Object.keys(BRANCHES) as Branch[])
    .map(b => ({ b, n: branchPoints(cat, b) }))
    .sort((a, z) => z.n - a.n)
  const top = ranked[0]
  return top && top.n > 0 ? BRANCHES[top.b].form : 'chonk'
}

export type SkillTotals = Required<SkillEffect>
export const skillTotals = (cat: Cat): SkillTotals => {
  const t: SkillTotals = { coin: 1, eventRate: 1, gift: 1, petJoy: 1, playJoy: 1, xp: 1, joyDecay: 1, regen: 1,
    energyDecay: 1, offlineHours: 0, sleepCoin: 1, expTime: 1, matRolls: 0, rareOdds: 0, bond: 1, party: 0,
    expOffline: 1, stardust: 0, harmony: 0, oracle: 0 }
  for (const skill of SKILLS) {
    const rank = rankOf(cat, skill.id)
    if (rank === 0) continue
    for (const [key, per] of Object.entries(skill.per) as [keyof SkillTotals, number][]) {
      if (['offlineHours', 'matRolls', 'rareOdds', 'party', 'stardust', 'harmony', 'oracle'].includes(key)) t[key] += per * rank
      else t[key] *= 1 + per * rank
    }
  }
  return t
}
