---
name: furniture-gen
description: Add a furnishing to Claude Idle Cat as one validated content file. Use when asked to generate or add this content kind.
---

# furniture-gen

## 1. Pin down the fields

One file per item in `hooks/content/furniture/<id>.ts`. Choose a unique lowercase kebab-case id and preserve saved ids. Read the schema and `furnitureProblems()` in `hooks/content/progression.ts`.

Stop and ask if the request needs a new engine concept: pose, signal, spacing, counter, effect key, event kind, landmark, charm behavior or consumable behavior. Existing authorization for an engine change still applies.

## 2. Write from this canonical example

```ts
import { defineFurniture } from '../types'

export default defineFurniture({
  id: 'map-table', name: 'Expedition map table', slot: 'toy', price: 0, minTier: 3, cost: { coins: 1200, materials: { 'pine-cone': 10 } },
  perk: '10% shorter expeditions', mods: { expTime: 0.9 }, bait: 5, art: { rows: ['pppppppp', 'pggppggp', 'pppppppp', '.p....p.'], colors: { p: 'peach', g: 'green' } },
})
```

Pick an existing slot. Whole price is nonnegative; bait 0–10; minTier 3–6. Cost may use known materials (whole amounts 1–1000). Numeric mod caps: coin/regen/eventRate/gift 1–2.5, joyDecay 0.5–1, expTime 0.8–1, bond/matOdds 1–1.5; autoFeed is boolean. Optional `bowl` stats belong only on `slot: 'bowl'`: whole cap 4–24, portion 10–60, joy and energy 0–15, xp 0–5. The ladder runs Basic 8/30, Ceramic 10/35, Automatic 10/30, Deluxe 12/35 joy +5, Golden 14/40 joy +5 xp +1, Royal 16/40 joy +5 energy +5, Ultimate 20/50 joy +10 energy +5 xp +3. `bowlCap` reads the placed bowl; a smaller bowl keeps overflow until it is eaten. Optional art uses rectangular semantic rows and theme-token colors. Create a matching Curio shop recipe via shop-gen for craftable furniture. Keep existing furniture imports in exact order; append the new one. Cost-gated furniture never enters Nyan stock.

## 3. Register, look and test

```bash
node tools/build-content.mjs
node tools/preview.mjs furniture <id> --out docs/previews
claude plugin validate .
npx -y -p typescript tsc -p .
npx -y -p typescript tsc -p web
claude plugin test .
node --test server/arcade.test.mjs
node tools/build-content.mjs --check
node --test tools/content.test.mjs
node tools/build-web.mjs
```

Inspect a preview when one applies. Add the README row for new user-facing content. Mirror the complete skill byte-for-byte between `.claude/skills/furniture-gen/` and `.agents/skills/furniture-gen/`.

## 4. Commit

`feat(furniture): add the <label> furniture`. Include the passing checks and preview in the review summary. Commit the browser bundle with any imported content change.
