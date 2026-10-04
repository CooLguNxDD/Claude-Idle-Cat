---
name: event-gen
description: Add a seasonal event to Claude Idle Cat as one validated content file. Use when asked to generate or add this content kind.
---

# event-gen

## 1. Pin down the fields

One file per item in `hooks/content/events/<id>.ts`. Choose a unique lowercase kebab-case id and preserve saved ids. Read the schema and `eventProblems()` in `hooks/content/progression.ts`.

Stop and ask if the request needs a new engine concept: pose, signal, spacing, counter, effect key, event kind, landmark, charm behavior or consumable behavior. Existing authorization for an engine change still applies.

## 2. Write from this canonical example

```ts
import { defineEvent } from '../types'

export default defineEvent({
  id: 'harvest-weekend', label: 'Harvest weekend', kind: 'boost', available: { months: [10, 11] }, weekdays: [0, 6], materials: 1.5,
})
```

Choose exchange or boost; months are 1–12 and optional weekdays 0–6. Boost materials is 1–1.5; exchange bond is 1–5. Exchanges are once per unordered household pair per day or once per visitor per day. Expedition boosts apply at departure.

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

Inspect a preview when one applies. Add the README row for new user-facing content. Mirror the complete skill byte-for-byte between `.claude/skills/event-gen/` and `.agents/skills/event-gen/`.

## 4. Commit

`feat(events): add the <label> event`. Include the passing checks and preview in the review summary. Commit the browser bundle with any imported content change.
