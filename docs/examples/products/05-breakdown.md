# products — 05 Feature Breakdown (Gate B design)

> **Snapshot artifact** — counts may lag the living catalog. `07-test-cases.md` is the
> source of truth for TC values/tags/totals; don't chase cells here (see
> `.claude/rules/traceability.md`).

| FB     | Title                             | REQ     | Test condition category      | Risk | TC budget |
| ------ | --------------------------------- | ------- | ---------------------------- | ---- | --------- |
| FB-001 | Create — happy + defaults         | REQ-001 | input/output behavior        | M    | 2         |
| FB-002 | Create — validation classes       | REQ-002 | input validation             | M    | 4         |
| FB-003 | Get by id — errors                | REQ-003 | error handling               | L    | 1         |
| FB-004 | List — filter, paging, projection | REQ-004 | output projection / boundary | H    | 3         |
| FB-005 | Update — partial semantics        | REQ-005 | input validation / state     | M    | 3         |
| FB-006 | Delete — removal + errors         | REQ-006 | state / error handling       | L    | 2         |
| FB-007 | CRUD lifecycle composition        | REQ-007 | end-to-end flow              | M    | 1         |

Total budget: **16 TC**. (FB for REQ-008 / state machine intentionally not opened —
deferred to the exercise; see 02-scope.)

Each FB satisfies the 4 properties: traceable (REQ column), testable (observable API
response), bounded (one endpoint or one composition), risk-rated (drives the budget).
