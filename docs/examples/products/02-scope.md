# products — 02 Scope

## In scope (this feature, API layer)

- `POST /products`, `GET /products`, `GET /products/:id`, `PATCH /products/:id`,
  `DELETE /products/:id` — contract + behavior (REQ-001..007).
- Error envelope correctness: business `code` + `error` key + per-field `errorData`.
- Internal-field projection on reads (costPrice must never appear) — REQ-004.

## Out of scope / deferred

| Item                                   | Why                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `PATCH /products/:id/status` (REQ-008) | Reserved as the learner exercise (docs/exercises.md exercise 1)             |
| AuthN/AuthZ paths                      | The exemplar API is public; see fixtures rule for the protected-API pattern |
| Performance / load                     | Out of suite scope — see docs/decisions.md §20                              |
| UI                                     | API-only template                                                           |

## Risks driving the TC budget

| Risk                                                           | Level | Drives                             |
| -------------------------------------------------------------- | ----- | ---------------------------------- |
| Validation classes conflated (missing vs invalid)              | M     | FB-002 one TC per error class      |
| Internal field leak on list (projection differs per read path) | H     | FB-004 dedicated absence TC        |
| Partial update applying partially on rejection                 | M     | FB-005 post-reject readback        |
| Shared mutable list state across parallel workers              | M     | unique-prefix filtering convention |
