import { expect, test } from 'claude-code/testing'

import type { Genes } from '../../types'
import { seeded } from '../rng'
import { FLAVORS } from '../theme'
import { STEP, frame, toRows } from './engine'
import { NO_MODS } from './game'
import type { Input } from './game'
import { GAMES } from './games'

// A calico shiny exercises the busiest coat painter.
const GENES: Genes = { coat: 'calico', eyes: 'odd', personality: 'curious', isShiny: true }
const KEYS = [' ', 'up', 'down', 'left', 'right', '1', '2', '3', '5', '9', 'b', 'space']

test('every game survives random input at the narrowest and widest pane', async () => {
  for (const game of GAMES) {
    for (const w of [34, 56]) {
      const rng = seeded(w)
      let s = game.init(42, { hunter: 3, cuddler: 3, dreamer: 3 }, w, 32)
      const f = frame(w, 32)
      for (let i = 0; i < 20 * 60 && !game.isOver(s); i++) {
        const r = rng()
        const input: Input[] = r < 0.05 ? [{ kind: 'key', key: KEYS[Math.floor(rng() * KEYS.length)] ?? ' ' }]
          : r < 0.1 ? [{ kind: 'down', x: rng() * w, y: rng() * 32 }] : []
        s = game.step(s, STEP, input)
        if (i % 20 === 0) {
          game.draw(s, f, { f: FLAVORS.mocha, genes: GENES, tick: i })
          expect(toRows(f).length).toBe(16)
        }
      }
      expect(game.score(s)).toBeLessThanOrEqual(game.maxScore(20_000))
      expect(game.init(1, NO_MODS, w, 32)).toBeDefined()
    }
  }
  expect(GAMES.map(g => g.id)).toEqual(['dash', 'catch', 'laser', 'whack', 'tank', 'lanes'])
})
