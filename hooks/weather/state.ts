import type { WeatherLocation, WeatherReading, WeatherState } from '../../types'
import { CONDITIONS, finiteIn, parseCurrent } from './conditions'
import { coordinates, locationKey } from './location'

export const REFRESH_MS = 15 * 60_000
export const RETRY_MS = 5 * 60_000
export const MAX_AGE_MS = 3 * 3600_000
export const emptyWeather = (units: WeatherState['units'] = 'c'): WeatherState =>
  ({ location: null, units, current: null, attemptedAt: null, error: null, candidates: [], notice: null })
export const setLocation = (state: WeatherState, location: WeatherLocation): WeatherState =>
  ({ ...emptyWeather(state.units), location })
export const liveWeather = (state: WeatherState, now: number): WeatherReading | null =>
  state.location && state.current && now - state.current.observedAt <= MAX_AGE_MS
    && now >= state.current.fetchedAt - 60_000 ? state.current : null
export const refreshDue = (state: WeatherState, now: number, force = false) => !!state.location
  && (state.attemptedAt === null || now < state.attemptedAt
    || now - state.attemptedAt >= (force ? 60_000 : state.error ? RETRY_MS : REFRESH_MS))
export const acceptWeather = (state: WeatherState, expected: string, reading: WeatherReading | null, error: string | null): WeatherState =>
  locationKey(state.location) !== expected ? state : { ...state, current: reading ?? state.current, error }
export const temperature = (state: WeatherState, reading: WeatherReading) =>
  `${Math.round(state.units === 'f' ? reading.temperatureC * 9 / 5 + 32 : reading.temperatureC)}°${state.units.toUpperCase()}`
export const weatherSummary = (state: WeatherState, now: number): string => {
  if (!state.location) return 'Weather off · seasonal yard'
  const reading = liveWeather(state, now)
  if (!reading) return `${state.location.label} · ${state.error ? 'weather unavailable · seasonal yard'
    : state.current ? 'weather out of date · seasonal yard' : 'waiting for weather'}`
  const kind = CONDITIONS[reading.condition]
  const wind = state.units === 'f' ? `${Math.round(reading.windKph / 1.609344)} mph` : `${Math.round(reading.windKph)} km/h`
  return `${kind.icon} ${kind.label} · ${temperature(state, reading)} · wind ${wind}${state.error ? ' · cached' : ''}`
}
export const normalizeWeather = (data: unknown, now: number): WeatherState => {
  if (!data || typeof data !== 'object') return emptyWeather()
  const d = data as Partial<WeatherState>
  const out = emptyWeather(d.units === 'f' ? 'f' : 'c')
  const l = d.location
  if (!l || !['city', 'coordinates', 'device'].includes(l.source)) return out
  out.location = coordinates(l.latitude, l.longitude, l.source, typeof l.label === 'string' ? l.label : undefined)
  if (!out.location) return out
  const c = d.current
  if (c) {
    out.current = parseCurrent({ utc_offset_seconds: c.utcOffset, current: {
      weather_code: c.code, temperature_2m: c.temperatureC, wind_speed_10m: c.windKph,
      wind_direction_10m: c.windDegrees, cloud_cover: c.cloudPercent, precipitation: c.precipitationMm,
      is_day: c.isDay === true ? 1 : c.isDay === false ? 0 : null, time: c.observedAt / 1000,
    } }, now)
    if (out.current && finiteIn(c.fetchedAt, now - MAX_AGE_MS, now + 60_000)) out.current.fetchedAt = c.fetchedAt
    else out.current = null
  }
  out.attemptedAt = finiteIn(d.attemptedAt, now - MAX_AGE_MS, now + 60_000) ? d.attemptedAt : null
  out.error = typeof d.error === 'string' ? d.error.slice(0, 180) : null
  return out
}
