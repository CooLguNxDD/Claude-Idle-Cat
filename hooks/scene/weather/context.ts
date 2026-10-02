import type { WeatherReading } from '../../../types'
import type { PixelArt } from '../../art/types'
import type { Flavor } from '../../theme'
import type { SceneCanvas } from '../canvas'

export type WeatherScene = { c: SceneCanvas; weather: WeatherReading; tick: number; f: Flavor }
export type WeatherLayer = (scene: WeatherScene) => void
export const paint = (c: SceneCanvas, asset: PixelArt, x: number, y: number, color: number) => {
  asset.frames[0]?.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch !== '.') c.put(Math.round(x) + dx, Math.round(y) + dy, color)
  }))
}
export const drift = (weather: WeatherReading) => weather.windDegrees > 180 ? 1 : -1
export const wrap = (x: number, width: number) => ((x % width) + width) % width
