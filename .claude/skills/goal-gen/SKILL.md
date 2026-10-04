---
name: goal-gen
description: Add a GOAP cat goal to Claude Idle Cat as one validated content file. Use when asked to generate or add this content kind.
---

# goal-gen

## 1. Pin down the fields

One file per item in `hooks/content/goals/<id>.ts`. Choose a unique lowercase kebab-case id. Read `Goal` and `goalProblems()` in `hooks/content/progression.ts`.

Stop and ask if the request needs a new engine concept: fact, stat or planner rule. Existing authorization for an engine change still applies.

## 2. Write from this canonical example

```ts
import { defineGoal } from '../types'

export default defineGoal({
  id: 'rested', label: 'Rested', want: { isTired: false }, need: { stat: 'energy', below: 30, weight: 2.5 },
  personality: { lazy: 1.5 },
})
```

`want` uses known facts. `need.stat` is `hunger`, `energy` or `joy`. `below` is 0–100 and `weight` is 0–10. Insistence is `weight × (below − stat) / below × personality multiplier`, and it is 0 once the stat reaches `below`. Personality multipliers are 0–3 for `lazy`, `playful`, `greedy`, `shy`, `cuddly` or `curious`. A missing personality uses 1.

Keep `want` aligned with the fact that `factsOf` derives from the same threshold, so a satisfied cat is not handed an empty plan.

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
```

Mirror this skill byte-for-byte between `.claude/skills/goal-gen/` and `.agents/skills/goal-gen/`.

## 4. Commit

`feat(goals): add the <label> goal`.
