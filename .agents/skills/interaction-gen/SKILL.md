---
name: interaction-gen
description: Add a two-cat activity to Claude Idle Cat as one validated content file. Use when asked to generate or add this content kind.
---

# interaction-gen

## 1. Pin down the fields

One file per item in `hooks/content/interactions/<id>.ts`. Choose a unique lowercase kebab-case id and preserve saved ids. Read the schema and `interactionProblems()` in `hooks/content/progression.ts`.

Stop and ask if the request needs a new engine concept: pose, signal, spacing, counter, effect key, event kind, landmark, charm behavior or consumable behavior. Existing authorization for an engine change still applies.

## 2. Write from this canonical example

```ts
import { defineInteraction } from '../types'

export default defineInteraction({
  id: 'nose-boop', label: 'Nose boop', roles: { lead: 'sit', partner: 'sit' }, spacing: 'touch', seconds: 6,
  when: { minBond: 0, moods: ['ok', 'happy'], weight: 1 }, bond: 2, line: 'A tiny nose boop.',
})
```

Choose two registered role moves and spacing touch, face, chase or pile. Seconds are 2–120; minBond is 0–400 points; weight 0–10; bond gain 0–5. Moods and personality pairs can filter. Daily bonds cap at 10 points. Away cats are excluded.

## 3. Register, look and test

```bash
node tools/build-content.mjs
node tools/preview.mjs interaction <id> --out docs/previews
claude plugin validate .
npx -y -p typescript tsc -p .
npx -y -p typescript tsc -p web
claude plugin test .
node --test server/arcade.test.mjs
node tools/build-content.mjs --check
node --test tools/content.test.mjs
node tools/build-web.mjs
```

Inspect a preview when one applies. Add the README row for new user-facing content. Mirror the complete skill byte-for-byte between `.claude/skills/interaction-gen/` and `.agents/skills/interaction-gen/`.

## 4. Commit

`feat(interactions): add the <label> interaction`. Include the passing checks and preview in the review summary. Commit the browser bundle with any imported content change.
