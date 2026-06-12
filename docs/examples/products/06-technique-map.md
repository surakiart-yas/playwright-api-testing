# products — 06 Technique Map (Gate B)

> **Snapshot artifact** — same banner treatment as 05; 07 is the living catalog.

| FB     | Technique(s)                     | How applied                                                                                                                       |
| ------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| FB-001 | Equivalence Partitioning         | one canonical valid input (all rules pass at once) + the optional-field partition (stock omitted)                                 |
| FB-002 | EP on error classes              | one TC per partition: missing required (×2 fields worth: name, price), invalid value (negative price), uniqueness (duplicate sku) |
| FB-003 | Error guessing                   | unknown id → 404 (happy 200 covered by FB-007 flow, not duplicated)                                                               |
| FB-004 | BVA + output-projection check    | page beyond last (boundary), filtered list contents, internal-field absence                                                       |
| FB-005 | EP + state readback              | valid partial update, invalid value + verify-no-mutation, unknown id                                                              |
| FB-006 | State transition (exists → gone) | delete then 404 readback; delete unknown id                                                                                       |
| FB-007 | Use-case testing                 | one end-to-end CRUD scenario; steps narrate the lifecycle                                                                         |
