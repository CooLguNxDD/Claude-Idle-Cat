import type { WeatherLocation } from '../../types'
import { finiteIn } from './conditions'

export const validCoordinates = (latitude: unknown, longitude: unknown): boolean =>
  finiteIn(latitude, -90, 90) && finiteIn(longitude, -180, 180)
export const coordinates = (latitude: number, longitude: number, source: WeatherLocation['source'] = 'coordinates',
  label?: string): WeatherLocation | null => {
  if (!validCoordinates(latitude, longitude)) return null
  const lat = Math.round(latitude * 100) / 100
  const lon = Math.round(longitude * 100) / 100
  return { latitude: lat, longitude: lon, source,
    label: label?.slice(0, 120) || `${source === 'device' ? 'Device' : 'Location'} ${lat.toFixed(2)}, ${lon.toFixed(2)}` }
}
export const locationKey = (location: WeatherLocation | null) =>
  location ? `${location.source}:${location.latitude}:${location.longitude}:${location.label}` : ''
export const geocodingUrl = (query: string) => {
  const match = /^(.*),\s*([a-z]{2})$/i.exec(query.trim())
  const name = match?.[1]?.trim() ?? query.trim()
  return `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`
    + (match ? `&countryCode=${match[2]!.toUpperCase()}` : '')
}
export const parseLocations = (data: unknown): WeatherLocation[] => {
  if (!data || typeof data !== 'object') return []
  const results = (data as { results?: unknown }).results
  if (!Array.isArray(results)) return []
  const locations: WeatherLocation[] = []
  for (const row of results.slice(0, 5)) {
    if (!row || typeof row !== 'object' || typeof row.name !== 'string') continue
    const parts = [row.name, row.admin1, row.country].filter(x => typeof x === 'string' && x.length)
    const location = coordinates(row.latitude, row.longitude, 'city', [...new Set(parts)].join(', '))
    if (location && !locations.some(l => locationKey(l) === locationKey(location))) locations.push(location)
  }
  return locations
}
export const forecastUrl = (location: WeatherLocation) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}`
  + '&current=temperature_2m,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m'
  + '&temperature_unit=celsius&wind_speed_unit=kmh&timeformat=unixtime&timezone=auto&forecast_days=1'
export const locationUrl = (port: number, token: string) => `http://localhost:${port}/location?t=${encodeURIComponent(token)}`
