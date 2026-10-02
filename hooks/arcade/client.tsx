// The arcade's surface module: runs a game on the drawing thread at ~30 fps and posts the score back.
import type { ClientModule } from 'claude-code'
import type { Genes } from '../../types'
import { FLAVORS, css } from '../theme'
import type { FlavorName } from '../theme'
import { STEP, STEPS_PER_TICK, TICK_MS, frame, offset, shakeOffset, toRows } from './engine'
import type { Shake } from './engine'
import type { GameMods, Input } from './game'
import { gameOf } from './games'
import { medalOf } from './medals'

export type ArcadeProps = {
  game: string; seed: number; mods: GameMods; flavor: FlavorName; genes: Genes; best: number; cols: number; rows: number
}
type Live = { s: any; queue: Input[]; ms: number; tick: number; overMs: number; isPosted: boolean }
type ArcadeState = { live: Live; frames: number }

// The round's end freezes for a beat (hit-stop) before the score is sent.
const OVER_HOLD_MS = 1200
const MAX_QUEUE = 32

const Arcade: ClientModule<ArcadeProps, ArcadeState> = (props, surface) => {
  const { Box, Text } = surface.elements
  const game = gameOf(props.game)
  const fl = FLAVORS[props.flavor] ?? FLAVORS.mocha
  if (!game) return <Text color={css(fl.red)}>That game is not in the arcade.</Text>
  const width = props.cols
  const height = props.rows * 2

  if (!surface.state) {
    const live: Live = { s: game.init(props.seed, props.mods, width, height), queue: [], ms: 0, tick: 0, overMs: 0, isPosted: false }
    const push = (input: Input) => { if (live.queue.length < MAX_QUEUE) live.queue.push(input) }
    surface.onKey(e => {
      if (e.key === 'q' && !live.isPosted) {
        live.isPosted = true
        surface.post({ kind: 'quit', game: game.id })
        return
      }
      push({ kind: 'key', key: e.key })
    })
    // Pointer cells become canvas pixels: two pixel rows per cell, the sub-cell position where known.
    surface.onPointer(e => {
      if (e.type === 'enter' || e.type === 'leave') return
      push({ kind: e.type, x: e.fine?.x ?? e.x + 0.5, y: Math.floor((e.fine?.y ?? e.y + 0.25) * 2) })
    })
    surface.every(TICK_MS, () => {
      const isOver = game.isOver(live.s)
      for (let k = 0; k < STEPS_PER_TICK; k++) live.s = game.step(live.s, STEP, k === 0 && !isOver ? live.queue : [])
      live.queue = []
      live.tick++
      if (!isOver) live.ms += TICK_MS
      else if (!live.isPosted) {
        live.overMs += TICK_MS
        if (live.overMs >= OVER_HOLD_MS) {
          live.isPosted = true
          surface.post({ kind: 'result', game: game.id, score: game.score(live.s), ms: live.ms })
        }
      }
      surface.setState({ live, frames: live.tick })
    })
    surface.setState({ live, frames: 0 })
  }

  const live = surface.state?.live
  if (!live) return <Text color={css(fl.subtext0)}>Loading {game.name}…</Text>
  let f = frame(width, height)
  game.draw(live.s, f, { f: fl, genes: props.genes, tick: live.tick })
  const quake = (live.s as { shake?: Shake }).shake
  if (quake) {
    const d = shakeOffset(quake, live.tick)
    f = offset(f, d.x, d.y, fl.base)
  }
  const score = game.score(live.s)
  const left = Math.max(0, Math.ceil(game.seconds - live.ms / 1000))
  const medal = medalOf(game, score)
  const hud = game.isOver(live.s)
    ? `Round over · ${score} pts${medal ? ` · ${medal} medal!` : ''}${score > props.best ? ' · new best!' : ''}`
    : `${game.name} · ${score} pts · ${left}s · best ${props.best}`

  return (
    <Box flexDirection="column">
      {toRows(f).map(runs => (
        <Text>{runs.map(r => <Text color={css(r.fg)} backgroundColor={css(r.bg)}>{r.text}</Text>)}</Text>
      ))}
      <Text color={css(fl.yellow)}>{hud}</Text>
      <Text color={css(fl.overlay1)}>{game.controls} · click the game first · q quits</Text>
    </Box>
  )
}

export default Arcade
