import { expect, test } from 'claude-code/testing'

import { followCam, panCam, FOLLOW_AFTER } from './camera'
import { WORLDS } from './content'
import { worldProblems } from './content/types'
import type { World } from './content/types'
import { migrate, newHome } from './game'
import { frameCells, frameImage, yardCols } from './scene'
import { FLAVORS } from './theme'
import { landmarksOf, setWorld, worldCols, worldOf } from './world'

const backyard = WORLDS.find(w => w.id === 'backyard')!

test('every world file is valid and the validator names bad ones', () => {
  for (const world of WORLDS) expect(worldProblems(world)).toEqual([])
  const bad: World = { ...backyard, id: 'Bad', width: { cottage: 90, house: 80, manor: 400 },
    slots: { ...backyard.slots, bowl: 85 }, landmarks: [{ kind: 'tower', x: 70, tier: 0 }, { kind: 'pipe', x: 75, tier: 1 }] }
  expect(worldProblems(bad).length).toBe(6)
})

test('the yard grows with the house and unlocks landmarks by tier', () => {
  expect([0, 1, 2].map(tier => worldCols(backyard, tier, 48))).toEqual([80, 160, 240])
  expect(worldCols(backyard, 0, 300)).toBe(300)
  expect(landmarksOf(backyard, 0)).toEqual([])
  expect(landmarksOf(backyard, 1).map(l => l.kind)).toEqual(['tower', 'tunnel'])
  expect(landmarksOf(backyard, 2).map(l => l.kind)).toEqual(['tower', 'tunnel', 'pipe'])
})

test('old saves land in the backyard and an unknown world falls back to it', () => {
  const { world: _, ...old } = newHome(0)
  expect(migrate(old, 0).world).toEqual({ id: 'backyard' })
  expect(worldOf({ world: { id: 'gone' } }).id).toBe(WORLDS[0]!.id)
  const home = newHome(0)
  expect(setWorld(home, 'backyard').world.id).toBe('backyard')
  expect(setWorld(home, 'gone').world).toEqual(home.world)
})

test('the camera keeps the cat in the middle third, stays in the yard and holds a pan for a while', () => {
  const cam = { x: 0, manualUntil: 0 }
  expect(followCam(cam, 10, 14, 160, 48, 0).x).toBe(0)
  const right = followCam(cam, 60, 14, 160, 48, 0)
  expect(60 + 14).toBeLessThanOrEqual(right.x + Math.ceil(96 / 3))
  expect(followCam(cam, 200, 14, 160, 48, 0).x).toBe(160 - 48)
  const panned = panCam(cam, 1, 160, 48, 10)
  expect(panned.x).toBe(24)
  expect(followCam(panned, 0, 14, 160, 48, 10 + FOLLOW_AFTER - 1).x).toBe(24)
  expect(followCam(panned, 0, 14, 160, 48, 10 + FOLLOW_AFTER).x).toBe(0)
})

test('the scene scrolls the yard with the camera and draws the landmarks a manor unlocks', () => {
  const home = { ...newHome(0), tier: 2 }
  const base = { home, now: 0, tick: 0, hour: 12, flavor: FLAVORS.mocha, cols: 48 }
  expect(yardCols(home, 48)).toBe(240)
  const left = frameImage(base).rgba
  const atTower = frameImage({ ...base, camX: 88 }).rgba
  expect(atTower).not.toBe(left)
  const cottage = frameImage({ ...base, home: { ...home, tier: 0 }, camX: 88 }).rgba
  expect(cottage).not.toBe(atTower)
  expect(frameCells({ ...base, camX: 999 })).toBe(frameCells({ ...base, camX: 240 - 48 }))
})
