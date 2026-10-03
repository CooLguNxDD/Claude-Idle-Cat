import { expect, test } from 'claude-code/testing'
import type { Home, WeatherCondition } from '../../../types'
import { newHome } from '../../game'
import { frameImage } from '../../scene'
import { FLAVORS, FLAVOR_NAMES } from '../../theme'

const CONDITIONS: WeatherCondition[] = ['clear', 'partly-cloudy', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'storm']
const withWeather = (condition: WeatherCondition, now: number): Home => {
  const home = newHome(0)
  return { ...home, weather: { ...home.weather, location: { name: 'Yard', latitude: 0, longitude: 0 } as never,
    current: { code: 0, condition, temperatureC: 5, windKph: 30, windDegrees: 270, cloudPercent: 80, precipitationMm: 1,
      isDay: true, observedAt: now, fetchedAt: now, utcOffset: 0 } } }
}

test('every weather and season draws its own 4x yard in every flavor and width', async () => {
  const now = new Date(2026, 4, 15, 12).getTime()
  for (const name of FLAVOR_NAMES) for (const cols of [34, 56]) {
    const frames = CONDITIONS.map(condition => frameImage({ home: withWeather(condition, now), now, tick: 13, hour: 12, flavor: FLAVORS[name], cols }))
    frames.forEach(frame => expect([frame.width, frame.height]).toEqual([cols * 4, 96]))
    expect(new Set(frames.map(frame => frame.rgba)).size).toBe(CONDITIONS.length)
  }
  const seasons = [1, 4, 7, 10].map(month => {
    const at = new Date(2026, month - 1, 15, 12).getTime()
    return frameImage({ home: newHome(0), now: at, tick: 8, hour: 12, flavor: FLAVORS.mocha, cols: 56 }).rgba
  })
  expect(new Set(seasons).size).toBe(4)
})

test('the 4x yard animates from frame to frame', async () => {
  const now = new Date(2026, 6, 15, 23).getTime()
  const at = (tick: number) => frameImage({ home: withWeather('rain', now), now, tick, hour: 23, flavor: FLAVORS.mocha, cols: 40 }).rgba
  expect(at(1)).not.toBe(at(2))
})

test('one yard spec renders at 1x, 2x, 4x and 8x', async () => {
  const now = new Date(2026, 4, 15, 12).getTime()
  for (const scale of [1, 2, 4, 8]) {
    const frame = frameImage({ home: withWeather('rain', now), now, tick: 5, hour: 12, flavor: FLAVORS.mocha, cols: 34, scale })
    expect([frame.width, frame.height]).toEqual([34 * scale, 24 * scale])
  }
})
