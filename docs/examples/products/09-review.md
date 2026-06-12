# products — 09 Review (Gate C audit snapshot)

> **Snapshot artifact** — a point-in-time self-review; 07/08 carry the live totals.

## Checklist

| Check                                                       | Result                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| Every REQ has a TC or a recorded gap                        | ✅ REQ-008 gap is deliberate + documented (exercise 1)       |
| One TC per negative partition; positives not multiplied     | ✅ FB-002 has one TC per error class; one canonical positive |
| Boundary cases present where ranges exist                   | ✅ TC-009 (page beyond last)                                 |
| Every TC falsifiable (would go red if the feature broke)    | ✅ incl. TC-012's post-reject readback                       |
| RED-by-design cases assert the CONTRACT, carry no scope tag | ✅ TC-006, TC-010                                            |
| Flow tests verify composition, not re-test contracts        | ✅ TC-016                                                    |
| Code ↔ 07 ↔ 08 consistent                                   | ✅ `pnpm check:consistency` green                            |

## Known limitations (honest list)

- REQ-008 (state machine) has zero automated coverage until exercise 1 is done.
- List tests rely on unique name-prefix filtering for parallel isolation — a backend
  that ignored `q` would break them collectively (acceptable: TC-008 would go red).
- No auth dimension — the exemplar API is public by design.
