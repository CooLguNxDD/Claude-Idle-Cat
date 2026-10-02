import type { WeatherCondition, WeatherReading } from '../../types'

export const CONDITIONS: Record<WeatherCondition, { label: string; icon: string }> = {
  clear: { label: 'Clear', icon: '☀' }, 'partly-cloudy': { label: 'Partly cloudy', icon: '⛅' },
  cloudy: { label: 'Overcast', icon: '☁' }, fog: { label: 'Fog', icon: '≋' },
  drizzle: { label: 'Drizzle', icon: '☂' }, rain: { label: 'Rain', icon: '☂' },
  snow: { label: 'Snow', icon: '❄' }, storm: { label: 'Thunderstorm', icon: 'ϟ' },
}
const CODES: Record<number, WeatherCondition> = {
  0: 'clear', 1: 'partly-cloudy', 2: 'partly-cloudy', 3: 'cloudy', 45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 56: 'drizzle', 57: 'drizzle',
  61: 'rain', 63: 'rain', 65: 'rain', 66: 'rain', 67: 'rain', 80: 'rain', 81: 'rain', 82: 'rain',
  71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow', 85: 'snow', 86: 'snow', 95: 'storm', 96: 'storm', 99: 'storm',
}
export const conditionOf = (code: number): WeatherCondition | undefined => CODES[code]
export const finiteIn = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max

export const parseCurrent = (data: unknown, now: number): WeatherReading | null => {
  if (!data || typeof data !== 'object') return null
  const d = data as { current?: Record<string, unknown>; utc_offset_seconds?: unknown }
  const c = d.current
  if (!c || !finiteIn(c.weather_code, 0, 99) || !Number.isInteger(c.weather_code)) return null
  const condition = conditionOf(c.weather_code)
  if (!condition || !finiteIn(c.temperature_2m, -100, 70) || !finiteIn(c.wind_speed_10m, 0, 500)
    || !finiteIn(c.wind_direction_10m, 0, 360) || !finiteIn(c.cloud_cover, 0, 100)
    || !finiteIn(c.precipitation, 0, 1000) || (c.is_day !== 0 && c.is_day !== 1)
    || !finiteIn(c.time, (now - 3 * 3600_000) / 1000, (now + 15 * 60_000) / 1000)
    || !finiteIn(d.utc_offset_seconds, -14 * 3600, 14 * 3600)) return null
  return { code: c.weather_code, condition, temperatureC: c.temperature_2m, windKph: c.wind_speed_10m,
    windDegrees: c.wind_direction_10m, cloudPercent: c.cloud_cover, precipitationMm: c.precipitation,
    isDay: c.is_day === 1, observedAt: c.time * 1000, fetchedAt: now, utcOffset: d.utc_offset_seconds }
}
