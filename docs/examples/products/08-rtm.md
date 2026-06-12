# products — 08 RTM (REQ → TC traceability)

> Derived from `07-test-cases.md` — every 07 TC must be mapped here; totals stay in sync.
> Verified mechanically by `pnpm check:consistency`.

| REQ     | Covered by                     | Status                                         |
| ------- | ------------------------------ | ---------------------------------------------- |
| REQ-001 | TC-001, TC-002, TC-016         | covered                                        |
| REQ-002 | TC-003, TC-004, TC-005, TC-006 | covered (TC-006 RED-by-design — seeded BUG #1) |
| REQ-003 | TC-007, TC-016                 | covered (happy path via flow)                  |
| REQ-004 | TC-008, TC-009, TC-010         | covered (TC-010 RED-by-design — seeded BUG #2) |
| REQ-005 | TC-011, TC-012, TC-013         | covered                                        |
| REQ-006 | TC-014, TC-015, TC-016         | covered                                        |
| REQ-007 | TC-016                         | covered                                        |
| REQ-008 | —                              | **GAP (deliberate)** — learner exercise 1      |

Totals: 16 TCs in 07 ↔ 16 mapped here ↔ 16 in code (`tests/products/`).
RED-by-design: TC-006, TC-010 (no scope tags; visible in full runs only).
