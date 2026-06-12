---
phase: C
artifact: 09-review.md
gate: user-acknowledgment
parent_skill: test-design
---

# Phase C — Self-Review → `09-review.md`

Audit the output without input from the user. 8 checks (matches playbook Section 6 Phase 6):

1. **Coverage audit:** every spec rule maps to ≥1 TC-ID. Also verify REQ traceability (every REQ-ID has ≥1 FB + ≥1 TC link). Flag REQs marked `source: derived` not yet surfaced to BA/SA.
2. **Technique distribution:** histogram of technique counts. Flag if any one technique > 60% of cases.
3. **Granularity audit:** count TCs per FB. Flag FBs with > 15 TCs (consider splitting) or < 2 TCs (consider merging). Also check TC-ID continuity (no missing numbers in sequence).
4. **Layer balance audit:** count `UI` / `API` / `Both` TCs. If Phase 0 chose `both`, flag if any layer < 10%. For every `Both`-labeled TC, confirm both UI and API steps + expected are non-empty.
5. **Tag sanity:** every TC has ≥1 suite tag (`smoke` / `regression` / `sanity`) + ≥1 automation hint tag.
6. **Priority distribution:** count critical / high / medium / low. Flag if critical > 30% or low > 60%.
7. **Open questions sanity:** every row in `04-questions.md` is `decided` or `deferred`. Flag any flipped back to `open`.
8. **TC inflation audit (Risk-based filter):** avg TCs per FB > 4 → flag as potential over-testing, recommend Risk re-classification or Pairwise reduction. FBs exceeding budget > 50% without Risk re-classification → flag.

**Bonus checks (optional, beyond core 8):**

- **Ambiguity:** TCs depending on assumptions not in `02-scope.md` Assumptions
- **TC title format:** titles follow `[Subject]: [scenario] → [expected]` pattern (per Phase B.3); flag vague titles ("test login", "All fields filled")

The skill is not done until the user acknowledges the review and either fixes the flagged items or accepts them as known.

**After Phase C:** test design phase is complete. **Execution + result collection is outside skill scope** — for execution workflow (manual + automation), defect tracking, run types (smoke/regression/etc.), metrics, and tooling, refer to a team playbook if your workspace has one (`_team-notes/qa-playbook.md` or similar).
