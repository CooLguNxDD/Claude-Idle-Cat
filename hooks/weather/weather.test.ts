import { expect, test } from 'claude-code/testing'

import { migrate, newHome } from '../game'
import { frameCells, ROWS } from '../scene'
import { FLAVORS } from '../theme'
import { parseCurrent, conditionOf } from './conditions'
import { coordinates, forecastUrl, geocodingUrl, locationKey, parseLocations } from './location'
import { acceptWeather, emptyWeather, liveWeather, MAX_AGE_MS, normalizeWeather, REFRESH_MS, refreshDue,
  RETRY_MS, setLocation, weatherSummary } from './state'
import { WEATHER_SCENES } from '../scene/weather'

const now = new Date(2026, 9, 2, 12).getTime()
const response = (code = 61) => ({ utc_offset_seconds: 3600, current: { weather_code: code, temperature_2m: 10,
  wind_speed_10m: 25, wind_direction_10m: 240, cloud_cover: 90, precipitation: 1.2, is_day: 1, time: now / 1000 } })
const location = coordinates(51.5074, -0.1278, 'city', 'London, England, United Kingdom')!

test('weather codes and API readings are checked before reaching the renderer', async () => {
  for (const [code, condition] of [[0, 'clear'], [2, 'partly-cloudy'], [3, 'cloudy'], [48, 'fog'], [55, 'drizzle'],
    [65, 'rain'], [86, 'snow'], [99, 'storm']] as const) expect(conditionOf(code)).toBe(condition)
  expect(parseCurrent(response(), now)?.condition).toBe('rain')
  expect(parseCurrent(response(4), now)).toBeNull()
  expect(parseCurrent({ ...response(), current: { ...response().current, temperature_2m: null } }, now)).toBeNull()
  expect(parseCurrent(response(), now + MAX_AGE_MS + 1)).toBeNull()
  expect(parseCurrent({ ...response(), current: { ...response().current, wind_speed_10m: NaN } }, now)).toBeNull()
  expect(parseCurrent({ error: true }, now)).toBeNull()
})

test('city choices and coordinate URLs keep valid, rounded locations', async () => {
  expect(location.latitude).toBe(51.51)
  expect(location.longitude).toBe(-0.13)
  expect(coordinates(91, 1)).toBeNull()
  expect(coordinates(1, Infinity)).toBeNull()
  expect(geocodingUrl('London, GB')).toContain('name=London&count=5')
  expect(geocodingUrl('London, GB')).toContain('countryCode=GB')
  expect(geocodingUrl('A&B')).toContain('name=A%26B')
  expect(forecastUrl(location)).toContain('latitude=51.51&longitude=-0.13')
  expect(parseLocations({ results: [
    { name: 'London', admin1: 'England', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278 },
    { name: 'Broken', latitude: '12', longitude: 0 }, { name: 'Broken', latitude: 100, longitude: 0 },
  ] })).toEqual([location])
})

test('refresh pacing, offline cache and old location responses stay bounded', async () => {
  const reading = parseCurrent(response(), now)!
  const active = { ...setLocation(emptyWeather(), location), current: reading, attemptedAt: now }
  expect(refreshDue(emptyWeather(), now)).toBe(false)
  expect(refreshDue(active, now + 59_999, true)).toBe(false)
  expect(refreshDue(active, now + 60_000, true)).toBe(true)
  expect(refreshDue(active, now + REFRESH_MS)).toBe(true)
  expect(refreshDue(active, now + REFRESH_MS - 1)).toBe(false)
  const offline = acceptWeather(active, locationKey(location), null, 'offline')
  expect(refreshDue(offline, now + RETRY_MS)).toBe(true)
  expect(liveWeather(offline, now + MAX_AGE_MS - 1)).toEqual(reading)
  expect(liveWeather(offline, now + MAX_AGE_MS + 1)).toBeNull()
  expect(weatherSummary(offline, now)).toContain('cached')
  expect(weatherSummary({ ...active, units: 'f' }, now)).toContain('50°F')
  const changed = setLocation(active, coordinates(0, 0)!)
  expect(acceptWeather(changed, locationKey(location), reading, null)).toBe(changed)
  expect(acceptWeather(emptyWeather(), locationKey(location), reading, null).current).toBeNull()
})

test('old saves get weather defaults and backups retain only checked weather', async () => {
  const home = newHome(now)
  const { weather: _weather, ...old } = home
  expect(migrate(old, now).weather).toEqual(emptyWeather())
  const saved = { ...home, weather: { ...setLocation(emptyWeather('f'), location), current: parseCurrent(response(), now), attemptedAt: now } }
  expect(migrate(JSON.parse(JSON.stringify(saved)), now).weather.current?.condition).toBe('rain')
  expect(migrate(saved, now).weather.units).toBe('f')
  expect(normalizeWeather({ location: { latitude: 100, longitude: 0, source: 'device' } }, now).location).toBeNull()
  expect(migrate(saved, now + MAX_AGE_MS + 1).weather.current).toBeNull()
})

test('every weather scene animates inside both pane widths and all themes', async () => {
  const scenes = new Set<string>()
  for (const [code, condition] of [[0, 'clear'], [2, 'partly-cloudy'], [3, 'cloudy'], [45, 'fog'], [51, 'drizzle'],
    [61, 'rain'], [71, 'snow'], [95, 'storm']] as const) {
    expect(WEATHER_SCENES[condition]).toBeDefined()
    for (const flavor of Object.values(FLAVORS)) for (const cols of [34, 56]) for (const tick of [0, 12, 40]) {
      const current = parseCurrent(response(code), now)!
      const home = { ...newHome(now), weather: { ...setLocation(emptyWeather(), location), current } }
      const cells = frameCells({ home, now, tick, hour: 12, flavor, cols })
      expect(cells.length).toBe(Math.ceil(cols * ROWS * 12 / 3) * 4)
      if (flavor.name === 'mocha' && cols === 56 && tick === 12) scenes.add(cells)
    }
  }
  expect(scenes.size).toBe(8)
})
