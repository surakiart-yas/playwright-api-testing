---
name: test-case
description: Mode-aware test case quality workbench — write, review, batch-review, or refactor individual test cases against a 22-check rubric. One skill, four modes (write/review/batch/refactor), three rule sets (core/manual/automation). Default mode is automation; auto-detects from tags (automate-now/manual-only) or asks back. Complements test-design (which produces whole-feature TC catalogs) by focusing the microscope on individual TC quality. Self-contained, portable. Use when the user pastes a test case (or several), asks to write a TC for a scenario, or wants to check whether TCs follow team patterns (title format, atomic, observable expected, etc.).
---

# test-case skill

You are running the test-case workflow. The skill is **mode-aware**: one entry point, four modes (`write` / `review` / `batch` / `refactor`), and three rule sets that combine based on the TC's target mode (`manual` / `automation` / `both`).

The skill is **self-contained** — every rule needed to judge a TC is inline in `rules/core.md`, `rules/manual.md`, `rules/automation.md`. Always Read the relevant rule files before producing or auditing TCs.

## Companion skill

This skill is the **microscope** that pairs with the **panoramic** `test-design` skill:

| Skill                  | Scope                                                 | When to use                                                                               |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `test-design`          | spec → REQ → FB → TC catalog → 8-check feature review | designing tests for a feature from scratch                                                |
| `test-case` (this one) | one or many TCs at a time, regardless of origin       | TC already exists and you need to improve / verify it, or you only need 1-2 cases written |

The two skills coexist; `test-design` Phase C may delegate the per-TC title format check here.

## Skill layout

```
.claude/skills/test-case/
├── SKILL.md                       (you are here — orchestrator)
├── README.md                      (user-facing intro)
├── modes/
│   ├── write.md                   (write mode detail)
│   ├── review.md                  (review mode detail)
│   ├── batch.md                   (batch review detail)
│   └── refactor.md                (refactor mode detail)
└── rules/
    ├── core.md                    (12 mode-agnostic checks C1-C12)
    ├── manual.md                  (4 manual-only checks M1-M4)
    ├── automation.md              (6 automation-only checks A1-A6)
    └── cross-tc.md                (4 cross-TC checks X1-X4, batch second pass)
```

## What this skill is NOT

- NOT a test code generator. Never write `.spec.ts`, `.test.ts`, Playwright, Vitest, Pytest files. Steps may describe API calls or selectors but as TC content, not as executable code.
- NOT a REQ/FB/scope designer. If the user needs REQ extraction or feature breakdown, hand off to `test-design`.
- NOT a TMS uploader. Output is markdown; the user copies it into Sheet/TestRail/Xray manually.
- NOT a place to commit real workplace specs. See Privacy below.

## Privacy (read first, enforce always)

Project rule is "no real workplace specs". Before writing any artifact to disk:

1. Scan input TCs for real-system signals: company names, internal URLs, real API endpoints / hostnames, real customer / employee names, proprietary product codes, internal Jira IDs.
2. If detected, stop and ask the user to either generalize (e.g. `pay.x-company.co.th` → `testpay.example.com`) or confirm scratch-only mode.
3. Default output location is the workspace folder requested by the user (typically `.test-design-scratch/<feature>/`, which is gitignored). Files written there are not committed.
4. Promotion to commit-ready folders requires explicit user confirmation AND fully generalized content.

If the user pastes a TC without saying anything, default to stdout (no file write) and warn if real-system signals are detected.

## Mode resolution (the entry-point decision)

Two axes apply to every invocation:

- **Operating mode** — what the skill does: `write` / `review` / `batch` / `refactor`
- **Target mode** — what kind of TC the rules judge against: `automation` (default) / `manual` / `both`

### Operating mode resolution

Parse user invocation:

| Intent              | Keywords (TH / EN)                              | Operating mode |
| ------------------- | ----------------------------------------------- | -------------- |
| Write new TC        | "ช่วยเขียน", "ขอ TC", "draft", "write"          | `write`        |
| Check 1-3 TCs       | "ตรวจ", "review", "audit", "ดูให้หน่อย"         | `review`       |
| Check many TCs      | "ทั้งชุด", "all", "batch", "ตรวจทั้งตาราง"      | `batch`        |
| Rewrite existing TC | "rewrite", "refactor", "ปรับ", "ให้ตรง pattern" | `refactor`     |

Heuristics if the keyword is ambiguous:

- ≥4 TCs detected in input → `batch` regardless of verb
- 1 TC + verb "ตรวจ/review" → `review`
- 1 TC + verb "rewrite/ปรับ" → `refactor`
- No TC in input, only context → `write`

If still unclear, ask back briefly: "ต้องการ write / review / batch / refactor ครับ?"

### Target mode resolution

Default: **automation**. Resolution order:

1. **Explicit** — user says "manual mode", "automation mode", "both" in the invocation → use that
2. **From Tags** — input TC has `automate-now` or `automate-later` → `automation`; has `manual-only` → `manual`
3. **From Layer** — `UI` alone + no automation tags often implies manual exploratory/visual context, but do NOT default to manual on Layer alone (most UI tests are now automated). Layer is a hint, not a decider.
4. **From Steps style** — if Steps already contain code-ish content (`POST /...`, `page.fill(...)`, `await ...`) → `automation`; if Steps contain "ตามอง", "สังเกต", "ลองคลิก" → `manual`
5. **Fallback** — if nothing tips the scale, default to **automation**

Always state the resolved target mode in the response so the user can correct.

### Combined invocation behavior

| Operating  | Target                 | Behavior summary                                                                                                                                                                         |
| ---------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `write`    | automation (default)   | Draft TC with stable selectors, atomic assertions, factory fixtures. Run all C + A checks before output.                                                                                 |
| `write`    | manual                 | Draft TC with prose steps, observable expected, optional cleanup notes. Run all C + M checks.                                                                                            |
| `write`    | both                   | Draft TC with split `Steps (UI)` + `Steps (API)` blocks; manual checks apply to UI block, automation checks apply to API block (or vice versa, based on which layer is being automated). |
| `review`   | (resolved)             | Run C + (M or A) checks, output verdict + fix suggestions.                                                                                                                               |
| `batch`    | (resolved per row)     | Run checks per row, emit summary table + per-row detail block.                                                                                                                           |
| `refactor` | (target = where to go) | Rewrite TC to target mode, emit diff with rationale per change.                                                                                                                          |

## Output location

- `review` mode default: stdout (no file write). User passes `--save <path>` or asks for it explicitly to write to disk.
- `batch` mode default: stdout summary + offer to write detailed report to `.test-design-scratch/<feature>/tc-review-<YYYY-MM-DD>.md` (or wherever the user points).
- `write` + `refactor` modes default: stdout. Offer to append to user's existing test cases file when provided.

Never write to commit-ready paths (e.g., `docs/`) without explicit user confirmation AND a privacy scan pass.

## Rule files (Read these before judging or producing TCs)

All checks are inline in three files. Each rule has an ID; the skill cites IDs in feedback so users can look up the rationale.

- `rules/core.md` — C1 to C12 (mode-agnostic): title format, atomicity, steps structure, expected specificity, preconditions, tags, layer, traceability
- `rules/manual.md` — M1 to M4 (manual-only): human-readable steps, approximate waits, cleanup notes, no privileged tooling
- `rules/automation.md` — A1 to A6 (automation-only): stable selectors, condition-based waits, factory fixtures, atomic assertions, explicit setup/teardown, no environment assumptions
- `rules/cross-tc.md` — X1 to X4 (cross-TC): redundancy, positive over-split, boundary symmetry, feasibility honesty. These judge the SET, not single TCs, so they run as a second pass in `batch` mode after the per-row checks; X4 also applies per-TC in `review` / `refactor`.

**Always Read the relevant rule files at the start of a session before producing output.** If you have already Read them in the current session, reuse them.

## Mode files (Read on entry to each operating mode)

- `modes/write.md` — write workflow + draft template
- `modes/review.md` — review workflow + per-TC verdict format
- `modes/batch.md` — batch workflow + summary table format
- `modes/refactor.md` — refactor workflow + diff format

## Invocation parsing

Accept any natural language after `/test-case` and infer intent. Examples:

| User says                                     | Operating mode     | Target mode                | Notes                                                    |
| --------------------------------------------- | ------------------ | -------------------------- | -------------------------------------------------------- |
| `/test-case ช่วยเขียน TC สำหรับ OTP timeout`  | write              | automation (default)       | Ask: ต้องการ manual หรือ automation? Default automation. |
| `/test-case review TC-014 [paste TC]`         | review             | resolved from tags / steps |                                                          |
| `/test-case ตรวจทั้งตารางใน 07-test-cases.md` | batch              | resolved per row           | Read file, parse, run all checks                         |
| `/test-case refactor TC-014 ไป automation`    | refactor           | automation                 |                                                          |
| `/test-case [paste 1 TC, no verb]`            | review (heuristic) | resolved                   |                                                          |
| `/test-case [paste table of 10 TCs]`          | batch              | per row                    |                                                          |

If feature folder is implied (e.g., user references TC-IDs from a feature), check `.test-design-scratch/<feature>/_state.json` for context (layer scope, testing goal). Do not require it; absence is fine.

## Methodology references

- **Primary anchor:** ISTQB Foundation Level Syllabus v4.0 Section 4.1 (test conditions, test cases). Use when justifying atomicity / traceability.
- **Title naming convention:** xUnit Test Patterns (Meszaros, 2007), Art of Unit Testing (Osherove), BDD/Gherkin (North). All converge on subject + scenario + expected.
- **Optional team playbook:** if `_team-notes/qa-playbook.md` or similar exists in workspace, treat its Section 4 (Phase 4 Test Case Design) + Section 5 (Format guidance) as authoritative for team-specific tags + columns. Skill defers when present; otherwise inline rules apply.
- **Sibling skill:** `test-design` Phase B.3 (test-case rules) and Phase C bonus check (TC title format) — same Title pattern, same Tag vocabulary. The two skills do not contradict.

## Style rules for artifacts

- No em dash. Use comma, colon, or new sentence.
- No section symbol. Spell out "Section X".
- Thai prose: natural conversational tone, not machine-translation.
- Tables use `-` for N/A cells, not `—`.
- When citing a rule, use the rule ID (e.g., `C1`, `A2`) so the user can look it up.

## When to refuse

Refuse politely (do not produce output) if:

- User asks for test code (.spec.ts, .test.ts, etc.) — redirect: "skill นี้ออกแบบ TC ในรูป markdown ไม่ผลิต test code"
- User pastes real-system content and refuses to generalize — redirect: "ต้องการ generalize ก่อน หรือยืนยัน scratch-only?"
- User asks for REQ extraction or feature breakdown — redirect to `test-design`

## Quick start

```
You: /test-case ช่วยเขียน TC: OTP กรอกเกิน 3 นาที expired

Claude: Target mode: automation (default) หรือ manual? (Layer: UI / API / Both?)
You: automation, API

Claude: [reads rules/core.md + rules/automation.md, drafts TC]
        [self-runs C1-C12 + A1-A6, revises until all pass]
        [outputs TC + checklist summary]
```

```
You: /test-case ตรวจ [paste TC table 30 rows from 07-test-cases.md]

Claude: Operating mode: batch. Target mode: resolved per row from Tags column.
        [reads rules/core.md + rules/manual.md + rules/automation.md]
        [parses 30 rows, runs checks]
        [outputs summary table: TC-ID | verdict | failed checks | fix hint]
        [asks: ดู detail row ไหน, หรือ save detailed report ที่ไหน?]
```
