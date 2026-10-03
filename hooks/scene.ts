import type { Home } from '../types'
import type { Flavor } from './theme'
import { ROWS, canvas, sceneCols, view } from './scene/canvas'
import type { RgbaImage, SceneCanvas } from './scene/canvas'
import { drawCats } from './scene/cats'
import { drawDecor } from './scene/decor'
import { drawEffects } from './scene/effects'
import { drawYard } from './scene/yard'
import { drawSeason } from './scene/season'
import { drawWeatherLayer } from './scene/weather'
import { liveWeather } from './weather/state'
import { inkOf, mix } from './theme'
import type { Motion } from './motion'
import { clampCam } from './camera'
import { landmarksOf, worldCols, worldOf } from './world'
import { drawLayers } from './scene/layers'
import { drawLandmarks } from './scene/landmarks'

export { ROWS, sceneCols }
export type { RgbaImage }
export type SceneInput = { home: Home; now: number; tick: number; hour: number; flavor: Flavor; cols: number; scale?: number
  motion?: Motion; camX?: number }
// Device pixels per scene pixel in the picture: every asset is a spec, so changing this re-renders all of it.
export const PICTURE_SCALE = 4

/** The yard's width in scene columns for this household, never narrower than the pane. */
export const yardCols = (home: Home, cols: number) => worldCols(worldOf(home), home.tier, cols)

// Sky, season and rain stay on the pane; the fence, furniture, landmarks and cats scroll with the camera.
export const drawScene = ({ home, now, tick, hour, flavor, cols, scale, motion, camX }: SceneInput): SceneCanvas => {
  const c = canvas(cols, scale)
  const world = worldOf(home)
  const wide = yardCols(home, cols)
  const cam = clampCam(camX ?? 0, wide, cols)
  const yard = view(c, wide, cam)
  const weather = liveWeather(home.weather, now)
  const localHour = weather ? new Date(now + weather.utcOffset * 1000).getUTCHours() : hour
  const state = drawYard(c, now, localHour, tick, flavor, weather, yard,
    isNight => drawLayers(c, world, wide, cam, isNight, flavor), world.scene)
  drawLandmarks(yard, landmarksOf(world, home.tier), flavor, tick, world.scene)
  if (weather) drawWeatherLayer({ c: yard, weather, tick, f: flavor }, 'ground')
  drawDecor(yard, home, now, tick, flavor, state)
  const cat = drawCats(yard, home, now, tick, flavor, motion)
  drawSeason(c, state, tick, flavor, weather)
  if (weather) drawWeatherLayer({ c, weather, tick, f: flavor }, 'front')
  drawEffects(c, home, now, tick, flavor, { ...cat, ox: cat.ox - cam })
  if (wide > cols) drawMinimap(c, home, wide, cam, cat.ox, flavor)
  return c
}

// A one-pixel strip along the top: the yard squeezed to the pane, the visible window lit, landmarks and the cat marked.
const drawMinimap = (c: SceneCanvas, home: Home, wide: number, cam: number, catCol: number, f: Flavor) => {
  const span = c.w - 4
  const at = (col: number) => 2 + Math.max(0, Math.min(span - 1, Math.floor((col / wide) * span)))
  for (let x = 2; x < 2 + span; x++) c.put(x, 0, mix(f.crust, f.surface1, 0.5))
  for (let x = at(cam); x <= at(cam + c.w - 1); x++) c.put(x, 0, f.overlay1)
  for (const l of landmarksOf(worldOf(home), home.tier)) c.put(at(l.x + l.w / 2), 0, f.mauve)
  c.put(at(catCol + 7), 0, f.yellow)
}

export const frameCells = (input: SceneInput): string => drawScene(input).pack()
export const frameImage = (input: SceneInput): RgbaImage =>
  drawScene({ ...input, scale: input.scale ?? PICTURE_SCALE }).image(inkOf(input.flavor))
