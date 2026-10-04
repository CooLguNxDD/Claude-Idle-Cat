import type { Home, Personality, Rarity } from '../../types'
import type { Skill } from '../skills'
import type { Furniture } from '../home'
import type { Counter } from '../collection'
import type { Mood } from '../game'
import type { Availability, LandmarkKind, Move } from './types'
import { COLOR_TOKENS } from '../theme'
import { availabilityProblems } from './types'

export type Cost = { coins?: number; miles?: number; materials?: Record<string, number> }
export type Unlock = { tier?: number; level?: number; achievement?: string; expedition?: string; item?: string; world?: string }
export type SkillSpec = Skill
export type FurnitureSpec = Furniture
export type Material = { id: string; name: string; rarity: Rarity; glyph: string }
export type GearMods = { expTime?: number; matRolls?: number; rareOdds?: number; loot?: number }
export type ShopItem = { id: string; name: string; text: string; shop: 'miles' | 'curio'; cost: Cost
  kind: 'furniture' | 'charm' | 'map' | 'gear' | 'consumable'; grants: string; unlock?: Unlock; mods?: GearMods }
// Cosmetic tool/turn signals supported by the reaction engine.
export const SIGNALS = ['tool.error', 'tool.ok', 'tool.long', 'test.pass', 'test.fail', 'turn.done', 'turn.error'] as const
export type Signal = typeof SIGNALS[number]
export type Reaction = { id: string; on: Signal; tools?: readonly string[]; move: string; line?: string
  effect?: import('../../types').EffectKind; odds: number; cooldownSec: number; personality?: readonly Personality[] }
export type Interaction = { id: string; label: string; roles: { lead: string; partner: string }
  spacing: 'touch' | 'face' | 'chase' | 'pile'; seconds: number
  when: { minBond: number; moods?: readonly Mood[]; pair?: readonly Personality[]; weight: number }; bond: number; line: string }
export const FACT_KEYS = ['isAwake', 'isHungry', 'isTired', 'isLonely', 'isBored', 'hasEnergy', 'bowlHasFood', 'hasBuddy'] as const
export type Fact = typeof FACT_KEYS[number]
export type Facts = Partial<Record<Fact, boolean>>
export type BehaviorEffect = { hunger?: number; energy?: number; joy?: number; xp?: number; bowl?: number; sleep?: true; bond?: number; friendship?: number }
export type Behavior = { id: string; label: string; pre: Facts; post: Facts; cost: number; seconds: number
  goTo?: 'bowl' | 'bed'; seek?: LandmarkKind; move: string; partner?: boolean; effect: BehaviorEffect; line: string }
export type Goal = { id: string; label: string; want: Facts
  need: { stat: 'hunger' | 'energy' | 'joy'; below: number; weight: number }
  personality?: Partial<Record<Personality, number>> }
export type Expedition = { id: string; label: string; blurb: string; minutes: number; party: readonly [number, number]
  minLevel: number; cost: { coins: number; energy: number }; available?: Availability; unlock?: Unlock
  loot: { coins: readonly [number, number]; materials: Record<string, number>; rolls: readonly [number, number]
    critters: number; critterKinds?: readonly ('bug' | 'fish' | 'mouse')[]; rare?: { item: string; odds: number } }; likes?: Partial<Record<Personality, number>>; xp: number; bond: number }
export type Quest = { id: string; label: string; steps: readonly { text: string; counter: Counter; goal: number; material?: string }[]
  reward: Cost & { item?: string }; available?: Availability; weight: number }
export type GameEvent = { id: string; label: string; kind: 'exchange' | 'boost'; available?: Availability
  weekdays?: readonly number[]; materials?: number; bond?: number }
// Typed constructors only; the *Problems functions validate authoring limits and references.
export const defineSkill = (s: SkillSpec) => s
export const defineFurniture = (s: FurnitureSpec) => s
export const defineShop = (s: ShopItem) => s
export const defineMaterial = (s: Material) => s
export const defineReaction = (s: Reaction) => s
export const defineInteraction = (s: Interaction) => s
export const defineBehavior = (s: Behavior) => s
export const defineGoal = (s: Goal) => s
export const defineExpedition = (s: Expedition) => s
export const defineQuest = (s: Quest) => s
export const defineEvent = (s: GameEvent) => s
const base = (s: { id: string }) => /^[a-z][a-z0-9-]*$/.test(s.id) ? [] : [`${s.id}: needs a kebab-case id`]
const range = (n: number, lo: number, hi: number) => Number.isFinite(n) && n >= lo && n <= hi
const whole = (n: number, lo: number, hi: number) => Number.isInteger(n) && range(n, lo, hi)
const pair = (v: readonly [number, number], lo: number, hi: number) => v.length === 2 && v.every(n => whole(n, lo, hi)) && v[0] <= v[1]
const name = (s: { id: string; name?: string; label?: string }) => [...base(s), ...((s.name ?? s.label)?.trim() ? [] : [`${s.id}: needs a name`])]
export const costProblems = (c: Cost, materials: readonly Material[] = []): string[] => [
  ...Object.entries({ coins: c.coins, miles: c.miles }).filter(([, n]) => n !== undefined && !whole(n, 0, 1e9)).map(([k]) => `cost.${k}: nonnegative whole amount required`),
  ...Object.entries(c.materials ?? {}).filter(([id, n]) => !whole(n, 1, 1000) || !materials.some(m => m.id === id)).map(([id]) => `cost: invalid material ${id}`),
]
export const unlockProblems = (u: Unlock | undefined, homeIds: { expeditions?: readonly Expedition[]; shop?: readonly ShopItem[]; worlds?: readonly { id: string }[]; achievements?: readonly { id: string }[] } = {}): string[] => [
  ...(u?.tier !== undefined && !whole(u.tier, 0, 6) ? ['unlock: tier is 0 to 6'] : []),
  ...(u?.level !== undefined && !whole(u.level, 1, 100) ? ['unlock: level is 1 to 100'] : []),
  ...(u?.expedition && !homeIds.expeditions?.some(e => e.id === u.expedition) ? ['unlock: unknown expedition'] : []),
  ...(u?.item && !homeIds.shop?.some(i => i.grants === u.item && i.kind === 'map') ? ['unlock: unknown map'] : []),
  ...(u?.achievement && !homeIds.achievements?.some(a => a.id === u.achievement) ? ['unlock: unknown achievement'] : []),
  ...(u?.world && !homeIds.worlds?.some(w => w.id === u.world) ? ['unlock: unknown world'] : []),
]
export const skillProblems = (s: SkillSpec, all: readonly SkillSpec[]): string[] => {
  const caps: Record<string, readonly [number, number]> = { coin: [0, 1], eventRate: [0, 1], gift: [0, 1], petJoy: [0, 1], playJoy: [0, 1], xp: [0, 1], joyDecay: [-0.5, 0], regen: [0, 1], energyDecay: [-0.5, 0], offlineHours: [0, 4], sleepCoin: [0, 1], expTime: [-0.2, 0], matRolls: [0, 1], rareOdds: [0, 0.1], bond: [0, 0.5], party: [0, 1], expOffline: [0, 0.2], stardust: [0, 1], harmony: [0, 1], oracle: [0, 1] }
  return [...name(s), ...(!['hunter', 'cuddler', 'dreamer'].includes(s.branch) ? ['unknown branch'] : []),
    ...(!whole(s.maxRank, 1, 3) ? ['maxRank is 1 to 3'] : []), ...(s.minLevel !== undefined && !whole(s.minLevel, 1, 25) ? ['minLevel is 1 to 25'] : []),
    ...(s.needs && (!all.some(o => o.id === s.needs && o.branch === s.branch) || s.needs === s.id) ? ['unknown prerequisite'] : []),
    ...Object.entries(s.per).filter(([k, v]) => !caps[k] || !range(v, caps[k]![0], caps[k]![1])).map(([k]) => `invalid effect ${k}`), ...Object.entries(s.per).filter(([k, v]) => ['matRolls', 'party', 'stardust', 'harmony', 'oracle'].includes(k) && !Number.isInteger(v)).map(([k]) => `effect ${k} must be whole`)]
}
export const furnitureProblems = (s: FurnitureSpec, mats: readonly Material[] = []): string[] => {
  const caps: Record<string, readonly [number, number]> = { coin: [1, 2.5], regen: [1, 2.5], eventRate: [1, 2.5], joyDecay: [0.5, 1], gift: [1, 2.5], expTime: [0.8, 1], bond: [1, 1.5], matOdds: [1, 1.5] }
  return [...name(s), ...(s.art && (!s.art.rows.length || s.art.rows.some(r => !r.length || r.length > 24) || s.art.rows.length > 16 || Object.values(s.art.colors).some(c => !(COLOR_TOKENS as readonly string[]).includes(c)) || s.art.rows.some(r => [...r].some(ch => ch !== '.' && !s.art!.colors[ch]))) ? ['invalid semantic art'] : []), ...(!['bowl', 'bed', 'toy', 'rug', 'plant', 'hanging'].includes(s.slot) ? ['unknown slot'] : []),
    ...(!whole(s.price, 0, 1e9) || !whole(s.bait, 0, 10) ? ['invalid price or bait'] : []),
    ...(s.minTier !== undefined && !whole(s.minTier, 3, 6) ? ['minTier is 3 to 6'] : []), ...costProblems(s.cost ?? {}, mats),
    ...Object.entries(s.mods).filter(([k, v]) => k === 'autoFeed' ? typeof v !== 'boolean' : !caps[k] || !range(v as number, caps[k]![0], caps[k]![1])).map(([k]) => `invalid mod ${k}`),
    ...availabilityProblems(s.months ? { months: s.months } : undefined, s.id)]
}
export const materialProblems = (s: Material): string[] => [...name(s),
  ...(!['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(s.rarity) ? ['unknown rarity'] : []), ...(!s.glyph.trim() || s.glyph.length > 4 ? ['glyph is 1 to 4 characters'] : [])]
export const reactionProblems = (s: Reaction, moves: readonly Move[]): string[] => [...base(s),
  ...(s.effect && !['hearts', 'fish', 'yarn', 'coins', 'levelup', 'evolve', 'shop', 'adopt', 'visitor', 'welcome', 'gift', 'catch', 'award', 'birthday', 'medal'].includes(s.effect) ? ['unknown cosmetic effect'] : []), ...(!SIGNALS.includes(s.on) ? ['unknown signal'] : []), ...(!moves.some(m => m.id === s.move) ? ['unknown move'] : []),
  ...(!range(s.odds, 0, 1) || !range(s.cooldownSec, 1, 3600) ? ['invalid odds or cooldown'] : [])]
const factProblems = (f: Facts, at: string) => Object.keys(f).filter(k => !(FACT_KEYS as readonly string[]).includes(k)).map(k => `${at}: unknown fact ${k}`)
const effectProblems = (e: BehaviorEffect): string[] => [
  ...(e.hunger !== undefined && !range(e.hunger, -100, 100) ? ['effect.hunger is -100 to 100'] : []),
  ...(e.energy !== undefined && !range(e.energy, -100, 100) ? ['effect.energy is -100 to 100'] : []),
  ...(e.joy !== undefined && !range(e.joy, -100, 100) ? ['effect.joy is -100 to 100'] : []),
  ...(e.xp !== undefined && !range(e.xp, 0, 200) ? ['effect.xp is 0 to 200'] : []),
  ...(e.bowl !== undefined && !range(e.bowl, -10, 10) ? ['effect.bowl is -10 to 10'] : []),
  ...(e.bond !== undefined && !range(e.bond, 0, 5) ? ['effect.bond is 0 to 5'] : []),
  ...(e.friendship !== undefined && !range(e.friendship, 0, 10) ? ['effect.friendship is 0 to 10'] : []),
  ...(e.sleep !== undefined && e.sleep !== true ? ['effect.sleep is true'] : []),
]
export const behaviorProblems = (s: Behavior, moves: readonly Move[]): string[] => [...name(s),
  ...factProblems(s.pre, `${s.id}.pre`), ...factProblems(s.post, `${s.id}.post`),
  ...(!range(s.cost, 0, 100) ? ['cost is 0 to 100'] : []),
  ...(!range(s.seconds, 0, 600) ? ['seconds is 0 to 600'] : []),
  ...(!moves.some(m => m.id === s.move) ? [`unknown move ${s.move}`] : []),
  ...(s.goTo && s.goTo !== 'bowl' && s.goTo !== 'bed' ? ['goTo is bowl or bed'] : []),
  ...(s.seek && !['tower', 'tunnel', 'pipe', 'window', 'shelf'].includes(s.seek) ? [`unknown landmark ${s.seek}`] : []),
  ...effectProblems(s.effect)]
export const goalProblems = (s: Goal): string[] => [...name(s), ...factProblems(s.want, `${s.id}.want`),
  ...(!['hunger', 'energy', 'joy'].includes(s.need.stat) ? ['need.stat is hunger, energy or joy'] : []),
  ...(!range(s.need.below, 0, 100) || !range(s.need.weight, 0, 10) ? ['invalid goal limits'] : []),
  ...Object.values(s.personality ?? {}).filter(n => !range(n, 0, 3)).map(() => 'personality multiplier is 0 to 3')]
export const interactionProblems = (s: Interaction, moves: readonly Move[]): string[] => [...name(s),
  ...(!['touch', 'face', 'chase', 'pile'].includes(s.spacing) ? ['unknown spacing'] : []),
  ...Object.values(s.roles).filter(id => !moves.some(m => m.id === id)).map(id => `unknown role move ${id}`),
  ...(!range(s.seconds, 2, 120) || !range(s.bond, 0, 5) || !range(s.when.minBond, 0, 400) || !range(s.when.weight, 0, 10) ? ['invalid interaction limits'] : [])]
export const expeditionProblems = (s: Expedition, mats: readonly Material[], items: readonly { id: string }[] = []): string[] => [...name(s),
  ...availabilityProblems(s.available, s.id), ...(!whole(s.minutes, 10, 720) ? ['minutes is 10 to 720'] : []),
  ...(!pair(s.party, 1, 3) || !whole(s.minLevel, 1, 25) ? ['invalid party or level'] : []),
  ...(!whole(s.cost.coins, 0, 10000) || !whole(s.cost.energy, 0, 100) ? ['invalid departure cost'] : []),
  ...(!pair(s.loot.coins, 0, 240) || !pair(s.loot.rolls, 1, 8) || !range(s.loot.critters, 0, 1) ? ['invalid loot limits'] : []),
  ...(s.loot.critterKinds && (!s.loot.critterKinds.length || s.loot.critterKinds.some(k => !['bug', 'fish', 'mouse'].includes(k))) ? ['unknown critter kind'] : []), ...(!Object.keys(s.loot.materials).length ? ['needs material weights'] : []),
  ...Object.entries(s.loot.materials).filter(([id, n]) => !mats.some(m => m.id === id) || !range(n, 0.1, 10)).map(([id]) => `invalid material ${id}`),
  ...(s.loot.rare && (!items.some(i => i.id === s.loot.rare!.item) || !range(s.loot.rare.odds, 0, 0.1)) ? ['invalid rare find'] : []),
  ...(!whole(s.xp, 0, 200) || !range(s.bond, 0, 5) ? ['invalid xp or bond'] : []),
  ...Object.values(s.likes ?? {}).filter(n => !range(n, 1, 1.5)).map(() => 'personality bonus is 1 to 1.5')]
// Counters shared by Paw Miles tasks and daily quest chains.
export const COUNTERS = ['pet', 'feed', 'play', 'gift', 'buy', 'tools', 'turns', 'donate', 'visitor', 'catch', 'games', 'bond', 'react', 'expedition', 'exchange', 'craft'] as const
export const questProblems = (s: Quest, mats: readonly Material[], items: readonly { id: string }[] = []): string[] => [...name(s),
  ...availabilityProblems(s.available, s.id), ...costProblems(s.reward, mats),
  ...(!range(s.weight, 0.1, 10) || !s.steps.length || s.steps.length > 6 ? ['invalid quest limits'] : []),
  ...s.steps.filter(t => !t.text.trim() || !(COUNTERS as readonly string[]).includes(t.counter) || !whole(t.goal, 1, 1000) || (t.material && (t.counter !== 'expedition' || !mats.some(m => m.id === t.material)))).map(() => 'invalid step'),
  ...(s.reward.item && !items.some(i => i.id === s.reward.item) ? ['unknown reward item'] : [])]
export const eventProblems = (s: GameEvent): string[] => [...name(s), ...availabilityProblems(s.available, s.id),
  ...(!['exchange', 'boost'].includes(s.kind) ? ['unknown event kind'] : []),
  ...(s.kind === 'boost' && !range(s.materials ?? 0, 1, 1.5) ? ['material boost is 1 to 1.5'] : []),
  ...(s.kind === 'exchange' && !range(s.bond ?? 0, 1, 5) ? ['exchange bond is 1 to 5'] : []),
  ...(s.weekdays?.some(n => !whole(n, 0, 6)) ? ['weekdays are 0 to 6'] : [])]
export const shopProblems = (s: ShopItem, mats: readonly Material[], furniture: readonly FurnitureSpec[] = []): string[] => [...name(s), ...costProblems(s.cost, mats),
  ...(s.shop === 'miles' && (!whole(s.cost.miles ?? 0, 1, 1e9) || s.cost.coins !== undefined || s.cost.materials !== undefined) ? ['miles shop requires only a positive miles cost'] : []),
  ...(!['miles', 'curio'].includes(s.shop) || !['furniture', 'charm', 'map', 'gear', 'consumable'].includes(s.kind) ? ['unknown shop or kind'] : []),
  ...(!s.grants.trim() || (s.kind === 'furniture' && !furniture.some(i => i.id === s.grants)) ? ['unknown grant'] : []),
  ...Object.entries(s.mods ?? {}).filter(([k, n]) => !({ expTime: range(n, 0.8, 1), matRolls: whole(n, 0, 1), rareOdds: range(n, 0, 0.1), loot: range(n, 1, 1.5) } as Record<string, boolean>)[k]).map(([k]) => `invalid gear mod ${k}`)]
export const unlockHint = (u?: Unlock) => u ? [u.tier !== undefined ? `house tier ${u.tier}` : '', u.level ? `level ${u.level}` : '', u.achievement, u.expedition ? `finish ${u.expedition}` : '', u.item ? `own ${u.item}` : '', u.world ? `yard currently in ${u.world}` : ''].filter(Boolean).join(' · ') : ''
export const isUnlocked = (h: Home, u?: Unlock) => !u || (h.tier >= (u.tier ?? 0) && h.cats.some(c => c.level >= (u.level ?? 1)) && (!u.achievement || u.achievement in h.achievements) && (!u.expedition || (h.expeditions.done[u.expedition] ?? 0) > 0) && (!u.item || h.owned.includes(u.item)) && (!u.world || h.world.id === u.world))
