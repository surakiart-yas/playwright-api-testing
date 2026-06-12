# Test Organization

How tests are grouped in the file tree, in spec files, and in the Allure report.

## TL;DR

| Axis                  | Express it as              | Example                                                      |
| --------------------- | -------------------------- | ------------------------------------------------------------ |
| **Service domain**    | folder                     | `tests/users/`, `tests/orders/`                              |
| **Test type**         | filename + tag             | `create.spec.ts` `@isolated` vs `flows/crud.spec.ts` `@flow` |
| **Endpoint**          | `test.describe(...)` block | `test.describe('POST /users', ...)`                          |
| **Scenario class**    | nested `describe`          | `Positive Testing` / `Negative Testing`                      |
| **Scope / severity**  | tag                        | `@smoke` ⊂ `@regression` ⊂ all                               |
| **Service ownership** | tag                        | `@users`, `@orders`                                          |

Service-as-folder is the primary axis. Everything else is orthogonal metadata
expressed via tags or describes — not folders.

## Folder Layout

```
tests/
├── users/                # Service domain
│   ├── fixtures.ts
│   ├── helpers.ts        # createTestUser, createTestAdmin (throws on failure)
│   ├── create.spec.ts    # POST /users        — @isolated
│   ├── update.spec.ts    # PATCH /users/:id   — @isolated
│   ├── delete.spec.ts    # DELETE /users/:id  — @isolated
│   ├── get-by-id.spec.ts # GET /users/:id     — @isolated (errors only)
│   ├── list.spec.ts      # GET /users         — @isolated
│   ├── auth.spec.ts      # 401 / 403 paths    — @isolated
│   └── flows/
│       ├── crud.spec.ts          # full lifecycle  — @flow
│       └── get-by-id.spec.ts     # list → get      — @flow
├── orders/               # Same shape as users/
└── flows/                # Cross-service flows (fixtures.ts + spec files)
```

**Why service-as-folder:**

1. APIs are organized by resource — your folders should mirror that.
2. Maps 1:1 with the API Object Model layer (`src/services/<name>/`).
3. Service ownership = test ownership. Easy to point a team at _their_ folder.
4. Tags handle every other dimension (smoke/regression, isolated/flow, severity)
   — so you never need to refactor folders when those dimensions change.

**Anti-patterns** (avoided):

- `tests/isolated/` + `tests/flow/` — splits related tests across two folders,
  forces you to look in two places when an endpoint breaks.
- `tests/get/`, `tests/post/` — HTTP method foldering. Buys nothing.
- `tests/team-a/` + `tests/team-b/` — team boundaries shift; paths rot.
- `tests/v1/` + `tests/v2/` — only useful if you genuinely run both versions
  in parallel for an extended migration. Otherwise tag the version (`@v2`)
  and delete v1 tests when v1 retires.

## When to add a domain layer

Past ~10 services, group services by business domain:

```
tests/
├── identity/
│   ├── users/
│   └── sessions/
├── billing/
│   ├── orders/
│   ├── invoices/
│   └── refunds/
└── catalog/
    ├── products/
    └── categories/
```

`playwright.config.ts` already auto-discovers top-level subdirectories as
projects — `discoverProjects()` would need a small tweak to walk one level
deeper. Don't reach for this layer prematurely.

## Inside a spec file

```typescript
test.describe('POST /users', { tag: ['@isolated', '@users'] }, () => {
  test.describe('Positive Testing', () => {
    test('should create a user with role admin', { tag: ['@regression', '@smoke'] }, ...)
    test('should create a user with default role',  { tag: ['@regression'] }, ...)
  })

  test.describe('Negative Testing', () => {
    test('should reject missing email',        { tag: ['@regression'] }, ...)
    test('should reject invalid email format', { tag: ['@regression'] }, ...)
    test('should reject duplicate email',      { tag: ['@regression'] }, ...)
  })
})
```

- **Outer `describe`** = endpoint (HTTP method + path).
- **Inner `describe`** = scenario class (`Positive` / `Negative`, or `Authn` /
  `Authz`, or `Rate Limit`).
- **Test title** = the contract assertion, written as `"should ..."`.

## Tag taxonomy

| Tag                    | Type       | Required?                                            |
| ---------------------- | ---------- | ---------------------------------------------------- |
| `@<service>`           | domain     | yes — every test                                     |
| `@isolated` or `@flow` | structural | yes — every test                                     |
| `@regression`          | scope      | yes for any test that should run in CI               |
| `@smoke`               | scope      | only on critical happy paths (implies `@regression`) |

The hierarchy is `@smoke ⊂ @regression ⊂ all`. A `@smoke` test must also carry
`@regression`. See [`.claude/rules/testing.md`](../.claude/rules/testing.md).

## Allure report views

The Allure report has three main views. **Behaviors is the default navigation view.**

| View           | Groups by                               | Best for                        |
| -------------- | --------------------------------------- | ------------------------------- |
| **Behaviors**  | epic (service) → feature (type) → story | QA / Dev navigating by service  |
| **Suites**     | project → spec file → describe          | Debugging a specific failure    |
| **Categories** | failure type                            | Triage — flakiness vs real bugs |

> **Default landing page:** The Overview shows charts (pass rate, severity breakdown,
> environment info, trend across runs). Click **Behaviors** in the left sidebar for
> the service-grouped tree. Stakeholders who want a type-first view (e.g. "how many
> contract violations?") should use the **Categories** tab.

## Allure annotations

The template auto-applies all Allure labels via an `auto: true` fixture. See
[`src/utils/allure-meta.ts`](../src/utils/allure-meta.ts) and
[`src/fixtures/base.ts`](../src/fixtures/base.ts).

### Auto-applied labels (no boilerplate needed)

| Tag → Allure label                            | Mapping                      |
| --------------------------------------------- | ---------------------------- |
| `@<service>` (e.g. `@users`)                  | `epic = Users`               |
| 2+ service tags (e.g. `@users` + `@products`) | `epic = Cross-Service`       |
| `@isolated`                                   | `feature = Contract Tests`   |
| `@flow`                                       | `feature = Business Flows`   |
| Outermost `test.describe` title               | `story` (e.g. `POST /users`) |
| _(all tests)_                                 | `layer = api`                |
| `@smoke`                                      | `severity = critical`        |
| `@regression` (without `@smoke`)              | `severity = normal`          |
| neither scope tag                             | `severity = minor`           |

> **Why service → epic, type → feature?** QA and Dev navigate by service first
> ("what's the status of Products?"), then drill into test type. Keeping all tests
> for one service under one epic avoids splitting across two top-level groups.
> Cross-service tests get their own `Cross-Service` epic so source location
> (`tests/flows/`) matches report location — see [decisions.md §2](decisions.md).

The reporter sets these automatically from the file system and describe blocks:

| Allure label  | Comes from                                                                    |
| ------------- | ----------------------------------------------------------------------------- |
| `parentSuite` | Playwright project name (= service folder)                                    |
| `suite`       | Spec file path                                                                |
| `subSuite`    | Nested `test.describe` titles, joined (e.g. `POST /users > Positive Testing`) |
| `story`       | Test title (e.g. `should create a user with role admin`)                      |

### Behaviors tree (service-first view)

```
Products                                    ← epic, from @products tag
├── Contract Tests                          ← feature, from @isolated
│   ├── POST /products                      ← story, from outermost describe
│   │   ├── ✓ should create a product with default draft status   [critical]
│   │   └── ✓ should reject duplicate SKU                        [normal]
│   └── PATCH /products/:id/status          ← story
│       ├── ✓ should publish a draft product                      [critical]
│       └── ✓ should reject any transition from archived          [normal]
└── Business Flows                          ← feature, from @flow
    ├── ✓ Product CRUD flow: create → list → update → get → delete   [critical]
    └── ✓ Publish lifecycle flow: create → publish → archive          [critical]

Users                                       ← epic, from @users tag
├── Contract Tests                          ← feature, from @isolated
│   └── POST /users                         ← story
│       ├── ✓ should create a user with role admin                [critical]
│       └── ✓ should reject duplicate email                      [normal]
└── Business Flows                          ← feature, from @flow
    └── ✓ User CRUD flow: create → list → update → get → delete       [critical]

Cross-Service                               ← epic, from 2+ service tags
├── Contract Tests
│   └── GET /products/:id — with seeded user context
│       └── ✓ should return the product created in the same test run
└── Business Flows
    └── ✓ Cross-service flow: admin manages a product lifecycle...    [critical]
```

**Why three levels in Behaviors?** Without `story`, all tests for one service-type
land in a flat list — you can't see at a glance how many tests cover `POST /users`
vs `DELETE /users/:id`. Adding `story` from the outermost describe restores
endpoint-level grouping.

### Suites tree (developer view, "by spec")

```
Suite: products                             ← Playwright project name
├── tests/products/create.spec.ts
│   └── POST /products
│       ├── Positive Testing
│       │   └── ✓ should create a product with default draft status
│       └── Negative Testing
│           └── ✓ should reject duplicate SKU
└── tests/products/flows/crud.spec.ts
    └── ✓ Product CRUD flow: …
```

### Custom labels per test (optional)

Only needed when you want a TMS link, a long description, or a non-standard epic:

```typescript
import { allure } from 'allure-playwright'

test('should create a user with role admin', { tag: [...] }, async ({ usersClient }) => {
  await allure.tms('JIRA-1234')
  await allure.description('Verifies that an admin role is persisted on creation.')
  // epic, feature, severity are already set by the auto-fixture — do not repeat them
})
```

## Naming conventions

| Thing                       | Pattern                                    | Example                                 |
| --------------------------- | ------------------------------------------ | --------------------------------------- |
| Service folder              | lowercase plural                           | `users`, `orders`, `payments`           |
| Spec file                   | `<endpoint-or-scenario>.spec.ts`           | `create.spec.ts`, `bulk-import.spec.ts` |
| Flow spec                   | inside `flows/`, named after the journey   | `flows/checkout.spec.ts`                |
| Test title                  | `"should <expected behaviour>"`            | `'should reject duplicate email'`       |
| Resource names in test data | `autotest-<random>` (via `autotestSlug()`) | `autotest-a3F9k2Lq`                     |

The `autotest-` prefix is load-bearing: the global teardown deletes every
resource whose name starts with it. The prefix lives in one place —
[`src/utils/test-data.ts`](../src/utils/test-data.ts) — so a future rename is a
one-line change. Always use `autotestSlug()` rather than hardcoding the string.
