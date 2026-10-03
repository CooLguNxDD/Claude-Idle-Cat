---
name: expedition-gen
description: Add an expedition trail to Claude Idle Cat as one validated content file. Use when asked to generate or add this content kind.
---

# expedition-gen

## 1. Pin down the fields

One file per item in `hooks/content/expeditions/<id>.ts`. Choose a unique lowercase kebab-case id and preserve saved ids. Read the schema and `expeditionProblems()` in `hooks/content/progression.ts`.

Stop and ask if the request needs a new engine concept: pose, signal, spacing, counter, effect key, event kind, landmark, charm behavior or consumable behavior. Existing authorization for an engine change still applies.

## 2. Write from this canonical example

```ts
import { defineExpedition } from '../types'

export default defineExpedition({
  id: 'garden-patrol', label: 'Garden Patrol', blurb: 'Follow fluttering feathers along the garden fence.',
  minutes: 15, party: [1, 3], minLevel: 1, cost: { coins: 10, energy: 10 },
  loot: { coins: [5, 15], materials: { feather: 6, 'pine-cone': 3 }, rolls: [1, 2], critters: 0.4, },
  likes: { curious: 1.3, playful: 1.2 }, xp: 40, bond: 3,
})
```

Minutes are 10–720; parties contain 1–3 cats before skills; minLevel is 1–25. Cost: coins 0–10000, energy 0–100 per cat. Loot coins are coin-rate minutes, each at most 240 (4 hours); material rolls 1–8 per cat, material weights 0.1–10. Critter odds 0–1, optionally filtered by `critterKinds` bug/fish/mouse; rare odds at most 0.1, naming a furniture id. XP at most 200; bond at most 5. Personality multipliers 1–1.5. Use existing materials and unlock ids. Wall-clock completion waits for claim. Loot and event boosts freeze at departure.

## 3. Register, look and test

```bash
node tools/build-content.mjs
claude plugin validate .
npx -y -p typescript tsc -p .
npx -y -p typescript tsc -p web
claude plugin test .
node --test server/arcade.test.mjs
node tools/build-content.mjs --check
node --test tools/content.test.mjs
node tools/build-web.mjs
```

Inspect a preview when one applies. Add the README row for new user-facing content. Mirror the complete skill byte-for-byte between `.claude/skills/expedition-gen/` and `.agents/skills/expedition-gen/`.

## 4. Commit

`feat(expeditions): add the <label> expedition`. Include the passing checks and preview in the review summary. Commit the browser bundle with any imported content change.
