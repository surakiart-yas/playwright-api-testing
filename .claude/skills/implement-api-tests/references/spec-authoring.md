# Spec authoring — catalog to `tests/<svc>/`

Map the approved catalog to spec files. The catalog is the source of truth; every API TC
becomes exactly one `test()`, and the discovered count reconciles with the catalog. Pattern
to copy: `tests/products/*.spec.ts` + `tests/products/flows/`.

## File layout

```
tests/<svc>/
├── fixtures.ts          # extends @fixtures/base, wires the client (+ provisioner if stateful)
├── helpers.ts           # token-bearing client builder, login helpers, env credential getters
├── provisioner.ts       # only if the feature needs runtime preconditions (see provisioning.md)
├── <endpoint>.spec.ts   # one per endpoint — POST /products → create.spec.ts
└── flows/
    └── <scenario>.spec.ts   # multi-step / integration scenarios
```

One spec per endpoint keeps a red failure pointing at a single endpoint. Flows live apart
because they verify integration (the handoff between endpoints), not one endpoint's contract.

## Title, structure, tags (per `.claude/rules/testing.md`)

- **Outer describe** = `<METHOD> <path>` verbatim (`POST /products`), tagged
  `['@isolated', '@<svc>']`. It becomes the Allure story, so keep it identical across services.
- **Inner describe** = the fixed vocabulary `Positive Testing` / `Negative Testing` (or
  `Valid/Invalid Transitions` for state machines). Do not invent new group names.
- **Test title** = BDD `should <verb> <object> [<condition>]`. Negatives start with
  `should reject` or `should return <status>`, and name the reason
  (`should reject duplicate SKU`, not `should reject invalid input`).
- **TC-ID lives in the `allure.label.tc` annotation + a comment above the test**, never
  in the title. A title with a number prefix breaks Allure and grep.
  `// TC-008 (covers TC-012) — FB-003/005: ...`.

### Mapping catalog tags to Playwright tags

The catalog tags (`smoke`, `negative`, `security`, `automate-now`, `boundary`, ...) are
metadata, not Playwright tags. Map them down to the structural set:

| Catalog signal            | Playwright tag(s)               |
| ------------------------- | ------------------------------- |
| `smoke` / `critical-path` | `['@smoke', '@regression']`     |
| `regression` (not smoke)  | `['@regression']`               |
| `manual-only`             | none (+ `test.skip`, see below) |

Do NOT pass the descriptive catalog tags (`negative`, `security`, ...) as Playwright tags —
they would be read as service tags and corrupt the Allure epic grouping.

## Feasibility: honor the catalog's automate-now vs manual-only

- **automate-now** → implement it. If it needs a precondition, gate it on the provisioner
  and `test.skip(!provisioner, 'requires admin provisioning — set ...')`.
- **manual-only** (a time-based window like a 7-day or 90-day expiry, or a behavior the
  backend has not built) → do NOT stub it as `test.skip(true, ...)`. A skipped stub looks
  like coverage in the report but tests nothing — it is fake green. The catalog already
  records these TCs (tagged manual-only) with their manual procedure; that is their home.
  Leave at most a one-line comment where the test would sit, so a reader knows the case is
  intentionally manual, not forgotten:

```typescript
// TC-0xx (manual-only — see catalog): record auto-archived after 90 days → list excludes it.
// Not automated: no API to backdate createdAt.
```

## Assertions: structural in the validator, behavioral inline

The validator asserts the envelope (status, schema, `code`/`error`). The test asserts the
specific facts the TC cares about. Keep negatives to one `expectXError(res, status, code,
error)` call; for positives, assert the few fields that matter inline.

```typescript
const res = await productsClient.createProduct({ name, sku, price: 49.99, stock: 10 })
await ProductsValidator.expectCreateSuccess(res) // structural
const json = await res.json()
expect(json.data).toMatchObject({ name, sku, price: 49.99, status: 'draft' }) // behavioral
```

### The falsifiability test (the assertion must be able to fail)

Before every behavioral assertion ask: _if the feature were broken, would this line go red?_
If it would pass anyway, it is theatre. The ones that have slipped through review here:

- **Tautology.** `expect(data.password.isTemp).toBe(true)` right after create proves nothing
  about reset — a new user is already `isTemp=true`. To test reset, first set a password
  (reach `isTemp=false`), then assert the flip back to `true`.
- **Redundant with the schema.** `expect(data.id).toBeTruthy()` is theatre — the success
  schema already requires `id`. The behavioral assertion worth writing pins the thing the
  TC is actually about — e.g. for token ROTATION,
  `expect(data.accessToken).not.toBe(previousAccessToken)`, not just "a token exists".
- **Homogeneous-pass filters.** A status-filter test asserting "every row == ACTIVE" passes on
  an all-ACTIVE page. Provision an ACTIVE _and_ an INACTIVE subject with a shared marker, then
  assert the INACTIVE one is EXCLUDED from the ACTIVE-filtered result.
- **Status-only.** `expect(res.status()).toBe(401)` with no envelope check locks nothing about
  the body (an empty body, a missing `error` key, even an `OK` success-shape would pass).
  Route it through the validator's error helper (status + schema + code).
- **Loose code disjunction.** `VALIDATION_FAILED OR INVALID_DATA` when the spec pins one.
  Missing required field → `validation_failed`; present-but-invalid value → `invalid_data`.
  Pin the exact code via `expectXError`, which also locks the error envelope + `error` key.
- **Security literal.** When the spec pins an exact message for anti-enumeration (unknown-user
  must read identically to wrong-password), assert the literal string — the shared code/error
  does not prove the messages are indistinguishable.

Use `toMatchObject` for multi-field value checks (one diff surfaces all mismatches at once) per
`.claude/rules/testing.md`. Because the validator already locks shape, an "incomplete-coverage"
gap exists only when a VALUE the TC promises is asserted by neither the validator nor inline.

## Data-driven the repetitive partitions

When several TCs differ only by input and share one expected error (the password-complexity
rules: no-lower / no-upper / no-digit / no-special, all → `weak_password`), a small loop
keeps them DRY while still producing distinct, named tests:

```typescript
const weakCases = [
  { tc: 'TC-016', label: 'without a lowercase letter', newPassword: 'VALIDPASS1@' },
  // ...
]
for (const c of weakCases) {
  test(`should reject a new password ${c.label}`, { tag: ['@regression'] }, async (...) => { ... })
}
```

## Carry the design decisions through — do not re-split

The catalog already resolved redundancy (e.g. positives collapsed to one canonical case;
duplicate-by-FB outcomes merged with multi-FB traceability). When you implement, respect
that: one `test()` per catalog TC. If a TC traces to several FBs, the comment notes all of
them; you do not write one test per FB. If you feel the urge to add a test the catalog does
not have, that is a design change — take it back to `/test-design` or `/test-case`, do not
smuggle it into the spec.

A quick gut-check that mirrors the design rules: negatives get one test per partition or
boundary (each distinct error/edge is worth localizing); positives do not — one valid input
exercises every rule passing at once, so a pile of "valid → success" variants is a smell.

## Reconcile the count

After authoring, `pnpm exec playwright test tests/<svc> --list | grep -c '›'` should equal
the catalog's **automatable** TC count — the catalog total minus its manual-only entries
(those live in the catalog, not in code). A mismatch beyond that means you dropped,
duplicated, or mis-split an automatable TC. Keep the catalog and code in sync when either moves.
