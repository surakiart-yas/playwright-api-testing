---
name: test-design
description: Portable ISTQB-driven test analysis + design workbench (covers ISTQB activities 3 Analysis + 4 Design). Self-contained — all essential rules (title format, FB 4 properties, Risk + TC budget, technique decision tree) inline in phase files; no external file reads required. Phased workflow REQ → scope → breakdown → cases → review, with gates between phases. Use when the user wants help with test requirement extraction, scope, sub-feature breakdown, or test cases for a feature — typically from external project work. Produces portable markdown artifacts in .test-design-scratch/<feature>/ (workspace-local, gitignored by convention). Does NOT generate test framework code (.spec.ts etc); execution + result collection guidance is out of skill scope (refer to a team playbook if one exists in the workspace).
---

# test-design skill

You are running the test-design workflow. The skill is **self-contained** — phase files (`phases/phase-{a,b,c,d}.md`) carry every rule needed to execute Phase A → B → C → D. Do not improvise techniques outside what is documented in the phase files.

The user will typically be designing tests for work that lives in their project. This skill is their design lab. Final artifacts are portable markdown that they will copy out manually.

## Portability

This skill works in **any project**, not just the testbydesign knowledge-base repo. Drop `.claude/skills/test-design/` into a project's `.claude/skills/` (or place globally at `~/.claude/skills/`), and it runs the same workflow.

- **Workspace artifacts:** all phase outputs go to `.test-design-scratch/<feature>/` relative to the project root. Add `.test-design-scratch/` to the project's `.gitignore` if you want scratch artifacts excluded from commits (the testbydesign repo does this).
- **No external dependencies:** title format rules, FB 4-properties, Risk classification + TC budget, technique decision tree are all inline in `phases/phase-{a,b,c,d}.md`. The skill runs without needing source `.mdx` methodology files present.
- **Optional deeper context:** when working _inside the testbydesign knowledge-base repo_ specifically, rich pedagogical pages exist at `src/content/docs/{th,en}/practice/` and `src/content/docs/{th,en}/techniques/`. Skill files reference these as **optional anchors** for readers who want hooks/examples/exercises — never as required reads. Skip them in other projects.
- **Optional team supplement:** if a team process doc lives in the workspace (e.g., `_team-notes/qa-playbook.md`), treat it as authoritative for team-specific conventions. Skill defers to the playbook when present; otherwise inline skill rules apply. The skill does NOT require a playbook to function.

## Skill layout (orchestrator + phase detail)

This file (SKILL.md) is the **orchestrator** — workflow shape, gates, state, references, invocation. Detailed per-phase guidance lives in `phases/phase-{a,b,c,d}.md`. **Always Read the relevant phase file before producing that phase's artifacts.** Phase 0 (setup) is short enough to stay inline.

```
.claude/skills/test-design/
├── SKILL.md                       (you are here — orchestrator)
├── README.md                      (user-facing intro)
└── phases/
    ├── phase-a-scope.md           (Phase A detail: REQ + scope + flow + questions)
    ├── phase-b-breakdown.md       (Phase B detail: breakdown + technique-map + test-cases)
    ├── phase-c-review.md          (Phase C detail: 8-check audit)
    └── phase-d-export.md          (Phase D detail: export formats)
```

## What this skill is NOT

- NOT a test code generator. Never write `.spec.ts`, `.test.ts`, Playwright or Vitest files anywhere.
- NOT a freeform chat. Follow the phases in order. Refuse to skip a gate.
- NOT a place to commit real workplace specs. See Privacy below.

## Privacy (read first, enforce always)

The project rule is "no real workplace specs". Before writing any artifact to disk:

1. Scan the user-provided spec for real-system signals: company names, internal URLs, real API endpoints / hostnames, real customer or employee names, proprietary product codes, internal Jira IDs.
2. If any signal is detected, stop and ask the user to either provide a generalized version (e.g. "Pay X" → "TestPay-style payment app") or confirm scratch-only mode.
3. Default workspace is `.test-design-scratch/<feature>/` — this path is gitignored. Files written there will not be committed.
4. Promotion to a commit-ready folder (e.g., `docs/case-studies/<feature>/` in the testbydesign repo, or wherever the project stores reviewed test designs) requires explicit user confirmation AND a fully generalized spec. When in doubt, stay in scratch.

If the user just pastes a spec without saying anything, default to scratch and warn them.

## Phases overview

Always work in this order. Each phase writes artifacts to the workspace folder. Do not produce later-phase artifacts until earlier gates are passed.

| Phase | Purpose                                   | Artifacts                                                                 | Gate     | Detail file                   |
| ----- | ----------------------------------------- | ------------------------------------------------------------------------- | -------- | ----------------------------- |
| 0     | Setup (inline below)                      | `_context.md`, `_state.json`                                              | -        | inline                        |
| A     | Scope (REQ → boundary → flow → questions) | `01-reqs.md`, `02-scope.md`, `03-flow.md`, `04-questions.md`              | Gate A   | `phases/phase-a-scope.md`     |
| B     | Breakdown + Design                        | `05-breakdown.md`, `06-technique-map.md`, `07-test-cases.md`, `08-rtm.md` | Gate B   | `phases/phase-b-breakdown.md` |
| C     | Self-Review                               | `09-review.md`                                                            | user-ack | `phases/phase-c-review.md`    |
| D     | Export (optional)                         | `10-export-*.md`                                                          | -        | `phases/phase-d-export.md`    |

### Phase 0 — Setup (no gate, inline)

Ask the user, in order:

1. **Feature name** (kebab-case, e.g. `payment-alert`) — used as folder name.
2. **Spec source** — paste in chat / file path / "let's discover it together".
3. **Testing goal** — pick one:
   - `find-defects` — actively probe for failures (typical for regression / new-feature testing)
   - `prevent-defects` — clarify requirements upstream to stop bugs before code (ATDD / BDD context)
   - `assess-quality` — measure current state without bias (audit / release readiness)
   - `build-confidence` — verify happy path works for stakeholders (demo / smoke)
   - `inform-decisions` — produce data for go/no-go calls (risk-based decisions)
     The goal shapes priority + technique choices in Phase B. (Optional: in testbydesign repo, fuller treatment at `src/content/docs/th/foundations/what-is-testing.mdx`.)
4. **Workspace mode** — `scratch` (default, gitignored) or `case-study` (commit-ready, requires generalized spec).
5. **Test layer scope** — `ui-only` / `api-only` / `both` (default `both`). Determines the test case `Layer` field and Phase C layer balance audit.

Create the folder. Write `_context.md` with the answers, the spec (or a generalized version if case-study mode), and the timestamp. Write `_state.json` with `{"phase": "A", "feature": "...", "layer_scope": "..."}`.

Proceed to Phase A — **Read `phases/phase-a-scope.md` first.**

### Phase A — Scope (4 artifacts) → see `phases/phase-a-scope.md`

Implements the playbook chain **Spec → REQ → Test condition (FB) → TC**. REQ extraction comes **before** scope (scope is a boundary decision over an existing REQ list). Sub-feature grouping (G1-Gn, 5-9 groups) introduced here, used by all later phases.

**Artifacts:** `01-reqs.md` (REQ list) → `02-scope.md` (boundary) → `03-flow.md` (transition table primary + minimalist Mermaid optional) → `04-questions.md` (decided / deferred per row).

**🛑 Gate A:** refuse Phase B if any question is `open`, or `01-reqs.md` is empty / missing, or any REQ has unclear `Source`. Update `_state.json` to `{"phase": "B", "gate_a_passed": true}` only after all 3 checks pass.

### Phase B — Breakdown + Design (3 substeps) → see `phases/phase-b-breakdown.md`

- **B.1 Feature Breakdown** (`05-breakdown.md`) — test-condition-driven decomposition; each FB has Risk + TC budget + 4 properties; FBs satisfy ISTQB Section 4.1 test condition definition
- **B.2 Technique Matching** (`06-technique-map.md`) — primary + secondary techniques per FB; Pairwise reduction triggered when ≥3 params × ≥2 values
- **B.3 Test Case Catalog** (`07-test-cases.md` + `08-rtm.md`) — every TC has title following `[Subject]: [scenario] → [expected]` format; compact table-per-FB layout (1 row = 1 TC)

**🛑 Gate B:** refuse Phase C if any FB has 0 TCs, any REQ has 0 TCs, any single technique > 60%, or any TC has empty Steps / Expected. Update `_state.json` to `{"gate_b_passed": true}` after all 4 checks pass.

### Phase C — Self-Review → see `phases/phase-c-review.md`

8-check audit: coverage, technique distribution, granularity, layer balance, tag sanity, priority distribution, open questions, TC inflation (Risk-based filter). Outputs `09-review.md` with findings as checklist. Not done until user acknowledges and either fixes flagged items or accepts as known.

**After Phase C:** test design phase is complete. **Execution + result collection is outside skill scope** — for execution workflow (manual + automation), defect tracking, run types (smoke/regression/etc.), metrics, and tooling, refer to **playbook Section 8 "Test Execution + Result Collection"**.

### Phase D — Export (optional, on request) → see `phases/phase-d-export.md`

Offers clipboard markdown / MDX / plain checklist / TMS-row CSV formats. Does not modify earlier-phase artifacts.

## State persistence

Keep `_state.json` in the workspace folder. Minimum schema:

```json
{
  "feature": "payment-alert",
  "phase": "B.2",
  "gate_a_passed": true,
  "gate_b_passed": false,
  "workspace_mode": "scratch",
  "testing_goal": "find-defects",
  "layer_scope": "both"
}
```

If the user re-invokes the skill with the same feature name, read `_state.json` and resume from the saved phase rather than restarting Phase 0.

## Methodology references

When explaining a decision, cite the primary anchor (ISTQB syllabus section) for stability across sessions. Inline phase-file rules are authoritative; optional secondary anchors below give deeper pedagogical context when available.

### Primary anchors (ISTQB Foundation Level Syllabus v4.0)

Use these as the universal citation regardless of project:

- **Section 4.1 Test Analysis and Design** — defines test conditions (= our test conditions / FBs), test cases, traceability. Use when justifying breakdown approach.
- **Section 4.2 Black-box test techniques** — Equivalence Partitioning, Boundary Value Analysis, Decision Table, State Transition Testing, Use Case Testing. Use when choosing techniques.
- **Section 4.3 White-box test techniques** — Statement coverage, Branch coverage. Use when code coverage is in scope.
- **Section 4.4 Experience-based test techniques** — Error guessing, Exploratory testing, Checklist-based testing. Use for spec gaps and heuristic coverage.
- **Section 4.5 Collaboration-based test approaches** — Acceptance criteria, ATDD, BDD. Use when collaborating on test basis.
- **Section 2.2 Test levels and test types** — unit / integration / system / acceptance, functional / non-functional / change-related. Use for Layer and Tag decisions.
- **Section 1.5 Testing principles** — seven principles (defects cluster, exhaustive impossible, etc.). Use for risk-based and prioritization decisions.
- **Section 5.1-5.4 Test Process (7 activities)** — Planning / Monitoring & Control / Analysis / Design / Implementation / Execution / Completion. **Skill scope = activities 3 (Analysis) + 4 (Design)**. Other activities (1, 2, 5, 6, 7) are cross-functional, tool-specific, or covered by external standards (ISTQB Section 5.1-5.4, IEEE 829, ISO 29119) — out of skill scope.

### Secondary anchors (optional, available only in testbydesign repo)

These pages exist in the testbydesign knowledge-base repo. **Skip them in other projects** — inline phase-file rules cover everything needed to run the skill.

- Scope analysis → `src/content/docs/th/practice/ticket-to-scope.mdx`
- Feature breakdown → `src/content/docs/th/practice/feature-breakdown.mdx`
- Writing test cases → `src/content/docs/th/practice/writing-good-test-cases.mdx` (title naming rule + worked examples)
- Test suite organization → `src/content/docs/th/practice/test-suite-management.mdx`
- Testing goals → `src/content/docs/th/foundations/what-is-testing.mdx`
- Risk-based testing → `src/content/docs/th/foundations/risk-based-testing.mdx`
- Test process (ISTQB 7 activities) → `src/content/docs/th/foundations/test-process.mdx`
- Black-box techniques → `src/content/docs/th/techniques/black-box/*.mdx`
- Experience-based techniques → `src/content/docs/th/techniques/experience-based/*.mdx`
- White-box techniques → `src/content/docs/th/techniques/white-box/*.mdx`
- Canonical fixtures → `src/content/docs/th/examples/{bank-onboarding,login-flow}.mdx`

### Team-facing anchor (optional, workspace-local)

If a team process doc exists in the workspace (typical path: `_team-notes/qa-playbook.md` or `.test-design-scratch/_team-notes/qa-playbook.md`), treat it as authoritative for team-specific conventions (process, DOR/DOD, worked examples, anti-patterns, execution/automation guidance) — these supplement but do not replace inline skill rules. The skill works fine without a playbook; do not require one to be present.

**Vocabulary alignment:** use "test condition" (ISTQB Section 4.1) as canonical term in all artifacts regardless of whether external docs are available.

## Style rules for artifacts

- No em dash (—) anywhere. Use comma, colon, or a new sentence.
- No section symbol (§). Spell out "Section X".
- Thai prose should be natural conversational tone, not machine-translation.
- Tables use `-` (hyphen-minus) for N/A cells, not `—`.
- If the project has its own `CLAUDE.md` style guide, defer to it on top of these defaults.

## Invocation modes

**Users don't need to remember flags.** Accept any natural language after `/test-design` and infer intent. Ask back if unclear.

### How to parse user invocation

1. **Extract feature name** — first kebab-case or quoted token, or ask if missing
2. **Detect inline spec** — if user pastes >100 chars after feature name (or attaches file), treat as Phase 0 step 2 spec source
3. **Infer mode** from keywords (Thai or English):

| User intent                    | Keywords (TH / EN)                                        | Mode                          |
| ------------------------------ | --------------------------------------------------------- | ----------------------------- |
| Continue from previous session | "ต่อ", "ทำต่อ", "resume", "continue", "ค้างไว้"           | `--resume`                    |
| Just want scope, no test cases | "แค่ scope", "scope พอ", "scope-only", "ขอบเขตอย่างเดียว" | `--scope-only`                |
| Review existing test cases     | "review", "audit", "ทบทวน", "ตรวจ", "ดูที่มีอยู่"         | `--review`                    |
| Default — full workflow        | (no keywords above)                                       | default (Phase 0 → A → B → C) |

4. **If multiple intents detected**, prioritize: `review` > `scope-only` > `resume` > `default`
5. **If unclear**, ask back briefly: "ต้องการเริ่ม feature ใหม่ หรือทำต่อจากที่ค้างไว้ครับ?"

### Mode behaviors

- **Default** — Run Phase 0 → A → B → C. If user pastes spec inline, treat as Phase 0 step 2.
- **`--resume`** — Read `.test-design-scratch/<feature>/_state.json`. Resume from saved phase. If state file missing, warn + fall back to default.
- **`--scope-only`** — Phase 0 → A only. Stop after Gate A passes. Save state `{"phase": "A", "gate_a_passed": true, "scope_only": true}` so later resume knows it was deliberately stopped.
- **`--review`** — Skip Phase 0/A/B. Jump to Phase C self-review on existing artifacts. If TCs from external source, prompt to drop into `07-test-cases.md` first.

### Examples

| User types                                      | Inferred                                      |
| ----------------------------------------------- | --------------------------------------------- |
| `/test-design payment-alert`                    | default — start fresh feature `payment-alert` |
| `/test-design payment-alert ทำต่อ`              | `--resume` on feature `payment-alert`         |
| `/test-design payment-alert ขอแค่ scope ก่อน`   | `--scope-only`                                |
| `/test-design payment-alert ขอ review เคสที่มี` | `--review`                                    |
| `/test-design` (no feature)                     | ask: "Feature name?"                          |

**If workspace folder exists with non-empty `_state.json` and user invokes without resume keyword**, ask: "เจอ workspace เดิมของ `<feature>` (phase `<X>`) ต้องการทำต่อหรือเริ่มใหม่?"
