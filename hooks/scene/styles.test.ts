import { expect, test } from 'claude-code/testing'
import type { Home, WeatherCondition } from '../../types'
import { WORLDS } from '../content'
import { newHome } from '../game'
import { frameCells, frameImage } from '../scene'
import { FLAVORS, FLAVOR_NAMES } from '../theme'
import { landmarksOf, setWorld, worldCols } from '../world'
import { canvas } from './canvas'
import { pen } from './fine/draw'
import { styledSky } from './styles'

const themed = WORLDS.filter(w => w.scene)
const now = new Date(2026, 9, 15, 12).getTime()
const CONDITIONS: WeatherCondition[] = ['clear', 'partly-cloudy', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'storm']
const withWeather = (home: Home, condition: WeatherCondition, isDay: boolean): Home => ({ ...home,
  weather: { ...home.weather, location: { label: 'Yard', latitude: 0, longitude: 0, source: 'city' },
    current: { code: 0, condition, temperatureC: 5, windKph: 30, windDegrees: 270, cloudPercent: 80, precipitationMm: 1,
      isDay, observedAt: now, fetchedAt: now, utcOffset: 0 } },
})

test('station stars animate only on visible nights in every flavor and scale', () => {
  for (const flavor of Object.values(FLAVORS)) for (const scale of [1, 2, 4, 8])
    for (const isNight of [false, true]) for (const isSunVisible of [false, true]) {
      const at = (tick: number) => {
        const c = canvas(56, scale)
        styledSky(pen(c), 'space-station', { top: flavor.crust, low: flavor.base, isNight, isSunVisible,
          isDusk: false, hasClouds: false, isWinter: false, hasLights: false }, tick, flavor)
        return c.image(flavor.base).rgba
      }
      expect(at(0) === at(1)).toBe(!(isNight && isSunVisible))
    }
})

test('new worlds select without changing furniture and retain movement geometry at each tier', () => {
  const home = newHome(now)
  const backyard = WORLDS[0]!
  for (const world of themed) {
    const moved = setWorld(home, world.id)
    expect(moved.world.id).toBe(world.id)
    expect(moved.decor).toEqual(home.decor)
    expect(moved.coins).toBe(home.coins)
    expect(world.slots).toEqual(backyard.slots)
    for (const tier of [0, 1, 2]) {
      expect(landmarksOf(world, tier)).toEqual(landmarksOf(backyard, tier))
      expect(worldCols(world, tier, 34)).toBe(worldCols(backyard, tier, 34))
    }
  }
})

test('every theme is distinct in all flavors at day and night, including terminal fallback', () => {
  for (const name of FLAVOR_NAMES) for (const hour of [0, 12]) {
    const frames = themed.map(world => {
      const home = { ...newHome(now), world: { id: world.id }, tier: 2 }
      const input = { home, now, tick: 13, hour, flavor: FLAVORS[name], cols: 56 }
      const cells = frameCells(input)
      expect(cells.length).toBe(frameCells({ ...input, home: newHome(now) }).length)
      expect(frameCells(input)).toBe(cells)
      return frameImage(input).rgba
    })
    expect(new Set(frames).size).toBe(themed.length)
  }
})

test('themes render at all scales and tiers and clamp camera edges in narrow and wide panes', () => {
  for (const world of themed) for (const tier of [0, 1, 2]) for (const cols of [34, 56]) {
    const home = { ...newHome(now), world: { id: world.id }, tier }
    const input = { home, now, tick: 13, hour: 12, flavor: FLAVORS.mocha, cols }
    for (const scale of [1, 2, 4, 8]) {
      const image = frameImage({ ...input, scale })
      expect([image.width, image.height]).toEqual([cols * scale, 24 * scale])
    }
    const edge = worldCols(world, tier, cols) - cols
    expect(frameCells({ ...input, camX: 999 })).toBe(frameCells({ ...input, camX: edge }))
    expect(frameImage({ ...input, camX: 999 }).rgba).toBe(frameImage({ ...input, camX: edge }).rgba)
    expect(frameImage({ ...input, camX: 0 }).rgba).not.toBe(frameImage({ ...input, camX: edge }).rgba)
  }
})

test('live weather remains visible and animated in every theme including the station', () => {
  for (const world of themed) for (const name of FLAVOR_NAMES) for (const isDay of [true, false]) {
    const base = { ...newHome(now), world: { id: world.id } }
    const input = { now, tick: 13, hour: isDay ? 12 : 0, flavor: FLAVORS[name], cols: 34 }
    const frames = CONDITIONS.map(condition => frameImage({ ...input, home: withWeather(base, condition, isDay) }).rgba)
    expect(new Set(frames).size).toBe(CONDITIONS.length)
    const rain = withWeather(base, 'rain', isDay)
    expect(frameImage({ ...input, home: rain, tick: 1 }).rgba).not.toBe(frameImage({ ...input, home: rain, tick: 2 }).rgba)
  }
})

test('October pumpkins and December lights remain in every theme', () => {
  for (const world of themed) {
    const home = { ...newHome(now), world: { id: world.id } }
    const input = { home, tick: 13, hour: 0, flavor: FLAVORS.mocha, cols: 56, camX: 8 }
    const autumn = frameImage({ ...input, now: new Date(2026, 8, 15).getTime() }).rgba
    const october = frameImage({ ...input, now }).rgba
    const winter = frameImage({ ...input, now: new Date(2026, 0, 15).getTime() }).rgba
    const december = frameImage({ ...input, now: new Date(2026, 11, 15).getTime() }).rgba
    expect(october === autumn).toBe(false)
    expect(december === winter).toBe(false)
  }
})
