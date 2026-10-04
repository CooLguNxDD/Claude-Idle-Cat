---
name: material-gen
description: Add an expedition material to Claude Idle Cat as one validated content file. Use when asked to generate or add this content kind.
---

# material-gen

## 1. Pin down the fields

One file per item in `hooks/content/materials/<id>.ts`. Choose a unique lowercase kebab-case id and preserve saved ids. Read the schema and `materialProblems()` in `hooks/content/progression.ts`.

Stop and ask if the request needs a new engine concept: pose, signal, spacing, counter, effect key, event kind, landmark, charm behavior or consumable behavior. Existing authorization for an engine change still applies.

## 2. Write from this canonical example

```ts
import { defineMaterial } from '../types'

export default defineMaterial({
  id: 'feather', name: 'Feather', rarity: 'common', glyph: 'f',
})
```

Use a unique kebab-case id, nonempty name, rarity common/uncommon/rare/epic/legendary, glyph 1–4 characters. Add its weights to an expedition to make it obtainable. Saves use Home.materials; crafting costs must reference registered ids.

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

Inspect a preview when one applies. Add the README row for new user-facing content. Mirror the complete skill byte-for-byte between `.claude/skills/material-gen/` and `.agents/skills/material-gen/`.

## 4. Commit

`feat(materials): add the <label> material`. Include the passing checks and preview in the review summary. Commit the browser bundle with any imported content change.
