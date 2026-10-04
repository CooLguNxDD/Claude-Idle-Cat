---
name: shop-gen
description: Add a Curio or Miles shop item to Claude Idle Cat as one validated content file. Use when asked to generate or add this content kind.
---

# shop-gen

## 1. Pin down the fields

One file per item in `hooks/content/shop/<id>.ts`. Choose a unique lowercase kebab-case id and preserve saved ids. Read the schema and `shopProblems()` in `hooks/content/progression.ts`.

Stop and ask if the request needs a new engine concept: pose, signal, spacing, counter, effect key, event kind, landmark, charm behavior or consumable behavior. Existing authorization for an engine change still applies.

## 2. Write from this canonical example

```ts
import { defineShop } from '../types'

export default defineShop({
  id: 'trail-snacks', name: 'Trail snacks', text: '20% shorter trip', shop: 'curio', kind: 'gear', grants: 'trail-snacks',
  cost: { coins: 40, materials: { 'pine-cone': 2 } }, unlock: { tier: 0 }, mods: { expTime: 0.8 },
})
```

Choose miles or curio and kind furniture, charm, map, gear or consumable. Costs are nonnegative whole coins/miles and known materials (1–1000). Furniture grants must name an existing furniture id; maps/charms grant their own permanent id. Gear grants its inventory id and has expTime 0.8–1, matRolls 0–1, rareOdds 0–0.1, loot 1–1.5. Use existing unlock fields: tier, level, achievement, expedition, item, world. Achievement ids must exist. `unlock.item` names a map’s permanent `grants` token, which may differ from its listing id; `unlock.world` requires that world to be the current yard. Miles listings require only a positive miles cost (no coins or materials). For charms and consumables use an existing engine behavior; a novel effect needs an engine change.

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

Inspect a preview when one applies. Add the README row for new user-facing content. Mirror the complete skill byte-for-byte between `.claude/skills/shop-gen/` and `.agents/skills/shop-gen/`.

## 4. Commit

`feat(shop): add the <label> shop`. Include the passing checks and preview in the review summary. Commit the browser bundle with any imported content change.
