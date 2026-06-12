# api-automation-template

Playwright API automation **teaching template** — the product is the framework design
(layers + ADRs + rules), demonstrated by a minimal runnable suite against a bundled
offline mock (`pnpm test`, no secrets, no network).

Pattern: **API Object Model (AOM)** — one client class per service domain.

> `products` is the FULL reference service. Its AOM layer (`src/services/products/`),
> runtime provisioning (`tests/products/provisioner.ts`), and specs (`tests/products/`)
> are the shape to copy for new services. `orders` is the minimal second exemplar
> (cross-service dependency). The `/implement-api-tests` skill scaffolds from there.
>
> ⚠️ `mock/server.ts` contains **2 deliberately seeded bugs** (header comment) and
> `tests/products/` contains the 2 RED-by-design specs that catch them (TC-006, TC-010).
> Never "fix" the bugs or weaken those assertions — they are teaching material.
> `pnpm test` = 18 green + 2 red BY DESIGN; the green gate is `pnpm test:regression`.

## Task Router

| Task                                                                | Go to                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Why is X the way it is?**                                         | `docs/decisions.md` — read FIRST if unsure why a convention exists |
| Learn / explain the framework design                                | `LEARNING-PATH.md` (10 lessons) + `docs/architecture.md`           |
| Design test cases (analysis → scope → breakdown → catalog → review) | `/test-design` skill                                               |
| Review / refactor individual test cases against rubric              | `/test-case` skill                                                 |
| Add new service / implement tests from a catalog                    | `/implement-api-tests` skill                                       |
| Add endpoint to existing service                                    | `CONTRIBUTING.md` → "Add a new endpoint" (+ `docs/exercises.md` 1) |
| Cut a release / bump version / tag                                  | `CONTRIBUTING.md` → "Releasing" (+ `CHANGELOG.md`, SemVer 0.x)     |
| Write / tag / name a test                                           | `.claude/rules/testing.md`                                         |
| **Changed a TC/FB/REQ — what else to update?**                      | `.claude/rules/traceability.md` (+ run `pnpm check:consistency`)   |
| Schema / BaseClient / BaseValidator rules                           | `.claude/rules/api-patterns.md`                                    |
| Fixture scopes / provisioning                                       | `.claude/rules/fixtures.md`                                        |
| Test case strategy (isolated vs flow, coverage)                     | `docs/test-strategy.md`                                            |
| Test organization (folders, tags, Allure grouping)                  | `docs/test-organization.md`                                        |
| Worked test-design artifact set (01→09)                             | `docs/examples/products/` (07 is the TC source of truth)           |
| Hands-on exercises                                                  | `docs/exercises.md`                                                |
| CI gate / growing CI for live envs                                  | `docs/cicd-pipeline.md` + `.github/workflows/pr-gate.yml`          |
| Exemplar API contract                                               | `docs/openapi/openapi(products).yaml`                              |
| Mock behavior / seeded bugs                                         | `mock/server.ts` (header lists the bugs)                           |

## Service Registry

| Service    | `src/services/` | `tests/`                                                           |
| ---------- | --------------- | ------------------------------------------------------------------ |
| `products` | `products/`     | `products/` (16 TCs incl. 2 RED-by-design; provisioner; CRUD flow) |
| `orders`   | `orders/`       | `orders/` (no TC-IDs yet — exercise 4; cross-service flow)         |

When adding a service: registry row here + `@<svc>` in `scripts/check-consistency.sh`
ALLOWED + (optionally) endpoints in `mock/server.ts`.

## Key Files

| File                            | Purpose                                                               |
| ------------------------------- | --------------------------------------------------------------------- |
| `src/core/types.ts`             | `ApiConfig`, `ApiResponse<T>` (code `'OK'` envelope), `HttpStatus`    |
| `src/core/BaseClient.ts`        | HTTP base — `get/post/put/patch/del`, auto response-time check        |
| `src/core/BaseValidator.ts`     | `expectStatus`, `expectSchema` (Zod), `expectErrorData`, `verify` box |
| `src/services/<svc>/schemas.ts` | Zod schemas — SINGLE SOURCE; response types inferred via `z.infer`    |
| `src/fixtures/base.ts`          | Worker-scoped `workerRequest`; test-scoped `apiConfig`                |
| `tests/products/provisioner.ts` | Runtime provisioning reference (create/recycle/cleanup)               |
| `src/config/api-config.ts`      | `loadApiConfig()` — env vars; defaults to the mock URL                |
| `src/utils/random.ts`           | `randomAlphanumericCode()`, `randomUUID()`                            |
| `mock/server.ts`                | Offline Hono backend (port 8787) + seeded bugs                        |
