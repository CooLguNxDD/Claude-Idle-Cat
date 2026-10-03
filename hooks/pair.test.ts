import { expect, test } from 'claude-code/testing'
import { INTERACTIONS } from './content'
import { newHome } from './game'
import { addBond, bondKey, DAILY_BOND_CAP, partnerOf, pickInteraction, startPair, stepPair } from './pair'
import { motionCtxOf, startMotion } from './motion'
import { seeded } from './rng'
import { send } from './expeditions'

const now = new Date(2026, 9, 5, 12).getTime()
const family = () => { const h = newHome(now), cat = h.cats[0]!; return { ...h, coins: 1000, cats: [cat, { ...cat, id: 'c2', name: 'Miso' }] } }
test('bonds have canonical keys, a shared ladder and a daily gain cap', () => {
  const h = family(), key = bondKey('c2', 'c1')
  expect(key).toBe('c1|c2')
  const bonded = addBond(addBond(h, 'c2', 'c1', 9, now), 'c1', 'c2', 9, now)
  expect(bonded.bonds[key]!.points).toBe(DAILY_BOND_CAP)
  expect(addBond(bonded, 'c1', 'c2', 3, now + 86400000).bonds[key]!.points).toBe(13)
  expect(addBond(h, 'c1', 'c1', 3, now)).toBe(h)
})
test('interaction weights respect moods, bond gates and cats away', () => {
  const h = family(), lead = h.cats[0]!, buddy = h.cats[1]!, rng = seeded(2)
  const picked = new Set(Array.from({ length: 100 }, () => pickInteraction(h, lead, buddy, rng)?.id))
  expect(picked.has('nose-boop')).toBe(true); expect(picked.has('groom-buddy')).toBe(false)
  const away = send(h, 'garden-patrol', ['c2'], [], now, 7)
  expect(partnerOf(away, 'c1', rng)).toBeNull()
  expect(pickInteraction(away, lead, buddy, rng)).toBeNull()
})
test('pair spacing converges within the yard while keeping full-sized partner motion in memory', () => {
  const h = family(), ctx = motionCtxOf(h, 48, 12)
  for (const interaction of INTERACTIONS) {
    let run = startPair(interaction, 'c1', 'c2', startMotion(20), ctx, seeded(4))
    for (let n = 0; n < 40; n++) run = stepPair(run, ctx)
    expect(Math.abs(run.partner.x - run.lead.x - { touch: 42, face: 64, chase: 80, pile: 28 }[interaction.spacing])).toBeLessThan(1)
    expect(run.partner.x).toBeLessThanOrEqual(ctx.maxX)
    expect(run.lead.x).toBeGreaterThanOrEqual(ctx.minX)
  }
})
