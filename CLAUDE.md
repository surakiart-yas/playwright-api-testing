# api-automation-template

Playwright API automation framework — **API Object Model (AOM)** pattern, targeting the
[GoRest public practice API](https://gorest.co.in/public/v2).

Pattern: one client class per service domain (`users`, `posts`, `comments`, `todos`).

## Task Router

| Task                                      | Go to                                                              |
| ----------------------------------------- | ------------------------------------------------------------------ |
| **Why is X the way it is?**               | `docs/decisions.md` — read FIRST if unsure why a convention exists |
| test / fixture / AOM คืออะไร (พื้นฐาน)    | `docs/concepts.md`                                                 |
| Learn the framework design                | `LEARNING-PATH.md` + `docs/architecture.md`                        |
| ดู test cases ของแต่ละ resource           | `docs/test-plans/<resource>.md`                                    |
| Write / tag / name a test                 | `.claude/rules/testing.md` (naming, tags, assertion style)         |
| Add new service / implement tests         | `CONTRIBUTING.md` → "Add a new service"                            |
| Add endpoint to existing service          | `CONTRIBUTING.md` → "Add a new endpoint"                           |
| **Changed a TC — what else to update?**   | `.claude/rules/traceability.md` (+ run `pnpm check:consistency`)   |
| Schema / BaseClient / BaseValidator rules | `.claude/rules/api-patterns.md`                                    |
| Fixture scopes / provisioning             | `.claude/rules/fixtures.md`                                        |
| CI / testing strategy                     | `docs/testing.md`                                                  |

## Service Registry

| Resource   | `src/services/` | `tests/`    | `docs/test-plans/` | Status                            |
| ---------- | --------------- | ----------- | ------------------ | --------------------------------- |
| `users`    | `users/`        | `users/`    | `users.md`         | 14 TCs (TC-011 = RED-by-design)   |
| `posts`    | `posts/`        | `posts/`    | `posts.md`         | 6 TCs (cross-resource: user→post) |
| `comments` | `comments/`     | `comments/` | `comments.md`      | 5 TCs (chain: user→post→comment)  |
| `todos`    | `todos/`        | `todos/`    | `todos.md`         | 6 TCs (cross-resource: user→todo) |

When adding a service: registry row here + `@<svc>` in `scripts/check-consistency.sh` ALLOWED.

## Key Files

| File                            | Purpose                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `src/core/types.ts`             | `ApiConfig`, `ApiResponse<T>`, `HttpStatus`                        |
| `src/core/BaseClient.ts`        | HTTP base — `get/post/put/patch/del`, auto response-time check     |
| `src/core/BaseValidator.ts`     | `expectStatus`, `expectSchema` (Zod), `verify` box                 |
| `src/services/users/schemas.ts` | Zod schemas — SINGLE SOURCE; response types inferred via `z.infer` |
| `src/fixtures/base.ts`          | Worker-scoped `workerRequest`; test-scoped `apiConfig`             |
| `tests/users/provisioner.ts`    | Runtime provisioning (create/recycle/cleanup)                      |
| `tests/helpers.ts`              | `GOREST_TOKEN` gate; `gorestConfig()` URL + auth injection         |
| `src/config/api-config.ts`      | `loadApiConfig()` — env vars; defaults to GoRest URL               |
| `src/utils/random.ts`           | `randomAlphanumericCode()`, `randomUUID()`                         |
| `docs/test-plans/users.md`      | TC catalog สำหรับ users resource                                   |
