# Traceability & Change Propagation

When you change a test artifact, the related artifacts must move with it. This file is the map of
**what feeds what**, so a change never leaves a downstream doc stale (the failure mode that caused a
multi-round reconcile once). Run `pnpm check:consistency` after any test-plan change.

## Artifact DAG (per feature, under `docs/examples/<feature>/` — a real project typically names it `docs/test-plans/<feature>/`)

```
spec (OpenAPI) ─► 01-reqs ─► 05-breakdown ─► 06-technique-map ─► 07-test-cases ─► code (tests/<f>)
                                                                      │
                                                                      └─► 08-rtm ,  _state.json
                  09-review = a Gate-C audit snapshot of the above
```

| Artifact                    | Role                          | Rule                                                                |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------- |
| `07-test-cases.md`          | **SOURCE OF TRUTH** (catalog) | Every TC's value/tag/title lives here. Code must match it.          |
| `tests/<feature>/*.spec.ts` | the executable TCs            | Each `TC-xxx` annotation must have a row in `07` **and** `08-rtm`.  |
| `08-rtm.md`                 | REQ → TC traceability         | **Derived from 07** — keep every 07 TC mapped + the totals in sync. |
| `01-reqs.md`                | requirements                  | Upstream source; keep accurate (descriptions, not counts).          |
| `05-breakdown.md`           | Gate-B design (FB + budgets)  | **Snapshot** — carries a banner; counts may lag. Don't chase cells. |
| `06-technique-map.md`       | Gate-B technique mapping      | **Snapshot** — same banner treatment as 05.                         |
| `09-review.md`              | Gate-C self-review            | **Snapshot** — banner points to 07/08 for live totals.              |
| `_state.json`               | phase/analytics record        | Low-priority; refresh totals opportunistically.                     |

> There is **no** `10-test-cases-api.md` — deprecated (it drifted every time 07 changed). 07 is the
> single catalog.

## Propagation by change type — do these in the SAME commit

| You changed…                                   | Also update                                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Add a TC** (code)                            | `07` row + `07` per-FB/total/layer counts + `08-rtm` (map to its REQ)                               |
| **Change a TC's assertion / expected code**    | `07` row Expected (and its `_state`/legend if a new code appears). Do **not** weaken to a bug       |
| **Change a TC's tags** (scope / RED-by-design) | `07` row Tags + `07` Cut/smoke counts. Mirror the code exactly (a `test.skip` carries no scope tag) |
| **Remove a TC**                                | Strike it in `07` (don't delete) + Revision Log + decrement `07`/`08` counts + drop from `08-rtm`   |
| **Add / rename / re-scope an FB**              | `07` Summary + section header (keep them identical) + `05` + `06` + `08-rtm`                        |
| **Add / change a REQ**                         | `01-reqs` + `08-rtm` REQ row + the FB that covers it                                                |
| **Move a TC to another feature**               | source `07`/`08` mark N/A + note where it went; destination feature gains the TC end-to-end         |

## Tag taxonomy (the only grep-able suites)

`@isolated` `@flow` `@smoke` `@regression` `@<service>` (e.g. `@products`, `@orders`). Everything
else in a `07` Tags column (`negative`, `boundary`, `api-contract`, `security`, `automate-now`) is a
**descriptor/feasibility label, not a code tag** — never add a `@descriptor` in code. See
`.claude/rules/testing.md`.

## How to verify (cheapest first)

1. **`pnpm check:consistency`** — deterministic, ~free. Catches the mechanical class: code↔07↔08-rtm
   TC-id sets, duplicate TC-ids, unsanctioned `@tags`. Wired into the PR gate. **Run it after every
   test-plan change.**
2. **Manual spot-check** for the semantic class the script can't see: did the Expected value, FB title
   (Summary vs section header), and 08-rtm prose actually match 07?
3. **Agent audit** (fan-out reader per feature) — **expensive; use rarely** (a deep semantic sweep
   before a big merge, not routine). The script + this rule cover day-to-day.
