---
name: move-gen
description: Add a new move preset (an animation the active cat plays in the yard) to Claude Idle Cat as one data file. Use when asked for a new cat move, animation, behaviour or idle action.
---

# move-gen: add a cat move preset

A move is one file in `hooks/content/moves/<id>.ts`. The planner in `hooks/motion.ts` picks moves by weight, so a new file is the whole change. Do not edit `motion.ts`, `register.tsx` or the renderers for a new move.

## 1. Pin down the move

From the request, decide:

- **id**: lowercase kebab-case, unique among `hooks/content/moves/*.ts`.
- **pose**: one of `sit`, `walk`, `run`, `loaf`, `sleep`, `groom`, `stretch`, `crouch`, `knead`, `spin`, `arch` (see `POSE_KINDS` in `hooks/content/types.ts`). Pick the closest; a pose the renderers lack is a code change, so ask before adding one.
- **feel**: travel speed, bounce, how long it lasts, when it happens.

## 2. Write the file

```ts
import { defineMove } from '../types'

export default defineMove({
  id: 'prowl', label: 'Prowl', pose: 'crouch', cycle: 8, speed: 0.5,
  lift: [0, 0, 0, 0, 0, 0, 0, 0],           // optional: one design-unit y offset per cycle frame; negative is up
  seconds: [3, 6],
  when: { moods: ['ok', 'happy'], personality: { curious: 2.5 }, hours: [18, 6], weight: 1.5 },
  next: ['pounce', 'sit'],                   // optional: moves that may follow
  seek: 'tower',                             // optional: walk to a landmark, then perch on it or run through it
})
```

Stop and ask if the request needs a new engine concept: pose, signal, spacing, counter, effect key, event kind or landmark. Existing authorization for an engine change still applies.

Rules, which `moveProblems` checks:

- `cycle` is 1 to 32 frames at 8 fps; `lift` needs exactly `cycle` values between -12 and 4.
- `speed` is 0 to 8 design units a frame (4 units = 1 scene pixel; walk is 1, zoomies 4). A `seek` move needs a speed.
- `seconds` is `[min, max]` with `0 < min <= max <= 120`. For a moving move it caps the trip; for a perch it is the time on top.
- `when.moods` uses `happy`, `ok`, `grumpy`, `sleeping`. No moods means any waking mood; only a move that lists `sleeping` runs during a nap.
- `when.personality` multiplies `weight` for `lazy`, `playful`, `greedy`, `shy`, `cuddly`, `curious`.
- `when.hours` is `[from, to]` in local hours and may wrap past midnight (`[18, 6]`).
- `isScripted: true` excludes the move from random planning; reactions and interactions use `forceMove`. `turn` flips facing every 1–cycle frames. `prop: 'cup'` requires `seek: 'shelf'`.
- `next` names existing move ids only. `seek` is `tower`, `tunnel`, `pipe`, `window` or `shelf` (perch heights live in `LANDMARK_PERCH`).
- Hunger below 50 sends any `walk`-pose move to the bowl, and energy below 40 sends it to the bed. Keep that in mind when naming a walk.

## 3. Register, look, test

```bash
node tools/build-content.mjs                      # appends the move to hooks/content/index.ts
node tools/preview.mjs move <id> --out <scratch>  # one cycle at 8x, facing left then right
```

Open the PNG and look at it. If the lift looks wrong or the pose reads badly, adjust and re-render.

Then run the repo checks from `CLAUDE.md`:

```bash
claude plugin validate .
npx -y -p typescript tsc -p .
npx -y -p typescript tsc -p web
claude plugin test .              # motion.test.ts checks every move is valid and reachable
node --test server/arcade.test.mjs
node tools/build-content.mjs --check
node --test tools/content.test.mjs # checks generator mirrors and registry ordering
node tools/build-web.mjs          # moves ride in the arcade bundle through the content barrel; commit server/public/arcade.js
```

`motion.test.ts` asserts the planner can reach every non-scripted move across moods, personalities and hours. If your move is unreachable, widen `when` rather than editing the test.

## 4. Commit

One commit, Conventional Commits with a scope: `feat(moves): add the <label> move`. Mention the preview you checked in the PR or reply.
