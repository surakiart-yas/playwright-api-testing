---
phase: A
artifacts: 01-reqs.md, 02-scope.md, 03-flow.md, 04-questions.md
gate: A
parent_skill: test-design
---

# Phase A — Scope (4 artifacts)

All four artifacts are required. This phase implements the chain **Spec → REQ → Test condition (FB) → TC** — REQ extraction comes **before** scope because scope is a boundary decision made over an existing REQ list (atomic rules must exist first, then we decide which subset to test plus what is out of scope).

> Inline rules below are authoritative. **Optional deeper context (testbydesign repo only):** `src/content/docs/th/practice/ticket-to-scope.mdx`.

**Sub-feature grouping (recommended on all Phase A + B artifacts):** identify 5-9 sub-feature groups based on spec areas (e.g. `G1 Form & Required Fields`, `G2 State Machine`, `G3 Field Rules per State`, `G4 Delete`, `G5 List View`). This is **distinct from test condition category** (input-validation / state-transition / etc. used in Phase B): sub-feature groups are organizational navigation tied to spec areas, while test condition categories are ISTQB classifications used for technique mapping.

## Structure: overview vs detail

Pick per artifact based on content size, NOT per-split-by-default.

| Mode                                                     | When to use                                                                         | Pattern                                                                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Overview** (preferred for short-row artifacts)         | each row is 1-2 lines (e.g., REQ list, RTM, scope items, technique map, questions)  | single unified table with **Sub-feature column expanded to full name inline** (`G1 Form & Required Fields`, not just `G1`) |
| **Detail per-group** (preferred for meaty-row artifacts) | each item has multi-line content (e.g., FB 4-properties block, TC steps + expected) | per-group H2 sections with scoped tables / blocks                                                                          |

**Anti-pattern to avoid:** splitting overview-style artifacts into per-group sections when each section has only 1-2 rows — wastes space, adds heading overhead, makes scan harder. Common case where this happens: scope `Out of scope` (5-7 boundary items spread across groups = use overview); REQ list (28 REQs short rows = use overview).

**Common pattern (top + body):**

```
# Artifact title

## Distribution / summary stats (always — bird's-eye view at top)

## Body
   - If rows short: single unified table with Sub-feature inline
   - If rows meaty: per-group H2 sections with scoped tables/blocks
```

**Per-artifact recommendation:**

- `01-reqs.md` → overview (REQs are 1-line)
- `02-scope.md` → overview (boundary items short, 1-2 per group)
- `03-flow.md` → matrix view (Operation × State); Sub-feature column with full name inline
- `04-questions.md` → overview by status (decided/deferred); Sub-feature + Test condition category as columns
- `05-breakdown.md` → **detail per-group** (each FB has 4-properties block — meaty)
- `06-technique-map.md` → overview (technique mapping 1-line)
- `07-test-cases.md` → compact table-per-FB (1 row = 1 TC, scannable; `Both` layer uses `UI: ... <br>API: ...` in cells)
- `08-rtm.md` → overview (matrix rows 1-line)
- `09-review.md` → audit checklist linear flow

Both axes (sub-feature group + ISTQB test condition category) can coexist as separate columns where useful (especially `04-questions.md`).

**Scope vs REQ granularity (avoid duplicate):** REQ list (`01-reqs.md`) is atomic rule level ("ระบบต้องทำอะไร"). Scope (`02-scope.md`) is boundary level ("ทดสอบขอบเขตไหน") — list sub-feature groups + REQ count + REQs covered. **Do NOT list individual REQ rules in scope** — that duplicates `01-reqs.md`. Scope's job is boundary decision, out of scope, and assumptions.

**Out of scope policy:** include only items that are boundary (other system), deferred (will test later), edge case (intentional non-coverage), or assumption (explicit limitation). Features that the system does not have at all are NOT scope decisions — do not list them as "out of scope".

## A.1 → `01-reqs.md` (REQ list, extracted from spec / UAT / AC — do not skip)

Extract testable requirements from the spec source first. Each REQ must be atomic (one rule), testable (verb "ระบบต้อง..." / "User ต้องสามารถ..."), and source-traceable.

Format:

| REQ-ID  | Group | Description                                                                    | Source                                |
| ------- | ----- | ------------------------------------------------------------------------------ | ------------------------------------- |
| REQ-001 | G1    | ระบบต้อง [behavior] เมื่อ [condition]                                          | spec section X.Y / UAT-N / US-042-AC1 |
| REQ-XXX | G?    | [derived requirement สำหรับ cross-cutting concern เช่น security, API contract] | `derived`                             |

The `Group` column references the sub-feature groups defined at the top of `01-reqs.md`. List groups (G1-Gn) in a separate table before the REQ rows so readers see the spec areas at a glance.

Rules:

- IDs are sequential from REQ-001 (or reuse Jira AC IDs if BA/SA uses Jira, e.g. `US-042-AC1`)
- If a single spec sentence rolls up multiple rules, split into multiple REQs
- Flag **derived REQs** (security, API contract, permission, accessibility that spec did not mention) with `source: derived` and surface them back to BA/SA for review
- Extraction rules per spec format (REQ list / UAT / AC / PRD / API spec) — if your workspace has a team playbook, defer to it for project-specific extraction conventions; otherwise apply general principle: each AC bullet → 1 REQ; each "ระบบต้อง..." sentence → 1 REQ; each negative rule ("ระบบต้องไม่...") → 1 REQ

## A.2 → `02-scope.md` (boundary decision over REQ list)

- **In scope:** sub-feature groups (G1-Gn) with REQ count + linked REQ-IDs, NOT rule-by-rule list (REQ-IDs are in `01-reqs.md`)
- **Out of scope:** boundary / deferred / edge case / assumption only (do not list "features the system does not have")
- **Assumptions:** what must be true before testing begins

## A.3 → `03-flow.md`

- **Transition table (primary view for state machines)** — per ISTQB Section 4.2.4 + Copeland _Practitioner's Guide_ ch.7. Each row = 1 transition, maps 1:1 to a test case. Include valid transitions (positive) AND invalid transitions (negative — must reject). Columns: From state | Trigger | To state | Lock-in / side effect | TC link.
- **Visual diagram (secondary, optional)** — **minimalist Mermaid** showing only the **linear happy path** (3-5 states, no self-loops, no long labels, no alternate paths). Reader should see "state flow at a glance" in 1 second. Document alternate paths / terminal variants / self-loops in the transition table only — adding them to Mermaid causes auto-layout to tangle (recurring issue with arrows crossing, labels overlapping). If even the minimalist diagram causes confusion, omit Mermaid entirely; the transition table is sufficient.
- State × Operation grid: each cell is `✓` (allowed) / `-` (N/A) / `? open-XXX` (open question, where XXX is the question ID in A.4). Sub-feature column with full name inline.

**Why transition table over visual diagram:** state diagrams with self-loops and long labels become tangled when rendered. Transition tables are scan-friendly, copy-paste to Sheet directly, and force documentation of invalid transitions (negative cases) that diagrams often hide.

## A.4 → `04-questions.md`

- Markdown table with columns: `# | Sub-feature | Test condition category | Question | Ask | Status`
- `Sub-feature` references G1-Gn defined in `01-reqs.md` (or `-` if cross-cutting / not tied to a group)
- `Test condition category` is the ISTQB classification: `business-logic` / `ui-ux` / `validation` / `permission` / `architecture` / `integration` / `non-functional`
- Every `?` in A.3 must have a row here
- `Status` is one of: `open` / `decided: <answer>` / `deferred: <reason>`

## 🛑 Gate A

Refuse to start Phase B if any of the following:

- Any row in `04-questions.md` has `status: open`
- `01-reqs.md` is empty or missing (no REQ list = no traceability later)
- Any REQ has unclear or missing `Source` (cannot trace back to spec)

Tell the user the specific gap. They must get answers / extract REQs / clarify sources before proceeding. Update `_state.json` to `{"phase": "B", "gate_a_passed": true}` only when all three checks pass.
