// Cats vs Mice (Plants vs Zombies style): place cats on 3 lanes to stop the mice reaching the house.
import { renderLanes } from '../render/lanes'
import { seeded } from '../../rng'
import type { Rng } from '../../rng'
import { burst, shake, stepParticles, stepShake } from '../engine'
import type { Particle, Shake } from '../engine'
import type { Game } from '../game'

export type Card = 'yarn' | 'nap' | 'box'
type Unit = { card: Card; lane: number; col: number; hp: number; timer: number }
type Mouse = { lane: number; x: number; hp: number; isRat: boolean; bite: number }
export type LanesState = {
  w: number; h: number; rng: Rng; t: number; units: Unit[]; mice: Mouse[]; shots: { lane: number; x: number }[]
  drops: { x: number; y: number; vy: number; life: number }[]; catnip: number; recharge: Record<Card, number>
  pick: Card | null; cursor: { lane: number; col: number }; next: number; repelled: number; lost: boolean[]
  speed: number; damage: number; isOver: boolean
  particles: Particle[]; shake: Shake; pops: { n: number; x: number; y: number; life: number }[]
}

const SECONDS = 60
export const LANES = 3
// Seven columns, or five in a narrow pane so each cell still fits a 5-6 px cat.
const MIN_CELL = 12
const colsFor = (w: number) => ((w - 6) / 7 >= MIN_CELL ? 7 : 5)
export const TRAY_H = 16
export const CARDS: readonly Card[] = ['yarn', 'nap', 'box']
export const COST: Record<Card, number> = { yarn: 50, nap: 30, box: 40 }
export const RECHARGE: Record<Card, number> = { yarn: 4, nap: 6, box: 8 }
const HP: Record<Card, number> = { yarn: 3, nap: 8, box: 1 }
const SHOOT_EVERY = 1.4
const DREAM_EVERY = 8
const DREAM = 15
const SKY_EVERY = 6
const SKY = 25
const MOUSE_HP = 3
const RAT_HP = 7
const REPEL = 10
const LANE_BONUS = 30
const MAX_SCORE = 400
// Waves: [from, until, seconds between mice, rat chance]; the last one is the flag wave.
const WAVES: readonly [number, number, number, number][] = [[6, 24, 3.6, 0], [27, 45, 2.6, 0.1], [48, 56, 1.1, 0.35]]

export const geometry = (w: number, h: number) => {
  const cols = colsFor(w)
  const cw = Math.floor((w - 6) / cols)
  const lh = Math.floor((h - TRAY_H) / LANES)
  return { cols, cw, lh, left: w - cw * cols, top: TRAY_H }
}
const cellAt = (s: LanesState, x: number, y: number) => {
  const g = geometry(s.w, s.h)
  const lane = Math.floor((y - g.top) / g.lh)
  const col = Math.floor((x - g.left) / g.cw)
  return lane >= 0 && lane < LANES && col >= 0 && col < g.cols ? { lane, col } : null
}

const place = (s: LanesState, lane: number, col: number) => {
  const card = s.pick
  if (!card || s.recharge[card] > 0 || s.catnip < COST[card] || s.lost[lane]) return
  if (s.units.some(u => u.lane === lane && u.col === col)) return
  s.catnip -= COST[card]
  s.recharge[card] = RECHARGE[card]
  s.units.push({ card, lane, col, hp: HP[card], timer: card === 'box' ? 1 : card === 'nap' ? DREAM_EVERY : 0.3 })
  s.pick = null
}

const choose = (s: LanesState, card: Card) => {
  s.pick = s.pick === card ? null : card
}

const grab = (s: LanesState, x: number, y: number) => {
  const drop = s.drops.find(d => Math.abs(d.x + 2 - x) <= 6 && Math.abs(d.y + 2 - y) <= 6)
  if (!drop) return false
  s.drops = s.drops.filter(d => d !== drop)
  s.catnip += SKY
  s.pops.push({ n: SKY, x: drop.x - 4, y: drop.y - 12, life: 0.6 })
  return true
}

const click = (s: LanesState, x: number, y: number) => {
  if (grab(s, x, y)) return
  if (y < TRAY_H) {
    const card = CARDS[Math.floor((x - 2) / 20)]
    if (card) choose(s, card)
    return
  }
  const cell = cellAt(s, x, y)
  if (cell) {
    s.cursor = cell
    place(s, cell.lane, cell.col)
  }
}

export const lanes: Game<LanesState> = {
  id: 'lanes',
  name: 'Cats vs Mice',
  blurb: 'Place yarn throwers, nap walls and box traps to keep the mice out.',
  controls: '1–3 pick a card · click a cell (or arrows + space) · click falling catnip',
  seconds: SECONDS,
  medals: [150, 220, 270],
  init: (seed, mods, w, h) => ({
    w, h, rng: seeded(seed), t: 0, units: [], mice: [], shots: [], drops: [],
    catnip: 100 + Math.min(50, mods.cuddler * 10), recharge: { yarn: 0, nap: 0, box: 0 }, pick: null,
    cursor: { lane: 1, col: 1 }, next: WAVES[0]?.[0] ?? 6, repelled: 0, lost: [false, false, false],
    speed: 6.4 / (1 + 0.1 * mods.dreamer), damage: 1 + Math.min(1, mods.hunter * 0.15), isOver: false,
    particles: [], shake: { t: 0, mag: 0 }, pops: [],
  }),
  step: (s, dt, input) => {
    s.particles = stepParticles(s.particles, dt)
    s.shake = stepShake(s.shake, dt)
    s.pops = s.pops.filter(p => (p.life -= dt) > 0)
    if (s.isOver) return s
    s.t += dt
    for (const i of input) {
      if (i.kind === 'down') click(s, i.x, i.y)
      else if (i.kind === 'key') {
        const k = i.key
        if (k === '1' || k === '2' || k === '3') choose(s, CARDS[Number(k) - 1] ?? 'yarn')
        else if (k === 'up') s.cursor.lane = Math.max(0, s.cursor.lane - 1)
        else if (k === 'down') s.cursor.lane = Math.min(LANES - 1, s.cursor.lane + 1)
        else if (k === 'left') s.cursor.col = Math.max(0, s.cursor.col - 1)
        else if (k === 'right') s.cursor.col = Math.min(geometry(s.w, s.h).cols - 1, s.cursor.col + 1)
        else if (k === ' ' || k === 'space' || k === 'return') {
          if (s.drops[0]) grab(s, s.drops[0].x + 2, s.drops[0].y + 2)
          else place(s, s.cursor.lane, s.cursor.col)
        }
      }
    }
    for (const c of CARDS) s.recharge[c] = Math.max(0, s.recharge[c] - dt)
    const g = geometry(s.w, s.h)
    const xOf = (col: number) => g.left + col * g.cw
    // Catnip from the sky, and from the dreams of napping cats.
    if (Math.floor((s.t - dt) / SKY_EVERY) < Math.floor(s.t / SKY_EVERY)) {
      s.drops.push({ x: g.left + s.rng() * (s.w - g.left - 8), y: TRAY_H, vy: 10, life: 7 })
    }
    for (const d of s.drops) {
      d.y = Math.min(s.h - 8, d.y + d.vy * dt)
      d.life -= dt
    }
    s.drops = s.drops.filter(d => d.life > 0)
    for (const u of s.units) {
      u.timer -= dt
      if (u.card === 'yarn' && u.timer <= 0 && s.mice.some(m => m.lane === u.lane && m.x > xOf(u.col))) {
        s.shots.push({ lane: u.lane, x: xOf(u.col) + 8 })
        u.timer = SHOOT_EVERY
      }
      if (u.card === 'nap' && u.timer <= 0) {
        u.timer = DREAM_EVERY
        s.catnip += DREAM
        s.pops.push({ n: DREAM, x: xOf(u.col), y: g.top + u.lane * g.lh - 8, life: 0.7 })
      }
    }
    for (const sh of s.shots) {
      sh.x += 60 * dt
      const hit = s.mice.filter(m => m.lane === sh.lane && m.x <= sh.x && m.x + 10 >= sh.x)[0]
      if (hit) {
        hit.hp -= s.damage
        sh.x = s.w + 198
        s.particles.push(...burst(s.rng, hit.x + 4, g.top + hit.lane * g.lh + g.lh - 6, 0xf9e2af, 4, 40))
      }
    }
    s.shots = s.shots.filter(sh => sh.x < s.w)
    // Mice walk left, stopping to nibble any cat in their way.
    for (const m of s.mice) {
      const blocker = s.units.find(u => u.lane === m.lane && m.x <= xOf(u.col) + g.cw - 2 && m.x >= xOf(u.col) - 2)
      if (blocker?.card === 'box' && blocker.timer <= 0) {
        m.hp = 0
        blocker.hp = 0
        s.shake = shake(0.6, 0.15)
        continue
      }
      if (blocker && blocker.card !== 'box') {
        m.bite -= dt
        if (m.bite <= 0) {
          blocker.hp--
          m.bite = 1
        }
        continue
      }
      m.x -= s.speed * (m.isRat ? 0.8 : 1) * dt
      if (m.x < 2 && !s.lost[m.lane]) {
        s.lost[m.lane] = true
        s.shake = shake(2)
        s.units = s.units.filter(u => u.lane !== m.lane)
      }
    }
    for (const m of s.mice.filter(mm => mm.hp <= 0)) {
      s.repelled++
      s.pops.push({ n: REPEL, x: m.x, y: g.top + m.lane * g.lh - 6, life: 0.6 })
      s.particles.push(...burst(s.rng, m.x + 4, g.top + m.lane * g.lh + g.lh - 6, 0xcdd6f4, 8, 60))
    }
    s.mice = s.mice.filter(m => m.hp > 0 && !(m.x < 2))
    s.units = s.units.filter(u => u.hp > 0)
    const wave = WAVES.find(([from, until]) => s.t >= from && s.t < until)
    if (wave && s.t >= s.next) {
      const open = [0, 1, 2].filter(l => !s.lost[l])
      const lane = open[Math.floor(s.rng() * open.length)]
      if (lane !== undefined) {
        const isRat = s.rng() < wave[3]
        s.mice.push({ lane, x: s.w, hp: isRat ? RAT_HP : MOUSE_HP, isRat, bite: 0 })
      }
      s.next = s.t + wave[2]
    } else if (!wave) s.next = Math.max(s.next, WAVES.find(([from]) => from > s.t)?.[0] ?? Infinity)
    const flagDone = s.t >= (WAVES[WAVES.length - 1]?.[1] ?? SECONDS) && s.mice.length === 0
    if (s.t >= SECONDS || s.lost.every(Boolean) || flagDone) s.isOver = true
    return s
  },
  draw: (s, f, look) => renderLanes(s, f, look),
  isOver: s => s.isOver,
  status: s => `catnip ${Math.floor(s.catnip)}${s.pick ? ` · placing ${s.pick} (${COST[s.pick]})` : ''}`,
  score: s => s.repelled * REPEL + (s.isOver ? s.lost.filter(l => !l).length * LANE_BONUS : 0),
  maxScore: ms => Math.min(MAX_SCORE, Math.ceil((ms / 1000) * REPEL) + LANES * LANE_BONUS),
}
