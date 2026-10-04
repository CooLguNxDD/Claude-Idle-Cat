---
name: behavior-gen
description: Add a GOAP cat behaviour to Claude Idle Cat as one validated content file. Use when asked to generate or add this content kind.
---

# behavior-gen

## 1. Pin down the fields

One file per item in `hooks/content/behaviors/<id>.ts`. Choose a unique lowercase kebab-case id and preserve saved ids. Read `Behavior` and `behaviorProblems()` in `hooks/content/progression.ts`. Facts live in `FACT_KEYS`.

Stop and ask if the request needs a new engine concept: fact, pose, signal, spacing, counter, effect key, event kind, landmark or a new planner rule. Existing authorization for an engine change still applies.

## 2. Write from this canonical example

```ts
import { defineBehavior } from '../types'

export default defineBehavior({
  id: 'eat-bowl', label: 'Eat from the bowl', pre: { isAwake: true, isHungry: true, bowlHasFood: true }, post: { isHungry: false },
  cost: 1, seconds: 6, goTo: 'bowl', move: 'eat',
  effect: { hunger: 30, bowl: -1, xp: 2, friendship: 1 }, line: 'munches from the bowl. +2xp',
})
```

`pre` and `post` use known facts. `cost` is 0–100. `seconds` is 0–600. `move` is a registered move id. `goTo` is `bowl` or `bed`. `seek` is a landmark kind. `partner: true` needs another awake cat at home and resolves the bond through `pickInteraction`, falling back to `effect.bond`. Effect deltas stay inside the validator ranges. The planner searches at most four steps.

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

Mirror this skill byte-for-byte between `.claude/skills/behavior-gen/` and `.agents/skills/behavior-gen/`.

## 4. Commit

`feat(behaviors): add the <label> behaviour`.
