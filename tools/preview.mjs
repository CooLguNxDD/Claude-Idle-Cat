// Renders a content preview PNG to look at before committing: node tools/preview.mjs <breed|move|world|cat> <id> [--out <dir>]
// Breed: a row per flavor in every marking and silhouette. Move: one cycle, facing left then right.
// World: the whole manor-size yard in every flavor, at noon and at night.
import { execSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const [kind, id] = process.argv.slice(2)
const outAt = process.argv.indexOf('--out')
const out = resolve(outAt > 0 ? process.argv[outAt + 1] : join(tmpdir(), 'idle-cat-previews'))
if (!['breed', 'move', 'world'].includes(kind) || !id) {
  console.error('usage: node tools/preview.mjs <breed|move|world> <id> [--out <dir>]')
  process.exit(1)
}

// The mod's modules are extensionless TypeScript, so bundle a tiny entry with esbuild and import that.
const entry = `
import { COATS, MARKINGS, SILHOUETTES } from './hooks/adoption/registry'
import { canvas } from './hooks/scene/canvas'
import { pen } from './hooks/scene/fine/draw'
import { drawHiCat } from './hooks/scene/hicat'
import { FLAVORS, FLAVOR_NAMES } from './hooks/theme'
import { MOVES, WORLDS } from './hooks/content'
import { newHome } from './hooks/game'
import { frameImage } from './hooks/scene'
export const ids = { breed: COATS, move: MOVES.map(m => m.id), world: WORLDS.map(w => w.id) }
// The full manor yard as one wide pane, at noon and at midnight in each flavor.
export const panorama = (id) => {
  const home = { ...newHome(Date.UTC(2026, 5, 1)), tier: 2, world: { id } }
  const cols = WORLDS.find(w => w.id === id).width.manor
  return FLAVOR_NAMES.flatMap(name => [12, 0].map(hour => [frameImage({ home, now: home.lastTick, tick: 0, hour,
    flavor: FLAVORS[name], cols })]))
}
// One cycle of a move at 8x on the classic ginger cat in mocha, with its lift, facing left then right.
export const strip = (id) => {
  const move = MOVES.find(m => m.id === id)
  const f = FLAVORS.mocha
  return [-1, 1].map(facing => Array.from({ length: move.cycle }, (_, at) => {
    const c = canvas(24, 8)
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) c.put(x, y, y >= 21 ? f.surface0 : f.base)
    drawHiCat(pen(c), 16, 24 + (move.lift?.[at] ?? 0), { genes: { coat: 'ginger', eyes: 'green', personality: 'lazy',
      isShiny: false }, mood: 'happy', form: null, isAdult: true, isBirthday: false, isBlink: false, tick: at,
      pose: { kind: move.pose, phase: at / move.cycle, facing } }, f)
    return c.image(f.base)
  }))
}
export const sheet = (coat) => FLAVOR_NAMES.map(name => MARKINGS.flatMap(marking => SILHOUETTES.map(silhouette => {
  const c = canvas(24, 4)
  const f = FLAVORS[name]
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) c.put(x, y, f.base)
  drawHiCat(pen(c), 16, 24, { genes: { coat, eyes: 'green', personality: 'lazy', isShiny: false, marking, silhouette },
    mood: 'happy', form: null, isAdult: true, isBirthday: false, isBlink: false, tick: 0 }, f)
  return c.image(f.base)
})))
`
const dir = mkdtempSync(join(tmpdir(), 'idle-cat-preview-'))
const bundle = join(dir, 'preview.mjs')
execSync(`npx -y esbuild@0.25 --bundle --format=esm --platform=node --loader=ts --outfile=${JSON.stringify(bundle)}`,
  { cwd: root, input: entry, stdio: ['pipe', 'ignore', 'pipe'] })
const { ids, sheet, strip, panorama } = await import(pathToFileURL(bundle).href)
if (!ids[kind].includes(id)) {
  console.error(`no ${kind} ${id}; known: ${ids[kind].join(', ')}`)
  process.exit(1)
}

const rows = kind === 'breed' ? sheet(id) : kind === 'move' ? strip(id) : panorama(id)
const tile = rows[0][0]
const width = tile.width * rows[0].length
const height = tile.height * rows.length
const rgba = Buffer.alloc(width * height * 4)
rows.forEach((row, r) => row.forEach((img, i) => {
  const px = Buffer.from(img.rgba, 'base64')
  for (let y = 0; y < img.height; y++)
    px.copy(rgba, ((r * img.height + y) * width + i * img.width) * 4, y * img.width * 4, (y + 1) * img.width * 4)
}))

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = buf => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length)
  head.write(type, 4)
  const tail = Buffer.alloc(4)
  tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), data])))
  return Buffer.concat([head, data, tail])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(width)
ihdr.writeUInt32BE(height, 4)
ihdr.set([8, 6, 0, 0, 0], 8)
const raw = Buffer.alloc((width * 4 + 1) * height)
for (let y = 0; y < height; y++) rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0))])
mkdirSync(out, { recursive: true })
const file = join(out, `${kind}-${id}.png`)
writeFileSync(file, png)
const LEGEND = { breed: 'rows: latte, frappe, macchiato, mocha; columns: markings x silhouettes',
  move: 'rows: facing left, facing right; columns: cycle frames', world: 'rows: each flavor at noon, then midnight' }
console.log(`wrote ${file} (${LEGEND[kind]})`)
