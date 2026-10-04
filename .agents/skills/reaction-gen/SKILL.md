---
name: reaction-gen
description: Add a Claude tool or turn reaction to Claude Idle Cat as one validated content file. Use when asked to generate or add this content kind.
---

# reaction-gen

## 1. Pin down the fields

One file per item in `hooks/content/reactions/<id>.ts`. Choose a unique lowercase kebab-case id and preserve saved ids. Read the schema and `reactionProblems()` in `hooks/content/progression.ts`.

Stop and ask if the request needs a new engine concept: pose, signal, spacing, counter, effect key, event kind, landmark, charm behavior or consumable behavior. Existing authorization for an engine change still applies.

## 2. Write from this canonical example

```ts
import { defineReaction } from '../types'

export default defineReaction({
  id: 'hiss-at-error', on: 'tool.error', move: 'hiss', line: 'Hiss! That tool needs another try.', odds: 0.7, cooldownSec: 30,
})
```

Choose an existing signal and move; optional tool/personality filters and line. Odds are 0–1; cooldown is 1–3600 seconds, tracked separately per cat. Reactions affect animation only, with an optional cosmetic effect and a quest counter.

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

Inspect a preview when one applies. Add the README row for new user-facing content. Mirror the complete skill byte-for-byte between `.claude/skills/reaction-gen/` and `.agents/skills/reaction-gen/`.

## 4. Commit

`feat(reactions): add the <label> reaction`. Include the passing checks and preview in the review summary. Commit the browser bundle with any imported content change.
