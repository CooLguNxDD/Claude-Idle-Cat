---
name: quest-gen
description: Add a daily quest chain to Claude Idle Cat as one validated content file. Use when asked to generate or add this content kind.
---

# quest-gen

## 1. Pin down the fields

One file per item in `hooks/content/quests/<id>.ts`. Choose a unique lowercase kebab-case id and preserve saved ids. Read the schema and `questProblems()` in `hooks/content/progression.ts`.

Stop and ask if the request needs a new engine concept: pose, signal, spacing, counter, effect key, event kind, landmark, charm behavior or consumable behavior. Existing authorization for an engine change still applies.

## 2. Write from this canonical example

```ts
import { defineQuest } from '../types'

export default defineQuest({
  id: 'daily-care', label: 'Little comforts', steps: [{ text: 'Pet three times', counter: 'pet', goal: 3 }, { text: 'Feed two fish', counter: 'feed', goal: 2 }], reward: { coins: 30, miles: 80 }, weight: 1,
})
```

Use 1–6 ordered steps, existing counters, whole goals 1–1000 (optional `material` on expedition steps counts claimed units of that registered material), and weight 0.1–10. Rewards have nonnegative whole coins/miles, known materials with whole amounts 1–1000, or an existing furniture id. Two chains are picked by day; only the current step advances; each claim pays once. Months are 1–12.

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

Inspect a preview when one applies. Add the README row for new user-facing content. Mirror the complete skill byte-for-byte between `.claude/skills/quest-gen/` and `.agents/skills/quest-gen/`.

## 4. Commit

`feat(quests): add the <label> quest`. Include the passing checks and preview in the review summary. Commit the browser bundle with any imported content change.
