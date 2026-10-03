---
name: world-gen
description: Add a new world (a themed yard the cats live in, with width per house tier, parallax layers, furniture slots and landmarks) to Claude Idle Cat as one data file. Use when asked for a new world, map, yard, level or scene theme.
---

# world-gen: add a world

A world is one file in `hooks/content/worlds/<id>.ts`. The scene draws the sky on the pane and everything else on a world-wide canvas scrolled by the camera, so a new file is the whole change. Players switch with `/cat world <id>`.

## 1. Pin down the world

- **id** (lowercase kebab-case) and **label**.
- **theme**: pick far layers from the kinds that exist: `hills`, `trees`, `rooftops` (`LAYER_KINDS`). A new layer kind means a new drawer in `hooks/scene/layers.ts`; do that only if the theme truly needs it, keep it pen-only (design units) so it renders at every scale, and add it to `LayerKind`.
- **landmarks**: `tower`, `tunnel`, `pipe` (`LANDMARK_KINDS`). Widths in scene columns are in `LANDMARK_WIDTH` (12, 22, 16).

## 2. Write the file

```ts
import { defineWorld } from '../types'

export default defineWorld({
  id: 'rooftops', label: 'Rooftops',
  width: { cottage: 72, house: 144, manor: 216 },          // scene columns per tier; 56 to 320, never shrinking
  layers: [
    { kind: 'rooftops', parallax: 0.35, tint: { mix: ['overlay0', 'crust', 0.4] } },
  ],
  slots: { bed: 0, rug: 5, plant: 24, toy: 34, hanging: 44, bowl: 54 },   // all within cottage width - 14
  landmarks: [{ kind: 'pipe', x: 90, tier: 1 }, { kind: 'tower', x: 160, tier: 2 }],
  perches: [24, 31, 38, 45, 52],                            // fence spots for other cats and strays, inside the cottage
})
```

Rules, which `worldProblems` checks:

- `parallax` is 0 (fixed) to below 1 (moves almost with the yard). Far things are small numbers.
- `tint` is a shade: a Catppuccin token (`rosewater flamingo pink mauve red maroon peach yellow green teal sky sapphire blue lavender text subtext1 subtext0 overlay2 overlay1 overlay0 surface2 surface1 surface0 base mantle crust`), `light`, `ink`, or `{ mix: [a, b, t] }` with `t` from 0 to 1. Never a hex colour: shades follow all four flavors.
- Every furniture slot sits inside the cottage; a landmark's `x + width` fits the yard of its `tier`; landmarks don't overlap.
- The cat walks to the bowl at `slots.bowl - 14` and naps at `slots.bed`, so leave room left of the bowl.

## 3. Register, look, test

```bash
node tools/build-content.mjs
node tools/preview.mjs world <id> --out <scratch>   # the whole manor yard, every flavor at noon and midnight
```

Open the PNG. Check the layers read as distance, the landmarks sit on the ground, and nothing clashes in latte (light) or mocha (dark).

Then the checks from `CLAUDE.md` (`claude plugin validate .`, both `tsc` runs, `claude plugin test .`, `node --test server/arcade.test.mjs`, `node tools/build-content.mjs --check`) and `node tools/build-web.mjs`, committing `server/public/arcade.js` if it changed. `world.test.ts` validates every world file.

## 4. Commit

`feat(worlds): add the <label> world`. A world is content, not a command, so no README row is needed; mention it can be picked with `/cat world <id>`.
