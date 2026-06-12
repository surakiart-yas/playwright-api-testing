# Testing

## Test Tags

| Tag           | Type  | Purpose                                |
| ------------- | ----- | -------------------------------------- |
| `@isolated`   | type  | Single-endpoint contract test          |
| `@flow`       | type  | Multi-step scenario                    |
| `@<service>`  | type  | e.g. `@users`, `@orders`, `@products`  |
| `@smoke`      | scope | Critical happy paths — pre-deploy gate |
| `@regression` | scope | All reliably passing tests — CI gate   |
| _(none)_      | scope | Known gaps only — full suite           |

**Hierarchy:** `@smoke ⊂ @regression ⊂ all`

> The catalog (`07-test-cases.md`) `Tags` column also lists non-runnable **descriptors**
> (`negative`, `boundary`, `api-contract`, `security`, `automate-now`) for categorization/feasibility.
> Only the tags in the table above are grep-able suites — do **not** add a `@<descriptor>` tag in code
> for them. In particular there is **no `@security` tag**: "security" is a risk category in the
> catalog, not a runnable suite.

## Rules

- Happy path + critical → `@smoke` (automatically includes `@regression`)
- **Spec is the source of truth — never weaken an assertion to match current (buggy) API behavior.**
  When the API doesn't yet comply (a BE defect, or a contract rule not enforced yet): assert the
  documented-correct behavior and leave the test **RED**. Omit scope tags (`@smoke`/`@regression`)
  so it stays visible in full / nightly runs but does not block the PR gate. Add a comment with the
  defect, the documented-correct expectation, and "do not change the expected to match the bug".
  Rationale: dev must fix to match the contract — a green/masked test removes that pressure and
  hides the gap, so prefer a visible red over `test.fail(true)`. (Reference: `tests/products`
  TC-006 / TC-010 — both RED against seeded mock bugs.)
- No conditional assertions — use `test.fixme(true, 'reason')` for code-side bugs in OUR test pending fix; use `test.skip(true, 'reason')` for missing external dependencies (e.g. admin/bypass not configured, third-party service unavailable)
- Every resource created in a test must be named with `TEST_PREFIX` (default `autotest-`). Use `autotestSlug()` from `@utils/test-data` — never hardcode the prefix string

## Assertion Style

Two-layer approach — see [docs/decisions.md §4, §5](../../docs/decisions.md):

| Layer      | Where                       | Asserts                                             |
| ---------- | --------------------------- | --------------------------------------------------- |
| Structural | `*Validator.expect*Success` | HTTP status, schema, `success: true`, response time |
| Behavioral | inline `expect()` in test   | Specific field values, business invariants          |

**Field-value checks: use `toMatchObject`**

```typescript
// ✅ Correct — one expect, all mismatches visible at once
await ProductsValidator.expectCreateProductSuccess(res)
const json = await res.json()
expect(json.data).toMatchObject({
  name: slug,
  price: 49.99,
  stock: 100,
  status: 'draft',
})

// ❌ Wrong — multiple expects mask later failures, no unified diff
expect(json.data.name).toBe(slug)
expect(json.data.price).toBe(49.99)
expect(json.data.stock).toBe(100)
expect(json.data.status).toBe('draft')
```

Extra fields (`id`, `createdAt`) pass `toMatchObject` because the schema check
in the validator already locks the shape.

**Single field** — keep `expect(...).toBe(...)`. Don't reach for `toMatchObject`
just for one assertion.

**Rule of 3** — if the same field-value combo appears in 3+ tests, abstract it
into a validator helper. Until then, keep it inline.

## Naming

Names show up in the Allure report (epic → feature → **story** → test) and in
log output. Boring + consistent beats clever. Patterns codified from the
existing suite:

### Outer `test.describe` (the file's single top-level block)

| File kind                       | Pattern                                       | Example                                                                           |
| ------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| Single-endpoint isolated spec   | `<METHOD> <path>`                             | `POST /products`, `PATCH /products/:id/status`                                    |
| Scenario variant of an endpoint | `<METHOD> <path> — <suffix>`                  | `GET /products/:id — error cases`, `GET /products/:id — with seeded user context` |
| Auth failure spec               | `Auth — <path>`                               | `Auth — /products`                                                                |
| Flow spec                       | **No outer describe** — `test()` at top level | (see "Flow test name")                                                            |

Path uses the API doc form (`:id`, not `42`). Keep the **outer describe
verbatim across services** — it's the `story` label in Allure.

### Inner `test.describe` (groups within a spec)

Use the **fixed vocabulary** below — don't invent synonyms:

| Group                 | When to use                                                    |
| --------------------- | -------------------------------------------------------------- |
| `Positive Testing`    | Happy-path cases (2xx responses)                               |
| `Negative Testing`    | Validation, 4xx errors, boundary failures                      |
| `Valid Transitions`   | State machine — allowed transitions (e.g. draft → published)   |
| `Invalid Transitions` | State machine — disallowed transitions (e.g. archived → draft) |

If you need a different group, ask first — adding ad-hoc names breaks the
Allure tree grouping consistency.

### Isolated test name — `test('should ...')`

BDD `should <verb> <object> [<condition>]`:

| ❌ Bad                     | ✅ Good                                                   |
| -------------------------- | --------------------------------------------------------- |
| `test('create user', ...)` | `test('should create a user with role admin', ...)`       |
| `test('bad request', ...)` | `test('should reject duplicate SKU', ...)`                |
| `test('test 1', ...)`      | `test('should return 404 for non-existent product', ...)` |

Rules:

- Negative cases start with `should reject` or `should return <status>`
- Be specific about the rejection reason — `should reject duplicate SKU` not `should reject invalid input`
- No periods at the end; no quotes around values; no emoji

### Flow test name — `test('<Subject> flow: <chain>')`

Single test at top level (no outer describe). Format:

```
<Subject> flow: <step → step → step>
```

Examples from the suite:

```typescript
'Product CRUD flow: create → list → update → get → delete'
'Publish lifecycle flow: create → publish → update price → archive → verify terminal'
'Get by ID flow: create → verify in list → get by id → verify field match'
'Cross-service flow: admin manages a product lifecycle while user accounts exist'
```

Rules:

- Steps separated by `→` (not `->` or `,`)
- Subject = service or feature in title case
- Cross-service: prefix with `Cross-service flow:`
- Keep it readable as a sentence — don't pack >6 steps

### `test.step('...')` — step labels inside flow tests

**Imperative present tense**, describes the action being performed. Different
from test names (which are predictions):

| ❌ Bad                                    | ✅ Good                                   |
| ----------------------------------------- | ----------------------------------------- |
| `test.step('should create product', ...)` | `test.step('Create product', ...)`        |
| `test.step('user creation', ...)`         | `test.step('Create user', ...)`           |
| `test.step('do verification', ...)`       | `test.step('Verify update via get', ...)` |
| `test.step('cleanup', ...)`               | `test.step('Delete product', ...)`        |

Conventions:

- Verbs first: `Create`, `Publish`, `Update`, `Delete`, `Verify`, `Set up`
- Verification steps: `Verify <what>` — e.g. `Verify product is gone`
- Precondition steps: append `(precondition)` — e.g. `Set up user accounts (precondition)`
- Stage labels for clarity: `Admin publishes the product`, `Both users still fetchable`
- Read the labels in sequence — they should narrate the scenario like a paragraph

### Anti-patterns to avoid

- `test('happy path', ...)` — every test is some path; be specific
- `test('test should work', ...)` — empty signal
- `test.describe('Tests', ...)` — uninformative
- Mixed languages: `test('ทดสอบสร้าง user', ...)` — keep English for grep + Allure
- Trailing whitespace or smart quotes — Allure URL fragments break
- `test('1.1.2 verify endpoint', ...)` — number prefixes belong in `docs/test-cases.md` TC-IDs, not in test names

## Multi-actor tests (who does what)

When a test involves more than one actor (an **admin** provisions/mutates a **subject**, then the
subject calls under test), the log must read clearly so no one mistakes setup for the assertion.

- **Provisioner preconditions name the actor** — e.g. `Precondition: admin provisions a subject user
→ subject's own token` / `Precondition: admin deactivates the subject user`. This already covers the
  setup for every test that uses the provisioner, so you rarely need to add more.
- **Wrap a test-body call in `test.step('<Actor> does X → expect Y')` only when the BODY itself has
  more than one actor-action** — e.g. a mid-session-revocation flow (subject calls → ok; admin revokes;
  subject calls again → fails). A single-assertion body is clear by elimination once setup is labelled —
  don't wrap it just for the sake of it.
- Name the variable for the actor's identity (`subject`, `subjectClient`), not a bare `u`/`client`.

## Test File Layout

```
tests/<service>/
├── fixtures.ts          # extends base.ts, wires <Service>Client
├── create.spec.ts       # @isolated — POST contract
├── update.spec.ts       # @isolated — PUT/PATCH contract
├── delete.spec.ts       # @isolated — DELETE contract
├── get-by-id.spec.ts    # @isolated — GET error cases only
├── list.spec.ts         # @isolated — GET list contract
└── flows/
    ├── crud.spec.ts         # @flow — full E2E lifecycle
    └── get-by-id.spec.ts    # @flow — list → getById happy path
```

## Running Tests

```bash
pnpm test:smoke          # pre-deploy gate
pnpm test:regression     # CI gate
pnpm test:debug          # verbose HTTP logging
pnpm report              # open HTML report
pnpm allure              # open Allure report
```
