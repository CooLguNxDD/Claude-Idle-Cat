// Renders a content preview PNG to look at before committing: node tools/preview.mjs <breed|move|world|cat|interaction|furniture|trail|trail-event> <id> [--out <dir>]
// Breed: a row per flavor in every marking and silhouette. Move: one cycle, facing left then right.
// Trail: an expedition's beats mid-action, one row per flavor. Trail event: its loop stages on its first trail.
// World: manor yard in every flavor at noon and midnight in June, October and December. Cat: portraits in every flavor.
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
if (!['breed', 'move', 'world', 'cat', 'interaction', 'furniture', 'trail', 'trail-event'].includes(kind) || !id) {
  console.error('usage: node tools/preview.mjs <breed|move|world|cat|interaction|furniture|trail|trail-event> <id> [--out <dir>]')
  process.exit(1)
}

// The mod's modules are extensionless TypeScript, so bundle a tiny entry with esbuild and import that.
const entry = `
import { COATS, MARKINGS, SILHOUETTES } from './hooks/adoption/registry'
import { canvas } from './hooks/scene/canvas'
import { pen } from './hooks/scene/fine/draw'
import { drawHiCat } from './hooks/scene/hicat'
import { FLAVORS, FLAVOR_NAMES } from './hooks/theme'
import { MOVES, NAMED_CATS, WORLDS, INTERACTIONS, FURNITURE, EXPEDITIONS, TRAIL_EVENTS } from './hooks/content'
import { send } from './hooks/expeditions'
import { trailOf } from './hooks/trail'
import { runImage } from './hooks/scene/trail'
import { startPair, stepPair } from './hooks/pair'
import { motionCtxOf, startMotion, forceMove, stepMotion } from './hooks/motion'
import { seeded } from './hooks/rng'
import { newHome } from './hooks/game'
import { frameImage } from './hooks/scene'
export const ids = { breed: COATS, move: MOVES.map(m => m.id), world: WORLDS.map(w => w.id), cat: NAMED_CATS.map(c => c.id), interaction: INTERACTIONS.map(i => i.id), furniture: FURNITURE.map(i => i.id), trail: EXPEDITIONS.map(e => e.id), 'trail-event': TRAIL_EVENTS.map(e => e.id) }
export const furnishing = (id) => FLAVOR_NAMES.map(name => {
  const now = new Date(2026, 9, 5, 12).getTime(), item = FURNITURE.find(f => f.id === id)
  const home = { ...newHome(now), tier: 6, decor: { [item.slot]: id }, owned: [id] }
  return [frameImage({ home, now, tick: 0, hour: 12, flavor: FLAVORS[name], cols: 80 })]
})
export const pairing = (id) => {
  const i = INTERACTIONS.find(i => i.id === id), now = new Date(2026, 9, 5, 12).getTime()
  const home = newHome(now), cat = home.cats[0]
  home.cats.push({ ...cat, id: 'c2', name: 'Miso', genes: { ...cat.genes, coat: 'tuxedo' } })
  const ctx = motionCtxOf(home, 48, 12)
  let run = startPair(i, cat.id, 'c2', startMotion(32), ctx, seeded(7))
  return [Array.from({ length: 8 }, (_, frame) => {
    for (let n = 0; n < 8; n++) run = stepPair(run, ctx)
    return frameImage({ home, now, tick: frame * 8, hour: 12, flavor: FLAVORS.mocha, cols: 48, motion: run.lead, partner: { id: 'c2', motion: run.partner } })
  })]
}
// A sent party of three: every beat of the trail, or one event's stages, drawn mid-action.
// Sends on a day inside the trail's season so seasonal trails (Snow Trail) get a run.
const party = (exp) => {
  const month = EXPEDITIONS.find(e => e.id === exp)?.available?.months[0] ?? 10
  const now = new Date(2026, month - 1, 5, 12).getTime(), base = newHome(now), cat = base.cats[0]
  const coats = ['ginger', 'tuxedo', 'calico']
  const home = { ...base, tier: 5, coins: 1e6, owned: [...base.owned, 'harbor-map', 'star-map'], world: { id: exp === 'neon-rooftops' ? 'neon-alley' : base.world.id },
    cats: coats.map((coat, i) => ({ ...cat, id: "c" + (i + 1), name: ['Mochi', 'Miso', 'Tofu'][i], level: 25, genes: { ...cat.genes, coat } })) }
  const sent = send(home, exp, ['c1', 'c2', 'c3'], [], now, 7)
  return { home: sent, run: sent.expeditions.runs[0] }
}
export const trailing = (id) => {
  const { home, run } = party(id), trail = trailOf(run)
  return FLAVOR_NAMES.map(name => trail.beats.map((b, i) => runImage(home, run, trail, b.at + b.event.seconds * 600, i * 8, FLAVORS[name], 48, 4)))
}
export const eventing = (id) => {
  const event = TRAIL_EVENTS.find(e => e.id === id), exp = event.trails?.[0] ?? 'garden-patrol'
  const { home, run } = party(exp), base = trailOf(run)
  const trail = { ...base, beats: [{ event, at: run.startAt, until: run.endsAt, finds: { coins: 0, materials: {}, critters: [] } }] }
  return FLAVOR_NAMES.map(name => [0.15, 0.4, 0.6, 0.8, 0.92].map((t, i) => runImage(home, run, trail, run.startAt + event.seconds * 1000 * t, i * 5, FLAVORS[name], 48, 4)))
}
// A named cat's portrait at 8x, one flavor per column.
export const card = (id) => {
  const named = NAMED_CATS.find(c => c.id === id)
  return [FLAVOR_NAMES.map(name => {
    const f = FLAVORS[name]
    const c = canvas(24, 8)
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) c.put(x, y, f.base)
    drawHiCat(pen(c), 16, 24, { genes: { isShiny: false, ...named.genes }, mood: 'happy', form: null, isAdult: true,
      isBirthday: false, isBlink: false, tick: 0 }, f)
    return c.image(f.base)
  })]
}
// Summer, Halloween and Christmas, at noon and midnight in each flavor.
export const panorama = (id) => {
  const cols = WORLDS.find(w => w.id === id).width.manor
  return FLAVOR_NAMES.flatMap(name => [5, 9, 11].flatMap(month => [12, 0].map(hour => {
    const now = new Date(2026, month, 15, hour).getTime()
    const home = { ...newHome(now), tier: 2, world: { id } }
    return [frameImage({ home, now, tick: 0, hour, flavor: FLAVORS[name], cols })]
  })))
}
// One cycle of a move at 8x on the classic ginger cat in mocha, with its lift, facing left then right.
export const strip = (id) => {
  const move = MOVES.find(m => m.id === id)
  const f = FLAVORS.mocha
  if (move.seek === 'window' || move.seek === 'shelf') {
    const now = new Date(2026, 9, 5, 12).getTime(), home = { ...newHome(now), tier: 1 }
    const ctx = motionCtxOf(home, 48, 12), spot = ctx.landmarks.find(l => l.kind === move.seek), rng = seeded(7)
    let motion = forceMove(startMotion(spot.x), id, ctx, rng)
    for (let n = 0; n < 1000 && motion.stage === 'go'; n++) motion = stepMotion(motion, ctx, rng)
    return [-1, 1].map(facing => Array.from({ length: move.prop === 'cup' ? 16 : move.cycle }, (_, frame) => frameImage({
      home, now, tick: frame, hour: 12, flavor: f, cols: 48, camX: Math.floor(motion.x / 4) - 8,
      motion: { ...motion, frame, facing },
    })))
  }
  return [-1, 1].map(facing => Array.from({ length: move.cycle }, (_, at) => {
    const c = canvas(24, 8)
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) c.put(x, y, y >= 21 ? f.surface0 : f.base)
    drawHiCat(pen(c), 16, 24 + (move.lift?.[at] ?? 0), { genes: { coat: 'ginger', eyes: 'green', personality: 'lazy',
      isShiny: false }, mood: 'happy', form: null, isAdult: true, isBirthday: false, isBlink: false, tick: at,
      pose: { kind: move.pose, phase: at / move.cycle, facing: move.turn && Math.floor(at / move.turn) % 2 ? -facing : facing } }, f)
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
const { ids, sheet, strip, panorama, card, pairing, furnishing, trailing, eventing } = await import(pathToFileURL(bundle).href)
if (!ids[kind].includes(id)) {
  console.error(`no ${kind} ${id}; known: ${ids[kind].join(', ')}`)
  process.exit(1)
}

const rows = { breed: sheet, move: strip, world: panorama, cat: card, interaction: pairing, furniture: furnishing, trail: trailing, 'trail-event': eventing }[kind](id)
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
  move: 'rows: facing left, facing right; columns: cycle frames', world: 'rows: each flavor in June, October, December, at noon then midnight',
  cat: 'columns: latte, frappe, macchiato, mocha', interaction: 'columns: successive pair frames', furniture: 'rows: latte, frappe, macchiato, mocha',
  trail: 'rows: latte, frappe, macchiato, mocha; columns: every beat mid-loop', 'trail-event': 'rows: flavors; columns: approach, action, action, action, outcome' }
console.log(`wrote ${file} (${LEGEND[kind]})`)
