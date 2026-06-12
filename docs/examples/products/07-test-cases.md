# products — 07 Test Cases (SOURCE OF TRUTH)

> The living catalog. Every TC's value/tag/title lives HERE; code must match it, and
> `08-rtm.md` is derived from it. Run `pnpm check:consistency` after any change.
> Tags column: only `@isolated/@flow/@smoke/@regression/@products` are runnable code
> tags; `negative`/`boundary`/`api-contract`/`red-by-design` are descriptors.

## Summary

| FB        | Title                             | TCs    | Smoke | RED-by-design |
| --------- | --------------------------------- | ------ | ----- | ------------- |
| FB-001    | Create — happy + defaults         | 2      | 1     | 0             |
| FB-002    | Create — validation classes       | 4      | 0     | 1 (TC-006)    |
| FB-003    | Get by id — errors                | 1      | 0     | 0             |
| FB-004    | List — filter, paging, projection | 3      | 1     | 1 (TC-010)    |
| FB-005    | Update — partial semantics        | 3      | 0     | 0             |
| FB-006    | Delete — removal + errors         | 2      | 0     | 0             |
| FB-007    | CRUD lifecycle composition        | 1      | 1     | 0             |
| **Total** |                                   | **16** | **3** | **2**         |

Layer split: 15 isolated / 1 flow. All 16 automated (no manual-only TCs in this feature).

## FB-001 Create — happy + defaults

| TC     | Title                                     | Expected                                              | Tags                        | Spec           |
| ------ | ----------------------------------------- | ----------------------------------------------------- | --------------------------- | -------------- |
| TC-001 | should create a product with valid fields | 201 OK · echoes name/sku/price/stock · status `draft` | isolated, smoke, regression | create.spec.ts |
| TC-002 | should default stock to 0 when omitted    | 201 OK · stock = 0                                    | isolated, regression        | create.spec.ts |

## FB-002 Create — validation classes

| TC     | Title                                        | Expected                                                      | Tags                                  | Spec           |
| ------ | -------------------------------------------- | ------------------------------------------------------------- | ------------------------------------- | -------------- |
| TC-003 | should reject creation when name is missing  | 400 VALIDATION_FAILED · errorData `[{name, body, required}]`  | isolated, regression, negative        | create.spec.ts |
| TC-004 | should reject a negative price               | 400 INVALID_DATA · errorData `[{price, invalid}]`             | isolated, regression, negative        | create.spec.ts |
| TC-005 | should reject a duplicate SKU                | 409 DUPLICATE · errorData `[{sku, duplicate}]`                | isolated, regression, negative        | create.spec.ts |
| TC-006 | should reject creation when price is missing | 400 VALIDATION_FAILED · errorData `[{price, body, required}]` | isolated, negative, **red-by-design** | create.spec.ts |

> **TC-006 is RED by design** — mock seeded BUG #1 accepts the missing price (201). The
> test asserts the contract and stays red; no scope tags until the "backend" fixes it.
> Do not change the expected to match the bug.

## FB-003 Get by id — errors

| TC     | Title                                        | Expected      | Tags                           | Spec              |
| ------ | -------------------------------------------- | ------------- | ------------------------------ | ----------------- |
| TC-007 | should return 404 for a non-existent product | 404 NOT_FOUND | isolated, regression, negative | get-by-id.spec.ts |

## FB-004 List — filter, paging, projection

| TC     | Title                                                        | Expected                                           | Tags                                      | Spec         |
| ------ | ------------------------------------------------------------ | -------------------------------------------------- | ----------------------------------------- | ------------ |
| TC-008 | should list created products with pagination metadata        | 200 OK · filtered items match · total/page correct | isolated, smoke, regression               | list.spec.ts |
| TC-009 | should return an empty page beyond the last page             | 200 OK · items `[]` · total intact (boundary)      | isolated, regression, boundary            | list.spec.ts |
| TC-010 | should not expose the internal costPrice field on list items | 200 OK · every item has NO `costPrice` key         | isolated, api-contract, **red-by-design** | list.spec.ts |

> **TC-010 is RED by design** — mock seeded BUG #2 leaks `costPrice` on list items. Same
> rules as TC-006. The `looseObject` schema is what keeps the leaked key visible to the
> assertion (decisions §13).

## FB-005 Update — partial semantics

| TC     | Title                                                      | Expected                                                           | Tags                           | Spec           |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------ | -------------- |
| TC-011 | should update name and price without touching other fields | 200 OK · sent fields changed · stock/sku untouched                 | isolated, regression           | update.spec.ts |
| TC-012 | should reject a negative stock value                       | 400 INVALID_DATA `[{stock, invalid}]` · readback shows no mutation | isolated, regression, negative | update.spec.ts |
| TC-013 | should return 404 when updating a non-existent product     | 404 NOT_FOUND                                                      | isolated, regression, negative | update.spec.ts |

## FB-006 Delete — removal + errors

| TC     | Title                                                  | Expected                                | Tags                           | Spec           |
| ------ | ------------------------------------------------------ | --------------------------------------- | ------------------------------ | -------------- |
| TC-014 | should delete a product                                | 200 OK empty data · follow-up GET → 404 | isolated, regression           | delete.spec.ts |
| TC-015 | should return 404 when deleting a non-existent product | 404 NOT_FOUND                           | isolated, regression, negative | delete.spec.ts |

## FB-007 CRUD lifecycle composition

| TC     | Title                                                    | Expected                                               | Tags                    | Spec               |
| ------ | -------------------------------------------------------- | ------------------------------------------------------ | ----------------------- | ------------------ |
| TC-016 | Product CRUD flow: create → list → get → update → delete | each step's state visible to the next; final GET → 404 | flow, smoke, regression | flows/crud.spec.ts |

## Revision Log

| Date       | Change                                    | By       |
| ---------- | ----------------------------------------- | -------- |
| 2026-06-12 | Initial catalog (16 TCs, 2 RED-by-design) | template |
