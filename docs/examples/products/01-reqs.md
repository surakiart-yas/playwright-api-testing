# products — 01 Requirements (REQ list)

> Worked example of the `/test-design` artifact set, kept deliberately small. Source of
> every REQ: `docs/openapi/openapi(products).yaml`. (In a real feature this table is
> extracted from the spec / user stories / acceptance criteria — one behavior per row.)

| REQ     | Group | Requirement                                                                                                                                                                                | Source                            |
| ------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| REQ-001 | G1    | The system must create a product from name/sku/price (stock optional, default 0); status starts `draft`                                                                                    | spec `POST /products`             |
| REQ-002 | G1    | The system must reject creation when a required field is missing (VALIDATION_FAILED), a value is invalid (INVALID_DATA), or the sku already exists (DUPLICATE) — errorData names the field | spec `POST /products` 400/409     |
| REQ-003 | G2    | The system must return a product by id, and NOT_FOUND for an unknown id                                                                                                                    | spec `GET /products/:id`          |
| REQ-004 | G2    | The system must list products filtered by name prefix / status with pagination metadata, projecting internal fields (costPrice) away                                                       | spec `GET /products`              |
| REQ-005 | G3    | The system must partially update name/price/stock; an invalid value is rejected (INVALID_DATA) without mutating; unknown id → NOT_FOUND                                                    | spec `PATCH /products/:id`        |
| REQ-006 | G3    | The system must hard-delete a product; unknown id → NOT_FOUND                                                                                                                              | spec `DELETE /products/:id`       |
| REQ-007 | G4    | The CRUD operations must compose: a created product is listable, fetchable, updatable, and gone after delete                                                                               | spec (cross-endpoint)             |
| REQ-008 | G5    | The status state machine must allow only `draft → published → archived` (archived terminal)                                                                                                | spec `PATCH /products/:id/status` |

Groups: G1 Create & Validation · G2 Read (get/list) · G3 Mutate (update/delete) ·
G4 Lifecycle composition · G5 State machine.

**Deferred:** REQ-008 has no AOM coverage yet — it is the hands-on exercise
([docs/exercises.md](../../exercises.md) exercise 1). Tracked here so the RTM shows the
gap honestly instead of hiding it.
