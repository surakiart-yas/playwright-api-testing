---
rule_set: cross-tc
applies_to: a SET of TCs (batch mode); X4 also applies per-TC in review/refactor
check_count: 4
parent_skill: test-case
---

# Cross-TC rules (X1-X4)

These judge the TC **set**, not individual TCs. The per-row checks (C1-C12) catch a TC that
does too much; these catch the inverse and the gaps — redundancy across rows, over-split
positives, lopsided boundaries, and dishonest feasibility. They are the second pass in batch
mode (you need the whole set to see them). X4 also applies per-TC in review / refactor.

Why this matters: a catalog can pass every per-row check and still be bloated (the same
condition tested three times) or holey (a boundary tested on only one side). That shows up
only when you compare rows.

---

## X1 — Redundancy (no two TCs test the same condition)

**Rule:** No two TCs should share the same essential `input partition × expected outcome`.
If two TCs drive the same observable from the same input class, they are one test condition
wearing two hats — merge them. A TC can trace to several FB / REQ IDs (see C12), so merging
loses no coverage; it just removes a duplicate.

**Smell signals:**

- identical Steps + Expected under different TC-IDs (often split because each traces a
  different FB)
- the same outcome ("active login returns a full session") tested once per FB that happens
  to mention it

**Fix:** keep one canonical TC, add the other FB/REQ IDs to its trace, and record the merge
in the RTM removed/merged table so traceability stays auditable.

**Example:** "ACTIVE + correct password → full session" and "ACTIVE user → routed straight
in" are the same input and the same expected. Merge into one, trace both FBs.

---

## X2 — Positive over-split (one valid input covers all passing rules)

**Rule:** For a set of validation rules, you need ONE positive that satisfies all of them at
once, plus one negative per rule violated. Several positives that each assert "valid →
success" are redundant — a single valid input already exercises every rule passing.

This is the asymmetry people miss: **negatives split per rule** (each violation is a distinct
partition worth localizing), **positives do not** (passing is not N partitions, it is one).

**Smell:** 3+ positive TCs under different rules all asserting a 2xx success with a valid input.

**Fix:** collapse to one canonical positive. Keep an extra positive ONLY when it pins a real
boundary value (see X3) or a genuinely different success path (a different side effect, or a
precondition that changes the behavior — not just a different-but-still-valid input).

**Example:** "all complexity rules pass → 200", "differs from temp → 200", and "differs from
old → 200" reduce to one valid-input positive. The distinct conditions are the negatives
(same-as-temp → one code, same-as-old → another).

---

## X3 — Boundary symmetry / partition completeness

**Rule:** Every boundary tested on one side should have its partner, and every partition the
spec names should have a case. BVA pairs are (min-1 reject / min accept) and (max accept /
max+1 reject). A suite with "length 7 → reject" and "length 129 → reject" but no "length 8 →
accept" or "length 128 → accept" has lopsided boundaries — the accept side of each boundary
is untested.

Also flag enum gaps: if `status ∈ {ACTIVE, INACTIVE, SUSPENDED}` and only ACTIVE + INACTIVE
are exercised, SUSPENDED is an uncovered partition.

**Fix:** add the missing on-point boundary or partition. If a partition is provably
equivalent to another (same code path, same observable — confirm from the spec/flow), note
that instead of adding a redundant case. Do not add a case just to fill a grid; add it
because the value or partition is genuinely distinct.

---

## X4 — Feasibility honesty

**Rule:** A TC's automation-hint tag must match what is physically automatable in CI. If
meeting the precondition requires waiting real time (a 7-day expiry, a 90-day password, an
8-hour idle window), depends on a backend behavior not yet built, or needs tooling the suite
does not have (DB backdating, a privileged token the API will not mint), it is `manual-only`
— not `automate-now`.

Mislabeling produces either flaky tests (real `sleep`s) or false greens (a "passing" test
that never actually reached the condition it claims to verify).

**Fix:** retag `manual-only`; in implementation it becomes `test.skip(true, reason)` with the
manual procedure in a comment. Feasibility depends on the environment's hooks, though — if a
bypass or seed hook EXISTS that removes the wait (e.g. a fixed value that satisfies a
must-change login, or an endpoint that backdates a timestamp), the case can be `automate-now`.
So confirm the available hooks rather than assuming a time-based case is always manual.

---

## Quick reference (cheatsheet)

| ID  | Rule                | Flag when                                                     |
| --- | ------------------- | ------------------------------------------------------------- |
| X1  | Redundancy          | two TCs share input partition + expected (dup, often by FB)   |
| X2  | Positive over-split | many positives all asserting "valid → success"                |
| X3  | Boundary symmetry   | one side of a boundary / one partition untested               |
| X4  | Feasibility honesty | `automate-now` on a time-based / not-yet-built / no-tool case |
