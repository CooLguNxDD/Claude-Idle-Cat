---
name: skill-gen
description: Add a cat skill to Claude Idle Cat as one validated content file. Use when asked to generate or add this content kind.
---

# skill-gen

## 1. Pin down the fields

One file per item in `hooks/content/skills/<id>.ts`. Choose a unique lowercase kebab-case id and preserve saved ids. Read the schema and `skillProblems()` in `hooks/content/progression.ts`.

Stop and ask if the request needs a new engine concept: pose, signal, spacing, counter, effect key, event kind, landmark, charm behavior or consumable behavior. Existing authorization for an engine change still applies.

## 2. Write from this canonical example

```ts
import { defineSkill } from '../types'

export default defineSkill({
  id: 'scout', branch: 'hunter', name: 'Scout', minLevel: 15, maxRank: 1, needs: 'apex', perk: '15% shorter expeditions', per: { expTime: -0.15 },
})
```

Keep hunter, cuddler or dreamer branches. maxRank is 1–3; prerequisite must be in the same branch. Tier-two minLevel is 15, 20 or 25. Effect caps: positive legacy multipliers at most +100%, decay at least −50%, offlineHours at most 4; expTime −20% to 0; matRolls and party 0–1; rareOdds 0–0.1; bond 0–0.5; expOffline 0–0.2 (accelerates offline time only); stardust, harmony and oracle 0–1. Integer additive effects stay whole. Ids in saves must remain stable.

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

Inspect a preview when one applies. Add the README row for new user-facing content. Mirror the complete skill byte-for-byte between `.claude/skills/skill-gen/` and `.agents/skills/skill-gen/`.

## 4. Commit

`feat(skills): add the <label> skill`. Include the passing checks and preview in the review summary. Commit the browser bundle with any imported content change.
