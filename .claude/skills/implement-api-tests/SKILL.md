---
name: implement-api-tests
description: >-
  Implement runnable Playwright API tests for a service from an approved test-case
  catalog plus its OpenAPI spec, following this repo's API Object Model (AOM) and
  runtime-provisioning conventions. Reach for this whenever the user wants to turn a
  designed test catalog into spec files, scaffold a new service's API tests, "implement
  the test cases", "build the <feature> tests", add tests for a new endpoint/service, or
  wire up Client/Validator/schemas + fixtures + provisioning — even if they don't say the
  word "implement". This is the IMPLEMENTATION step that comes AFTER /test-design (which
  designs the catalog) and /test-case (per-TC quality). Do NOT use it to design the
  catalog itself (use /test-design) or to review individual TC quality (use /test-case).
---

# implement-api-tests

Turn an approved test-case catalog into runnable Playwright API test code, following this
repo's AOM and runtime-provisioning conventions. The design work is assumed done; this
skill is about getting from "catalog + spec" to "green `pnpm type-check` + a spec file per
endpoint that maps 1:1 to the catalog".

## Where this sits

```
/test-design  →  /test-case  →  implement-api-tests  →  pnpm test
 (catalog)        (TC quality)    (THIS: catalog → code)   (run)
```

| Skill                   | Owns                                                       |
| ----------------------- | ---------------------------------------------------------- |
| `/test-design`          | REQ → FB → TC catalog (markdown), no code                  |
| `/test-case`            | per-TC quality (titles, atomicity, redundancy)             |
| **implement-api-tests** | catalog + OpenAPI → `src/services/<svc>/` + `tests/<svc>/` |

The **products feature is the worked reference** for everything below. When in doubt, open
it and copy the shape: `src/services/products/`, `tests/products/` (`fixtures.ts`,
`provisioner.ts`, the specs).

## Inputs (gather before writing anything)

1. The approved catalog: `docs/examples/<feature>/07-test-cases.md` (a real project
   typically keeps these under `docs/test-plans/<feature>/`) — the SINGLE source of
   truth (list of TCs with expected results, tags, feasibility). A separate per-feature
   "API extract" doc is **deprecated** (it drifts from 07); do not create one.
   When you change a TC's value/tag or add a TC, sync `08-rtm.md` + the 07 counts in the SAME pass.
2. The OpenAPI spec: `docs/openapi/*.yaml`. **The contract lives here, not in your head.**
3. `docs/decisions.md` — why each convention exists. Read it if a convention surprises you.
4. The rules: `.claude/rules/api-patterns.md`, `fixtures.md`, `testing.md`.

## Workflow

Five phases. Verify at the end; do not skip Phase 1 (it is where the expensive mistakes
hide).

### Phase 1 — Map the contract from OpenAPI

Read the real request/response shapes before writing a single schema. The most expensive
mistake on this project was assuming the template envelope. Pull, per endpoint:

- the request body (required fields, formats, enums),
- every response status and its body, including the **success envelope** and the
  **error envelope**,
- the full table of business `code` values paired with their `error` keys,
- the concrete `examples` (they pin field names like `accessToken` vs `token`).

`jq` (or `yq` for YAML specs) over the spec is the fastest way. See
`references/aom-scaffold.md` for the exact harvest recipes.

### Phase 2 — Scaffold the AOM layer

Build `src/services/<svc>/` in this order (later files import earlier ones):
`types.ts` → `schemas.ts` → `<Svc>Client.ts` → `<Svc>Validator.ts`.

The envelope decides everything about `schemas.ts` + the validator. Details, with the
products code as the template: `references/aom-scaffold.md`.

### Phase 3 — Decide provisioning (independence)

Ask of each TC: _does it need a server-side precondition the API will not hand back?_
(an existing user in a given state, a known password, a record that already exists).

- **No** (pure validation / bad-token / missing-field negatives) → zero-config, runs
  anywhere, no fixture beyond an unauthenticated client.
- **Yes** → provision it at runtime. Never seed fixed accounts in env. Build a
  worker-scoped provisioner that creates / recycles / cleans up its own data.

This is the part most likely to go wrong, and the part that makes the suite either stable
or flaky. Full pattern + the provisioner walkthrough: `references/provisioning.md`.

### Phase 4 — Author the specs

One spec file per endpoint under `tests/<svc>/`, plus `flows/` for multi-step scenarios.
Map each catalog TC to exactly one `test()`, carry its expected `code`/`error`, and honor
its feasibility tag. Naming, tags, `Positive/Negative Testing` grouping, TC-ID comments,
and the manual-only `test.skip` pattern: `references/spec-authoring.md`.

### Phase 5 — Verify

```bash
pnpm type-check          # must be clean
pnpm lint                # must be clean
pnpm exec playwright test tests/<svc> --list    # count should match the catalog
```

The discovered test count should reconcile with the catalog's API TC count. If the
catalog says 42 and discovery says 40, you dropped two; if 44, you split something the
catalog merged. Reconcile before declaring done. In this template the suite RUNS against
the bundled mock (`pnpm test`), so run it too; against a real API that needs credentials,
treat type-check + lint + discovery as the gate and call out any runtime assumptions you
could not verify.

**Register the new service.** Adding `tests/<svc>/` is auto-discovered by
`playwright.config.ts` (`discoverProjects()` reads `tests/*`) and the scripts are tag-driven
(`test:smoke` = `--grep @smoke`, etc.), so **no `package.json` change is needed** for a new
service. Two manual steps: add the `@<svc>` tag to the `ALLOWED` list in
`scripts/check-consistency.sh`, and add a Service Registry row in `CLAUDE.md`. (If your CI
has a per-service dispatch dropdown, add the service there too — forgetting that made a
service un-runnable on-demand in the source project.)

## The seven principles (the why behind the patterns)

1. **The contract is the envelope.** This template's API signals success with
   `code: 'OK'` (a real API may use `'0000'` or a `success: true` boolean); errors carry
   `code` + `error`. A validator that checks the wrong envelope passes garbage. Always
   re-derive the envelope from the spec.
2. **Independence comes from provisioning, not seeding.** Shared seeded accounts drift and
   get consumed; tests fight over them in parallel. Creating each precondition at runtime
   makes a test self-contained. The price is a dependency on an admin/create API — that is
   a correct trade, not a smell.
3. **Stable means same result every run.** Unique data via `autotestSlug()`; recycle a
   cached account by resetting it back to the needed state rather than minting a new one
   per test; never rely on test execution order.
4. **Clean up after yourself.** Everything created carries the `autotest-` prefix so global
   teardown can find it. If the API has no hard-delete, soft-delete (e.g. status INACTIVE)
   and say so in a comment — silent accumulation is a slow leak.
5. **Be honest about feasibility.** Time-based cases (a 7-day expiry, a 90-day password, an
   8-hour idle window) and behaviors the backend has not built yet cannot be automated in
   CI. Mark them `test.skip(true, 'manual-only: ...')` with the exact manual procedure in a
   comment. Pretending to automate them produces flaky or false-green tests.
6. **Skip, do not fail, when unconfigured.** If the admin / bypass credentials are absent,
   `test.skip` with a clear reason. The suite stays green on a bare checkout, and the
   zero-config negatives still run, giving partial coverage. A wall of red on a missing env
   var teaches people to ignore red.
7. **Boring, consistent naming wins.** BDD `should ...` titles, `Positive/Negative Testing`
   groups, `@isolated`/`@flow` + `@<service>` + scope tags. Names show up in Allure and
   logs; consistency across services is worth more than cleverness. TC-IDs live in code
   comments, never in the test title.

## Pitfalls that have actually bitten this project

Hard-won lessons from real defects caught in review — each is a mistake that shipped and had
to be fixed. Bake the rule in from the start; depth lives in the reference files, this is the
scan-list.

**Assertions — an assertion that cannot fail teaches nothing** (`references/spec-authoring.md`)

- **Tautology.** Asserting a value already true regardless of the behavior under test, e.g.
  `isTemp === true` right after create (a new user is _always_ temp) "verifies" nothing about
  reset. Run the falsifiability test: _if the feature broke, would this line go red?_ If not,
  it is theatre. (To test reset: first reach `isTemp=false`, then assert the flip to `true`.)
- **Status-only / schema-locked re-asserts.** `expect(res.status()).toBe(401)` with no
  envelope check, or `expect(data.x).toBeTruthy()` where the schema already requires `x`, lock
  nothing the validator did not. Assert the VALUE / envelope the TC exists to prove.
- **Filters that pass on homogeneous data.** "every row == ACTIVE" passes trivially on an
  all-ACTIVE page. Provision BOTH states and assert the other is EXCLUDED.
- **Loose code disjunctions.** Accepting `VALIDATION_FAILED OR INVALID_DATA` when the spec
  pins one: missing field → `validation_failed`; present-but-invalid value → `invalid_data`.
  Pin the exact one.
- **Security messages need the literal.** Anti-enumeration (unknown-user must read identically
  to wrong-password) is only proven by asserting the exact message string, not the code alone.

**Provisioning — where flakiness is born** (`references/provisioning.md`)

- **Cross-suite single-session-kick.** When the API enforces one session per account, two
  provisioners on the same worker that each log in the SAME admin account kick each other (the
  API validates sessions server-side, so even a non-expired cached token then 401s). Use ONE
  shared admin session per worker (a module-level cached login keyed by worker).
- **Wall-clock token refresh hides kicks.** A "re-login if token > N min old" timer cannot see
  a session revoked early. Refresh on the token's own `exp` (`isJwtExpired`) AND retry admin
  ops once on an auth-code error.
- **The spec client must use the REAL response budget.** Building the assert-against client
  with the relaxed 30s provisioning budget silently disables the response-time check for every
  contract call. Spec client inherits the real target/ceiling; only setup calls get the relaxed
  one.
- **One slug does not fit every field.** A shared hyphen/digit slug fails a letters-only field
  (→ `invalid_data`) and reads as flaky "create failed" in setup. Build each field to its
  own charset. And when the API has no hard-delete every unique value is consumed forever —
  use full-width random at boundary lengths, not a short prefix + 2 chars.

**Contract — re-derive from the spec, never assume** (`references/aom-scaffold.md`)

- **Snapshot vs live.** Some endpoints read caller status/permissions from the JWT snapshot
  (captured at login), others live from the DB — this decides which negatives are reachable
  (an "inactive caller" 403 is unreachable on a snapshot endpoint, reachable on a live one).
- **Spec is truth; a documented defect stays RED.** When the API breaks its own contract,
  assert the contract-correct value and leave it red (omit scope tags + comment the defect).
  Never weaken the assertion to match the bug.

## What this skill does NOT do

- It does not design the catalog (REQ/FB/TC). If there is no approved catalog yet, stop and
  point the user at `/test-design`.
- It does not judge individual TC quality or hunt redundancy — that is `/test-case`.
- It does not write or extend the mock server. The bundled mock (`mock/server.ts`) exists
  for the exemplar services; tests for a REAL service run against its real endpoint (set
  `BASE_URL`). Extend the mock only when deliberately growing the teaching material.
- It does not commit. Leave that to the user (project rule: ask before committing).
