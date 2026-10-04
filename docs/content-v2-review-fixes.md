# Content modules v2 review validation

Validated against `feat/content-modules-v2` after merging `origin/main` at `c109469`. Reports were evaluated as suggestions against the implementation and SDK, rather than applied verbatim. The merge commit is `770d560`; the release version remains `0.0.1`, including matching marketplace metadata and the public types entry.

## Claude review

| Finding | Disposition and evidence |
|---|---|
| M1 — cosmetic errors replace tool results / skip payout | Fixed. Tool/turn reactions are best-effort; timer setup/cancellation is isolated and unnecessary clock reads around real tools were removed. Integration tests inject failed toasts and failed store writes, verify the original tool output, and verify the turn payout. The report's store-error example was partly inaccurate: `queue` already catches job failures, while clock/toast errors outside it could propagate. |
| M2 — malformed progression saves / missing Oracle cat | Fixed. `normalizeProgression` repairs containers, finite nonnegative counts, bond caps, quest progress and inbox references. It drops malformed runs, missing cat/trail references and duplicate reservations while preserving valid frozen rewards. Oracle rendering guards missing cats. Backup, migration, frozen-loot round-trip and single-claim tests pass. This change targets the new progression fields, not a redesign of every legacy save field. |
| M3 — whole registry shipped to browser | Fixed at the actual dependency entry: adoption sprite data imported the full content barrel. The builder now generates a browser-only breed registry in the same pinned order. Bundle shrank from 72,830 to 48,960 bytes (32.8%); forbidden progression strings and a pre-v2 size ceiling are tested. No engine injection refactor was needed. |
| M4 — main conflicts / release metadata | Fixed by merging main, preserving published history. Resolved all three conflicts, retained main's release metadata and types key, and added reactions. Main's string config rows omit option arrays; Settings supplies choices when the host does not expose them, covered by its integration test. |
| L1 — unknown achievement unlocks validate | Fixed. `unlockProblems` accepts achievement definitions and checks references; registry validation passes those definitions. Typo/valid-id tests added. |
| L2 — map listing id versus owned grant token | Fixed. Unlock validation checks a map's `grants` token, matching `owned`. A test uses different listing and grant ids. Both generator mirrors explain this distinction. |
| L3 — world unlock revoked after switching yard | Intended current-world gate. Hint now says “yard currently in”; README and generator guidance explain that changing worlds preserves in-flight runs. |
| L4 — Miles listings silently become free | Fixed. Miles listings require a positive Miles-only cost; coins/materials are rejected. Regression cases cover zero/missing Miles and mixed currencies. |
| L5 — inbox write-only / repeated notifications | Fixed. Session startup and frame notifications consult the durable inbox. A test finishes a run, checks one notification across frames and a session reload, and verifies no auto-claim. Memory tracks only pending notification writes. |
| L6 — capped bond / hard-coded December message | Fixed feedback. Gift exchange still succeeds once daily, but the log reports actual bond gain or the daily cap. Availability errors refer to the active exchange event rather than December. Cap/receipt/out-of-season tests pass. |
| L7 — nap then celebration on long tests | Intended feedback: nap while waiting, then react to the outcome. Documented in README and project guidance; per-reaction cooldowns remain. |
| L8 — quoted delimiters / missing test runners | Fixed heuristic. Command splitting respects quotes and escapes; added Python pytest, make, deno and dotnet cases and quoted echo/printf negatives. This remains cosmetic recognition rather than a shell interpreter. |

### Cleanup findings

- Preserved optional compatibility arguments on `isAway` and `lootOf`; time never releases a party before claim, and home never changes frozen loot. Comments explain these semantics.
- Kept the `isAway` import and re-export: local departure checks use it and callers import its public re-export. They serve different purposes.
- `activeCat` computes the at-home list once. Furniture types use ordinary type imports. Tool command access narrows the SDK event without an assertion.
- `/cat send` and `/cat exchange` share case-insensitive name/id resolution and accept quoted multiword names; literal Windows backup separators are retained. Tests and README examples added.
- Expedition rendering caches cat lookups and guards Oracle access. Existing planner choices remain transient. Preview PNGs intentionally remain committed for the walkthrough.

## Backend health report

| Location / suggestion | Disposition |
|---|---|
| `tickTally`: repeated at-home scans and waking lookups | Improved. Compute at-home ids once and cache ticked cats. Existing auto-feed, loan deductions, XP, wake logging and RNG behavior are preserved. The supplied replacement was not copied: it introduced friendship/turn rewards and altered deductions. The “High” rating is not supported at household size. Existing income/loan/feeder/away tests pass. |
| `rollLoot`: calculate rare odds on trails with no rare reward | Improved. Calculate rare odds only when a rare entry exists; cache per-cat totals, gear material rolls, furniture mods and event boost outside material loops. RNG consumption stays unchanged. |
| `addBond`: redundant cat lookups | Improved. Find each cat once, then reuse them for bonuses. Cap and invalid-pair tests still pass. |
| `pickReaction`: nested loops / template strings | Retained. Signal order deliberately gives test results precedence; reversing loops can change behavior. Five reactions and at most two completion signals do not establish a performance fault. Existing priority/cooldown tests cover the intended behavior. |
| `questsFor`: cache total weight | No change. It selects two chains from six definitions once per local-day query. No observed performance fault justifies changing the seeded selection arithmetic. |
| `canCraft` / `craft`: repeat listing lookup | Improved. A discriminated successful check carries the validated shop item; crafting reuses it without a second scan or a non-null assertion. |
| `runner`: redundant footprint scan | No defect. The existing loop already increments by 12; it does not scan each column as alleged. |

## Frontend A health report

| Finding | Disposition |
|---|---|
| Empty party causes Infinity | Rejected as unreachable. `send` calls `canSend` before any cost, time or loot calculation, and rejects empty/missing parties. Added explicit tests showing no coins, energy, gear or run mutation. Private `rollLoot` is only called after validation. |
| `isAway` depends on `catsAtHome` / quadratic ticking | Dependency claim was incorrect: `isAway` directly scans runs. Repeated scans were real; `catsAtHome` now builds one reserved-id set and ticking reuses the at-home ids. |
| `payCost` skips missing materials | Crafting was already guarded by the pure engine's `canPay`, not just UI. Hardened direct `payCost`: unaffordable costs return the same home. Did not copy the suggested negative-balance implementation. Missing-material, coin, Miles and exact-payment tests pass. |
| Rare totals recomputed inside every cat loop | Location/complexity claim was incorrect: the rare totals calculation was outside the loop. Repeated totals between material and rare processing were avoidable and are now cached. |

## Frontend B health report

| Finding | Disposition |
|---|---|
| Empty keyboard party / module state desync | Added client and host guards so an empty yard does not post or process departure keys. Engine rejection already existed. Transient module planner state with explicit `$.ui.invalidate` is the host's supported model, not an identified desync; it intentionally resets on reload. |
| Repeated name lookups while rendering runs | Improved with one cat map for the expedition view; also reused for Oracle and selected-party labels. |
| Global keyboard capture / tab accessibility | Rejected. The installed SDK explicitly says `surface.onKey` is reached only while a click gives that Client focus, with Escape returning it. Tab hotkeys already route through the existing tab machinery; both-surface and router tests pass. |

## Documentation report

Added concise API comments for away status, expedition reservation/claim/inbox behavior, pair selection and caps, daily quest selection/progress, reactions and cooldown memory, exchange/boost events, and shop payment/crafting. Generated registry comments explain pinned definition order. Existing schema/validator names and project guidance already describe validation, so no repetitive per-validator boilerplate was added.

Several supplied descriptions would document the wrong behavior:

- `define*` functions provide typed definitions; `*Problems` functions validate them separately.
- `MILES_SHOP` contains purchasable Miles listings, not milestone unlocks. `STARTER` contains furniture ids, not a whole save or a cat.
- `TOTALS` pins the fixed legacy cat's effect totals. Materials are expedition loot and a crafting currency, not craftable products.
- `SIGNALS` drives cosmetic reactions; `COUNTERS` is a counter-name array. Landmark widths differ by kind and use design units.
- `finishExpeditions` only marks ready receipts; it never claims rewards or releases cats. `lootOf` clones frozen departure loot.
- `partnerOf` selects a random eligible cat, not the most bonded. `stepPair` advances animation; its caller settles completion.
- `questsFor` picks two daily chains, not every incomplete milestone. `questState` reads/resets daily state.
- `rememberReaction` stores cooldown timestamps, not preferences or mood. `signalsOf` maps tool outcomes, and `turnSignal` maps Claude completion reasons, not simulation turns.
- Exchange swaps a daily cosmetic gift for bond or visitor coins, not specified inventory items. `payCost` returns unchanged state on insufficient resources, rather than throwing. Tea restores energy only.

The session manifest confirms all four Jules sessions completed; it contains no additional code findings. Every report in the supplied directory is covered above.

## Verification

- `claude plugin validate .`: passed; existing warning about root `CLAUDE.md` not shipping as plugin context remains.
- Plugin and browser TypeScript checks: passed.
- `claude plugin test .`: **239 pass, zero fail across 49 files**.
- Node server, content-tool and release-snapshot tests: **10 pass, zero fail**.
- Content builder check: passed for both generated registries; mirror tests pass.
- Browser rebuilt: **48,960 bytes**, with progression data absent.
- `git diff --check`: passed. Legacy 40-day Nyan stock and skill total fixtures remain unchanged.

Audible playback, a real 20-second long command and a real 15-minute expedition remain manual checks, as stated in the original walkthrough. The automated tests use mocked time, tool results and audio.
