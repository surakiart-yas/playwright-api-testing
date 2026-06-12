---
phase: B
substeps: B.1 breakdown, B.2 technique-map, B.3 test-cases
artifacts: 05-breakdown.md, 06-technique-map.md, 07-test-cases.md, 08-rtm.md
gate: B
parent_skill: test-design
---

# Phase B — Breakdown + Design (3 substeps)

## B.1 — Feature Breakdown → `05-breakdown.md`

> Inline rules below are authoritative. **Optional deeper context (testbydesign repo only):** `src/content/docs/th/practice/feature-breakdown.mdx`.

Each sub-feature (FB) is a **test condition** in ISTQB Foundation Level Syllabus v4.0 Section 4.1 terms: an aspect of the system that one or more test cases will verify, derived from the test basis (spec / AC / risks). Use **test-condition-driven decomposition** (one FB per coherent test condition that maps cleanly to one or two test techniques in B.2). Do NOT use operation-driven decomposition (CRUD axis) — CRUD is a downstream view captured later via the `Operation` field on each test case.

**Anti-pattern to avoid: step-based or CRUD-based decomposition.** If the spec describes a sequential flow with steps (e.g. "verify phone → verify OTP → verify ID") or CRUD operations (Create/Update/Delete), the temptation is to make each step or operation one FB. This is too coarse — each step or CRUD operation typically contains multiple test conditions.

**Example 1 — Sequential flow ("Verify OTP" step):** contains at least OTP format validation (input-validation), OTP validity window (business-logic), OTP attempt counter (business-logic), OTP lockout transition (state-transition), OTP cooldown recovery (state-transition), per-phone vs per-session boundary (non-functional). Each is a separate FB.

**Example 2 — CRUD ("Signup / Create user account" operation):** contains at least required field × 5 (Email/Phone/Name/Password/Confirm-password — input-validation, EP), email format (input-validation, EP), phone format Thai mobile 06/08/09 + 10 digits (input-validation, EP), password strength (input-validation, BVA), confirm-password match (business-logic, Decision Table), email uniqueness check (business-logic, Use Case), phone uniqueness check (business-logic, Use Case), initial state = PENDING_OTP (state-transition, State Transition), welcome / OTP trigger (integration, Use Case), token auth on admin endpoint (non-functional / cross-cut, Decision Table). Each is a separate FB.

The point is not that teams will "miss" these — experienced QAs often enumerate them mentally while writing CRUD cases. The point is **implicit vs explicit**: implicit decomposition depends on the writer's experience and is hard to review/trace/onboard; explicit FB structure makes the enumeration an artifact that anyone on the team (including juniors and new hires) can scan, verify, and trace through RTM.

**Fix:** use step/CRUD labels for navigation only (e.g. group FBs by step or by CRUD operation in `05-breakdown.md`, plus the `Operation` field on each TC). FB granularity must be **test-condition-level**, not step-level or CRUD-level. CRUD axis re-emerges later as the `Operation` field for Sheet/TMS filtering — both views coexist.

Granularity is a **judgment call** per ISTQB v4.0: high-risk features warrant finer sub-features, short timelines tolerate coarser breakdown. If an FB ends up with > 15 test cases consider splitting it; if < 2 consider merging with an adjacent FB. Document the rationale in `05-breakdown.md` so future review can understand the choice.

Decompose into sub-features. For each:

- `FB-ID` (FB-001, FB-002, ...)
- Title
- Type: `input-validation` / `state-transition` / `business-logic` / `integration` / `ui-ux` / `non-functional`
- **Linked REQ-ID(s) from `01-reqs.md`** — REQ ↔ FB relationship has 3 patterns:

| Pattern                        | When                                                            | Example                                                                                           |
| ------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **1:1** (REQ ≈ FB)             | atomic rule, no decomposition needed                            | REQ "Email format valid" → FB "Email format validation"                                           |
| **1:N** (REQ → multiple FBs)   | 1 rule has multiple test angles                                 | REQ "Phone Thai mobile (06/08/09 + 10 digits)" → FB prefix + FB length                            |
| **N:1** (multiple REQs → 1 FB) | same rule applied in multiple contexts (auth, uniqueness, etc.) | REQ "Email unique on signup" + REQ "Email unique on profile change" → FB "Email uniqueness check" |

**Caveat for N:1:** only use when the multiple REQs share the same test technique. If they require different techniques (e.g., format check via EP + expiry via BVA + lockout via State Transition), keep them as separate FBs.

- Linked scope item(s) from `02-scope.md`
- **Risk** (`critical` / `high` / `medium` / `low`) — see Risk classification below
- **TC budget** (derived from Risk — see budget table below)
- One-sentence summary

**Risk classification (per ISTQB Section 5.2 + `risk-based-testing.mdx`):** risk = impact × likelihood. Classify each FB:

| Risk         | Criteria (any one applies)                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **critical** | failure causes revenue loss / customer trust impact / compliance issue / silent failure hard to detect / data integrity loss |
| **high**     | core functional path used by most users; failure disrupts main flow; common bug source area                                  |
| **medium**   | edge cases / less-frequent flows; detectable + fixable post-release                                                          |
| **low**      | nice-to-have features; rarely used paths; low cost if defective                                                              |

**TC budget per Risk (default; override with rationale in `05-breakdown.md`):**

| Risk     | TC budget | What to cover                                            |
| -------- | --------- | -------------------------------------------------------- |
| critical | 4-6 TCs   | positive + multiple negatives + boundary + security/edge |
| high     | 3-4 TCs   | positive + key negatives + boundary                      |
| medium   | 2-3 TCs   | representative positive + 1 negative                     |
| low      | 1-2 TCs   | smoke only                                               |

**Before generating TCs in B.3, total budget = sum of FB budgets.** This prevents over-testing (87 TCs feature → ~60-70 with risk filter).

**Before accepting an FB, verify it satisfies all 4 properties of a good test condition:**

1. **Single aspect** — describes ONE testable aspect, not multiple (e.g. "Phone prefix validation" ✓ vs "Phone validation" ✗ which lumps length + prefix + dedup)
2. **Maps to 1-2 techniques** — you can name the primary technique in B.2 without ambiguity (e.g. EP for partitions, State Transition for state machines)
3. **Has a coverage criterion** — you can state "this FB is fully tested when [X]" (e.g. "every partition has at least one TC", "every transition in the state table has at least one TC")
4. **Prevents one defect category** — if the FB fails, you can name the type of bug that escapes (e.g. "user saves invalid phone format")

If an FB fails any of these, it is likely too broad (combines multiple test conditions — split it) or too narrow (it is a TC, not an FB — merge with adjacent FB).

## B.2 — Technique Matching → `06-technique-map.md`

For each FB-ID, recommend a primary technique (and optionally secondary) using this decision tree:

| Signal in spec                  | Technique                   | Reference page                                      |
| ------------------------------- | --------------------------- | --------------------------------------------------- |
| Numeric range or boundary       | BVA                         | `techniques/black-box/boundary-value-analysis.mdx`  |
| Discrete equivalence classes    | EP                          | `techniques/black-box/equivalence-partitioning.mdx` |
| State machine with transitions  | State Transition            | `techniques/black-box/state-transition.mdx`         |
| Multiple conditions interacting | Decision Table              | `techniques/black-box/decision-table.mdx`           |
| Many independent input params   | Pairwise                    | `techniques/black-box/pairwise.mdx`                 |
| End-to-end user journey         | Use Case                    | `techniques/black-box/use-case.mdx`                 |
| Cause/effect graph applicable   | Cause-Effect Graph          | `techniques/black-box/cause-effect-graph.mdx`       |
| Spec gap / unknown territory    | Exploratory                 | `techniques/experience-based/exploratory.mdx`       |
| Heuristic / domain experience   | Error Guessing              | `techniques/experience-based/error-guessing.mdx`    |
| Code coverage analysis needed   | Statement / Branch Coverage | `techniques/white-box/*.mdx`                        |

Format per FB-ID:

```
FB-001 — <title>
  Primary: <technique> (<why>)
  Secondary: <technique or none> (<why>)
  Refs: <path>, <path>
```

If you cannot map a signal to a technique with confidence, name it and ask the user before proceeding — do not silently pick one.

**Pairwise reduction (proactive trigger):** if an FB has ≥3 independent input parameters and each has ≥2 values (exhaustive would yield ≥8 combinations), **default to Pairwise** instead of full Decision Table or exhaustive EP. Pairwise (per ISTQB Section 4.2.5) covers all 2-parameter combinations with N+log(combinations) cases — catches ~80%+ of combinatorial defects. Tool: PICT, AllPairs, online generators. Example: 5 fields × 3 values each = 243 exhaustive → ~15-20 pairwise.

## B.3 — Test Case Catalog → `07-test-cases.md` + `08-rtm.md`

> Inline rules below are authoritative. **Optional deeper context (testbydesign repo only):** `src/content/docs/th/practice/writing-good-test-cases.mdx`.

**Respect TC budget per FB (from B.1 Risk classification).** If a FB's natural test count exceeds its budget, escalate: either re-classify Risk upward (with rationale) or trim via pairwise / representative selection. If exceeding by >50% without re-classification, flag as over-testing in Phase C audit.

`07-test-cases.md` contains every test case. Each:

- `TC-ID` (TC-001, ...)
- **Title** — format: `[Subject]: [scenario] → [expected]`. Title must read as a **failure message**: if it shows up in a test report next to a red FAIL, the reader should immediately understand what broke and why.

  | ❌ Bad                | ✅ Good                                              | Reason                                                    |
  | --------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
  | "test login"          | "Login: session token expired → 401 redirect"        | bad lacks scenario; good has subject + scenario + outcome |
  | "test OTP"            | "OTP: 6 digits within 3 min → pass + next step"      | bad lacks scenario; good has full 3 parts                 |
  | "All 5 fields filled" | "Create: 5 fields filled → save success"             | bad lacks outcome; good has operation + outcome           |
  | "Name empty blocked"  | "Create: Name empty → validation error"              | terse OK, good adds Subject (Create)                      |
  | "Banner GIF rejected" | "Banner upload: GIF format → rejected (unsupported)" | good specifies context + outcome                          |

- `FB-ID` linked
- `REQ-ID` linked (or `N/A` if no formal requirement)
- **Operation** (CRUD perspective): `create` / `read` / `update` / `delete` / `cross-cut`. Pick the primary action the test exercises. Use `cross-cut` only when the test genuinely spans multiple operations (e.g., auth check applied to every endpoint, status code persistence on both create and update). This field lets users regroup test cases by CRUD in spreadsheets and test management tools — the dominant industry pattern that does not map 1:1 from FB-IDs.
- **Layer**: `UI` / `API` / `Both` (must match Phase 0 layer scope)
- Technique
- Priority: `critical` / `high` / `medium` / `low`
- **Tags** (comma-separated). Compose from these vocabularies:
  - Suite: `smoke`, `regression`, `sanity`
  - Strategic: `critical-path`, `negative`, `boundary`, `security`, `a11y`, `api-contract`, `performance`
  - Automation: `automate-now`, `manual-only`, `automate-later`
- Preconditions
- **Test data** (optional — list specific values when inputs are non-trivial or parametrizable)
- Steps (numbered; if `Layer: Both`, write two sub-blocks: `Steps (UI):` and `Steps (API):`)
- Expected result (specific assertions, not vague "success"; if `Layer: Both`, split `Expected (UI):` and `Expected (API):`)
- Notes (optional — gotchas, edge cases, automation considerations)

**Recommended layout — compact table per FB:** instead of bullet block per TC (6-8 lines each, hard to scan), use a single markdown table per FB with columns `TC | Title | Layer | Pri | Steps | Expected | Tags`. For `Both`-layer rows, split cells with `UI: ...<br>API: ...`. Reduces a 600-line catalog (~87 TCs) to ~300 lines while preserving all metadata. Industry-aligned: matches TestRail/Jira Xray row layout, exports cleanly to spreadsheets.

`08-rtm.md` is the Requirement Traceability Matrix: rows = REQ-IDs (or FB-IDs if no REQ), columns = TC-IDs that cover each. Mark gaps clearly.

## 🛑 Gate B

Refuse Phase C if any of the following:

- Any FB-ID has zero test cases
- Any REQ-ID has zero test cases (RTM gap)
- More than 60% of test cases use the same technique (likely under-covered edges)
- Any test case has `Steps` empty or `Expected result` empty

State the specific gap. Update `_state.json` to `{"gate_b_passed": true}` only when all four checks pass.
