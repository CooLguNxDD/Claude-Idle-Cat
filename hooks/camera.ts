// The pane's window onto a yard wider than itself, in whole scene columns.
export type Camera = { x: number; manualUntil: number }

export const FOLLOW_AFTER = 80

export const clampCam = (x: number, worldCols: number, paneCols: number) =>
  Math.max(0, Math.min(Math.max(0, worldCols - paneCols), Math.round(x)))

/** Keeps the cat inside the middle third of the pane, unless a manual pan is still holding the view. */
export const followCam = (cam: Camera, catCol: number, catWidth: number, worldCols: number, paneCols: number, frame: number): Camera => {
  if (frame < cam.manualUntil) return { ...cam, x: clampCam(cam.x, worldCols, paneCols) }
  const left = cam.x + Math.floor(paneCols / 3)
  const right = cam.x + Math.ceil((paneCols * 2) / 3) - catWidth
  const x = catCol < left ? cam.x - (left - catCol) : catCol > right ? cam.x + (catCol - right) : cam.x
  return { ...cam, x: clampCam(x, worldCols, paneCols) }
}

/** Pans by half a pane in `dir`; following resumes FOLLOW_AFTER frames later. */
export const panCam = (cam: Camera, dir: -1 | 1, worldCols: number, paneCols: number, frame: number): Camera =>
  ({ x: clampCam(cam.x + dir * Math.floor(paneCols / 2), worldCols, paneCols), manualUntil: frame + FOLLOW_AFTER })
