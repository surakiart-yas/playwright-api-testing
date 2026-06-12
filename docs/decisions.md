# Decisions

Why this project looks the way it does. Read this before changing patterns that
seem strange — most "strange" choices here are deliberate.

Each decision is dated, has a short **Context**, the **Decision**, and the
**Reason** so you can judge whether the constraint still applies.

---

## 1. Allure tree: Service → Type (not Type → Service)

**Decision.** Allure `epic` = service (`@users`, `@products`). `feature` =
`Contract Tests` (from `@isolated`) or `Business Flows` (from `@flow`).

**Reason.** Primary audience of the report is QA and Dev, not stakeholders.
They navigate by service first ("what is the status of Products?"), then drill
into test type. Keeping everything for one service under one epic avoids
splitting health-state across two top-level groups.

**Trade-off.** Stakeholders who want a type-first view ("how many contract
violations are open?") use the **Categories** tab instead — it gives them the
type-first grouping without restructuring the tree.

**Where.** [src/utils/allure-meta.ts](../src/utils/allure-meta.ts)

---

## 2. Allure cross-service tests: dedicated "Cross-Service" epic

**Decision.** A test tagged with two or more service tags (e.g. both `@users` and
`@products`) is grouped under a dedicated epic **`Cross-Service`** — not under any
single service.

**Reason.** Two earlier options had problems:

1. _Apply both service tags as epic_ — Allure drops tests with multiple values
   for the grouped label from the `--group-by` tree entirely. The test
   disappears from the Behaviors view.
2. _First service tag wins_ (previous decision) — the test ends up under Users
   when its source lives in `tests/flows/`. Source ↔ report mismatch confuses
   new contributors: "I edited `tests/flows/cross-service.spec.ts`, why is the
   change showing under Users?"

A dedicated `Cross-Service` epic mirrors the `tests/flows/` folder location, so
source and report agree. Stakeholders/QA can also separate cross-service health
from single-service health at a glance.

**Trade-off.** One extra top-level epic in the tree. Acceptable because
cross-service tests are a small minority and having their own home is clearer
than first-tag-wins. The Tags filter still works as a secondary navigation path.

**Where.** [src/utils/allure-meta.ts](../src/utils/allure-meta.ts) —
`applyAllureFromTags` (look for `serviceTags.length >= 2`)

---

## 3. Schemas: strict resources, loose envelopes

**Decision.** Resource shapes (`userSchema`, `productSchema`) set
`additionalProperties: false`. Envelope schemas (`responseSchema`,
`listResponseSchema`, error/empty) set `additionalProperties: true`.

**Reason.** Two failure modes need different protection:

- Resource drift (typo in field name, accidental rename) → catch loudly. This
  is what contract tests exist for.
- Envelope additions (`traceId`, `version`, `requestId` added by ops/platform
  team) → must not break tests. These are operational metadata, not contract.

**Trade-off.** Resource changes by the API team will break tests immediately
(intended). Envelope changes are silent. If you need the envelope locked too,
flip the envelope flags on a per-project basis.

> **Update (Zod era).** The AJV-era `src/core/schemas.ts` is gone; the same axis now
> lives in the Zod convention (§13): every field a resource schema NAMES is locked
> (typo/rename breaks loudly), while `looseObject` keeps envelopes & data open to
> additions. Strictness moved from an `additionalProperties` flag to "which keys the
> schema declares".

**Where.** `src/services/<svc>/schemas.ts` (e.g.
[src/services/products/schemas.ts](../src/services/products/schemas.ts))

---

## 4. Validator = structural, Test = behavioral

**Decision.** `*Validator.expect*Success` checks STRUCTURE (HTTP status, schema,
business code `OK`, response time). Tests inline-`expect()` the VALUES they care
about.

**Reason.** Validators are general — every test goes through them. Field-value
assertions are specific — they vary per test. Putting field assertions in
validators creates god-objects with parameter explosions; putting structural
checks in every test creates copy-paste.

**The Rule of 3.** If the same field-value combo appears in 3+ tests, abstract
it. Until then, keep it inline.

**Where.** [src/core/BaseValidator.ts](../src/core/BaseValidator.ts) +
service-specific validators

---

## 5. Field-value assertions use `toMatchObject`

**Decision.** Multi-field checks use `expect(json.data).toMatchObject({...})`,
not multiple `toBe`.

**Reason.**

- All failing fields surface in one error (not one fail → fix → run → next fail).
- Partial match — fields the test doesn't care about (`id`, `createdAt`) don't
  need wildcard matchers.
- Schema already locks the shape; `toMatchObject` only needs to lock the
  _values_ the test cares about.

**Trade-off.** `toMatchObject` allows extra fields. We rely on `expectSchema`
(called by every `expect*Success` validator) to catch unexpected fields. The
two work as a pair — don't drop the schema check thinking `toMatchObject` is
enough.

**Where.** Anywhere you'd write 2+ consecutive `expect(json.data.X).toBe(Y)`.

---

## 6. Helpers throw on setup failure, not skip

**Decision.** Provisioning helpers (`createTracked`, `createDisposableProduct`, etc.)
throw with a descriptive message when the precondition API call fails.

**Reason.** A failing precondition is a test failure, not a test skip. Silent
skips hide infrastructure problems and let regressions ship. If a provisioning
create returns 500, that's a real bug we want surfaced loudly. (Skipping is
reserved for a MISSING dependency — e.g. credentials not configured — not a
failing one; see `.claude/rules/fixtures.md` "degrade gracefully".)

**Where.** [tests/products/provisioner.ts](../tests/products/provisioner.ts)

---

## 7. `authToken` precedence: dynamic > static > skip

**Decision.** Auth-token resolution checks in this order:

1. A token minted by the service's own fixture / provisioner (runtime login)
2. Skip the test with a descriptive message

**Reason.** Provisioning a fresh account and logging in at runtime is the most
realistic auth path (it exercises the login endpoint too) and keeps tests
independent. Skipping with a message beats failing cryptically when no auth
source (the per-worker admin pool) is configured.

**Foot-gun.** Never consume `apiConfig.authToken` directly when a service provides
its own token. The exemplar API is public, so the template has no live example —
the reference pattern (per-worker admin account → provisioner → per-test token) is
described in `.claude/rules/fixtures.md` "Provisioning stateful services" and
docs/exercises.md exercise 5.

**Where.** [src/config/api-config.ts](../src/config/api-config.ts) +
[src/fixtures/base.ts](../src/fixtures/base.ts)

---

## 8. Every test resource uses `autotestSlug()`

**Decision.** Resource names (user emails, product names/SKUs) start with the
`TEST_PREFIX` (`autotest-` by default) via `autotestSlug()`. Never hardcode the
prefix string.

**Reason.** Cleanup (the provisioner teardown, or any future global sweep) deletes
only resources whose name starts with the prefix. Hardcoded prefixes drift when
someone renames the constant. Tests that forget the prefix leak data into shared
environments.

**Where.** [src/utils/test-data.ts](../src/utils/test-data.ts) +
[tests/products/provisioner.ts](../tests/products/provisioner.ts) (cleanup) +
[src/setup/global-teardown.ts](../src/setup/global-teardown.ts)

---

## 9. Allure history: external file, not in `allure-results/`

**Decision.** `pnpm allure:generate` uses `--history-path allure-history.json`.
`allure-history.json` is committed to the repo. `allure-results/` is wiped
before every test run.

**Reason.** Without history, the Allure Trend chart shows only "current run."
With history, you see pass-rate evolution across builds. The history file is
both read and written by the same flag — committing it gives CI runs and local
runs the same baseline.

**Trade-off.** `allure-history.json` will grow over time. If it gets large,
prune it manually. Real-world experience: ~50 KB after 100 runs is fine.

**Where.** [package.json](../package.json) `allure:generate` script

---

## 10. Mock server is bundled, not optional

> **History.** In the production project this template was extracted from, the bundled
> mock was removed (2026-05-29): an internal QA repo running against live endpoints
> found it maintenance overhead that could drift from the real API. **In this template
> the decision is LIVE again** — a teaching template's first job is `pnpm test` green
> offline on a fresh clone, and the seeded-bug lessons need a backend we control. Both
> states of this decision are correct _for their context_; that is the lesson.

**Decision.** The Hono mock in `mock/server.ts` boots automatically when `BASE_URL`
is unset or points at the mock, via Playwright's `webServer` config. External
environments don't start it.

**Reason.** Zero setup for first-time contributors — `pnpm test` works on a
fresh clone. The mock implements the full contract (state machine for products,
real validation, real 4xx behavior) so tests against it actually exercise the
same code paths as against the real API.

**Trade-off.** Mock divergence from a real API is a risk. In a real project,
mitigate by running the suite against a live environment periodically in CI — or
remove the mock once a stable env exists (as the source project did).

**Where.** [playwright.config.ts](../playwright.config.ts) `webServer` +
[mock/server.ts](../mock/server.ts)

---

## 11. Error response schema: `data` is optional-but-null-if-present

**Decision.** `errorResponseSchema` lists `data: { type: 'null' }` in
`properties` but NOT in `required`.

**Reason.** Some APIs include `data: null` in error responses for envelope
consistency (every response has the same shape). Others omit `data` entirely.
Both are valid; we accept both. We refuse `data: <object>` in an error response
because that's a server bug.

**Do not add `data` to `required`.** That would break APIs that omit it from
error bodies.

> **Update (Zod era).** The template's error envelope omits `data` entirely and the
> Zod `errorEnvelope` is a `looseObject` that doesn't declare it — so both "absent"
> and "`data: null`" pass, while a structured `data: <object>` in an error would
> still surface in behavioral assertions. Same intent, new mechanism.

**Where.** `src/services/<svc>/schemas.ts` `errorEnvelope`

---

# Tooling decisions

The numbered decisions above are about test patterns. Below are decisions about
the tools themselves — what we picked and what we gave up.

---

## 12. Prettier + ESLint (not Biome.js)

**Decision.** Two separate tools: Prettier for formatting, ESLint for linting.

**Reason.**

- ESLint plugin ecosystem is much wider (typescript-eslint, eslint-plugin-playwright,
  etc.). Many of the rules we care about don't exist in Biome yet.
- Prettier has near-universal IDE support out of the box (`esbenp.prettier-vscode`).
  Biome has an extension but adoption is uneven across editors / CI runners.
- Team familiarity — Prettier + ESLint is the default mental model for most
  TS/Node developers, so onboarding is faster.

**Trade-off.** Biome is **5–20× faster** (Rust binary) and ships as one tool.
On a small project the speed difference doesn't matter — `pnpm exec lint-staged`
runs in under 2 seconds. If lint time ever becomes painful or the team wants
fewer moving parts, Biome migration is mechanical (`biome migrate`).

**Where.** [.prettierrc](../.prettierrc), [eslint.config.js](../eslint.config.js),
[package.json](../package.json) `lint-staged` block

---

## 13. Zod for response validation (was: AJV + JSON Schema)

**Decision.** Response shape validation via **Zod** schemas in
`src/services/<svc>/schemas.ts`. Each schema is the SINGLE SOURCE: the response
data types are inferred from it (`z.infer`) in the service `types.ts`, so schema
and types can no longer drift. `BaseValidator.expectSchema` runs `schema.safeParse`
and surfaces failures via `z.prettifyError`.

**Reversal note (2026-06-11).** This previously chose AJV + hand-written JSON
Schema. Reviewing the actual codebase, two of the three stated AJV reasons did not
hold here:

- The **"interoperable format"** benefit was theoretical. The hand-written schemas
  were consumed ONLY by their own `*Validator` — nothing exported them to a contract
  registry, Postman, or a faker, and no such tooling was in `package.json`. Backends
  read the **OpenAPI spec** (`docs/openapi/`), not the test repo's schemas. The
  realistic interop direction is spec → repo (generating types), not repo → backend.
- **Performance** is irrelevant for a test suite validating a few hundred responses
  per run (µs-scale difference).

What remained was the trade-off we were paying every day: **maintaining a JSON
Schema in `schemas.ts` AND a parallel interface in `types.ts` by hand**. Zod
collapses that to one source via `z.infer`, with better DX (refinements,
discriminated unions) and a readable failure formatter. We accept losing the
direct spec→schema path; if spec-driven generation is ever wanted, `openapi-zod-client`
/ `ts-to-zod` cover it.

**Conventions.**

- Envelopes use `z.looseObject` (NOT `z.object`) so unknown infra fields
  (`requestId`, …) and **any leaked field** are KEPT on the parsed
  body — the `additionalProperties: true` semantics the JSON Schemas had. This is
  load-bearing: the products list projection test (TC-010) asserts the internal
  `costPrice` key is ABSENT on the parsed items; a stripping `z.object` would mask
  a real leak.
- Const catalogs (`ProductCode`, `ProductStatus`, …) and **request** types stay
  hand-written in `types.ts`. Only **response data** types are inferred.
- An intentionally-shallow schema may keep a richer hand-written type (schema
  validates the top shape, the type documents the full tree for behavioural
  assertions) — use sparingly.
- `types.ts` does `import type { … } from './schemas'`; `schemas.ts` imports the
  const catalogs from `types.ts` as values. The type-only import is erased at
  runtime, so there is **no import cycle**.

**Where.** [src/core/BaseValidator.ts](../src/core/BaseValidator.ts),
`src/services/<svc>/schemas.ts` + `src/services/<svc>/types.ts`
(e.g. [src/services/products/](../src/services/products/); the old
`src/core/schemas.ts` was removed — it only served an unused
`{ data, message, success }` envelope).

---

## 14. `test.step()` (not `@step` decorator)

**Decision.** Multi-step flow tests use Playwright's built-in `test.step()` API,
not decorator libraries like `allure-decorators`.

**Reason.** The `@step` decorator pattern is almost always a **Selenium/Java
carry-over** — it comes from Java's Allure `@Step` annotation and the JUnit /
TestNG class-based POM mental model. Teams migrating from Selenium-Java or
.NET bring it across, but JS/Playwright doesn't need it: functions are
first-class, and a string-label argument is the native equivalent of an
annotation.

Three concrete reasons we avoid it:

- **Decorators force class-based tests.** That fights Playwright's
  fixture-and-function model — fixtures don't inject naturally into class
  methods, `this`-binding gets confusing in async, parallelism is awkward.
- **The TS decorator spec is in transition** (stage-3 TC39 ≠ the
  `experimentalDecorators` flag most `@step` libraries depend on) — multi-year
  maintenance liability.
- **Inline reads better.** `await test.step('Publish product', ...)` puts the
  label at the point of action; `@step('Publish product')` above a method
  makes the reader scan up.

`test.step()` also integrates with Playwright's trace viewer + HTML report +
Allure tree automatically — decorator libraries usually hook into Allure only.

**Rule of thumb.** Pick the idiom of the current tool, not the idiom of the
previous tool.

**Trade-off.** A few more characters per step. If verbosity hurts (rare in API
tests), reach for helper functions before reaching for decorators.

**Where.** All `tests/**/flows/*.spec.ts`, e.g.
[tests/orders/flows/order-fulfillment.spec.ts](../tests/orders/flows/order-fulfillment.spec.ts)

---

## 15. Hono in-process mock (not MSW / nock / Express)

> **History.** Removed in the source project 2026-05-29 alongside decision 10;
> **LIVE again in this template** (same reinstatement note as §10).

**Decision.** Mock backend is a real Hono HTTP server in `mock/server.ts`,
started by Playwright's `webServer` config.

**Reason.**

- **Real network stack.** Tests exercise actual TCP/HTTP — headers, status
  codes, content-type negotiation, connection lifecycle. MSW intercepts at the
  fetch layer and skips this entirely.
- **Stateful semantics.** The products mock implements a real state machine
  (`draft → published → archived` with terminal state). MSW handlers can do
  this but become unwieldy fast; a real server is the natural fit.
- **Closest to production.** Same code path as hitting a real API. Tests can
  use `expectResponseTime` realistically. If the real API replaces the mock
  later, the test code doesn't change.
- **Lightweight.** Hono is ~30 KB, sub-100ms cold start, TypeScript-native.
  Express is heavier and JS-first.

**Trade-off.** More code than MSW (which is ~20 lines of handlers vs. a small
server). The mock requires the port (8787 by default, `MOCK_PORT` to override) to
be free. For a template that ships a complete contract demo, the extra code is
worth it.

**Where.** [mock/server.ts](../mock/server.ts),
[playwright.config.ts](../playwright.config.ts) `webServer` block

---

## 16. Husky (not lefthook / simple-git-hooks)

**Decision.** Husky v9 for git hooks, configured under `.husky/`.

**Reason.**

- **Default in TS/Node ecosystem.** Documentation, Stack Overflow answers, and
  third-party tutorials all assume Husky. Familiar to anyone who has worked on
  a JS project in the last 5 years.
- **Zero-config in v9.** Just `.husky/<hook>` shell scripts — no `huskyrc`,
  no `pre-commit` package wrapper.
- **Portable.** Pure JS, works on any platform pnpm runs on.

**Trade-off.** **lefthook** is faster (Go binary, parallel hooks). **simple-git-hooks**
has zero dependencies (~50 lines of JS). Husky has neither advantage — but it's
the default a new contributor expects. If hook runtime ever becomes a problem
(currently <2s pre-commit), switch to lefthook.

**Where.** [.husky/](../.husky/),
[package.json](../package.json) `prepare` script

---

## 17. Allure 3 `awesome` (not classic Allure 2 / not custom dashboard)

**Decision.** Reports generated via `allure awesome` (the Allure 3 UI),
not the classic Allure 2 HTML or a custom dashboard.

**Reason.**

- **Three-level Behaviors tree** (epic → feature → story) gives QA/Dev the
  drill-down that classic Allure flattens.
- **Trend across runs** via `--history-path allure-history.json` — single
  committed file, works locally and in CI.
- **Categories** classify failures (schema / status / SLA / infra) so triage
  scales to many tests.
- **Single binary** — same `allure` npm package serves both `awesome` and
  classic; no extra install.

**Trade-off.** A custom dashboard (Grafana / Datadog / GH Pages with custom HTML)
would let you track **organisation-wide** metrics (cross-repo flakiness, SLA
trends per team). Allure is per-run-centric. If your org grows beyond ~3 repos
and needs cross-cutting reports, Allure becomes one of several sources rather
than the source of truth. Not a problem at current scale.

**Where.** [package.json](../package.json) `allure:*` scripts,
[playwright.config.ts](../playwright.config.ts) reporter config

---

## 18. AOM client per service (not per story / flow)

**Context.** Contributors arriving from BDD or Selenium-Java backgrounds often
expect a client class per user story (e.g. `CheckoutClient`,
`RegistrationClient`). This template takes a different axis: one client per
**service domain** (`ProductsClient`, `OrdersClient`).

**Decision.** Client abstraction is per-service. Stories / behaviors live one
level up — at the test file:

- `@isolated` tests (`tests/<svc>/*.spec.ts`) cover per-endpoint contracts.
- `@flow` tests (`tests/<svc>/flows/*.spec.ts`) cover multi-step single-service
  stories.
- Cross-service stories (e.g. `tests/orders/flows/order-fulfillment.spec.ts`)
  compose multiple service clients in one test body and carry both service tags.

**Reason.**

- REST is resource-oriented; clients mirror that. One source of truth per
  endpoint, not five copies of `POST /users` scattered across story clients.
- Stories overlap services (a checkout uses users + products + orders). Resource
  domains do not overlap. Picking the more orthogonal axis makes refactors safer.
- Client = HTTP surface (the _what_). Test = behavior (the _when / why_).
  Mixing them turns the client into a god-object that grows with every new
  story.
- Aligns with Playwright's official guidance ("group by resource or feature,
  not by HTTP method") and the JS / TypeScript ecosystem convention.

**Trade-off.** A complex multi-step flow lives entirely in the test body and
must wire several clients together. If the same flow appears in 3+ tests,
abstract it into a helper that **composes** existing service clients — don't
build a `CheckoutClient` that re-implements user / product / order endpoints.

**Related.** §14 ("Pick the idiom of the current tool, not the previous one")
— the same rationale applies: AOM-per-service is the Playwright / JS-native
idiom; per-story client classes are a carry-over from frameworks where stories
had their own classes.

**Where.** [src/services/](../src/services/) — one folder per service.
[tests/](../tests/) — one folder per service; cross-service stories live in the
flows folder of the service that OWNS the scenario (the order owns fulfillment).

---

## 19. Deterministic reference data is seeded + referenced as code constants, not env (2026-06-06)

**Context.** Tests sometimes need server-side **reference data** the suite itself
must not create per-test — e.g. a role/permission catalog: a test that needs "a
second, lower-privilege role" can't provision one on the fly when role management
is an admin feature outside the suite's scope. In the source project the test env
initially had only one role, so every such test was blocked.

**Decision.** Reference data is **seeded into each environment by a script** whose
source of truth is a committed matrix (one file, reviewed like code). Tests
reference the seeded identifiers as **constants in code** (e.g. a
`PROVISION_ROLE_CODE` const in the service's helpers) — **never** env vars. The
identifiers are not secret and are deterministic (seeded identically across
envs), so they belong in code; env-gating them just adds a way for envs to drift.

**Reason.** Three failure modes this kills:

- _Env drift_ — an identifier living in `.env.<env>` can differ per env; a
  constant + identical seeding cannot.
- _Hidden coupling_ — a reviewer sees exactly which reference data a test depends
  on by reading code, not by diffing env files.
- _Blocked coverage_ — "no second role exists" stops being a reason a test can't
  run; the seed script makes the precondition real everywhere, including a fresh
  env.

**Boundary.** This is for reference data that is **read, never mutated** by
tests. Anything a test mutates must be provisioned per-test/per-worker instead
(`.claude/rules/fixtures.md` "Provisioning stateful services") — seeding mutable
state would couple parallel tests to each other.

**Where.** The exemplar API has no auth, so the template carries no live seed
script — the pattern's shape was: `scripts/<matrix>.ts` (committed source of
truth) + `scripts/seed-*.ts` (idempotent apply, also invoked fail-soft from
global-setup), with constants in `tests/<svc>/helpers.ts`. Re-introduce that pair
when your API has reference data.

---

## 20. Response time: two-tier soft-target + hard-ceiling (not a single SLA) (2026-06-12)

**Context.** Every request ran a single hard SLA (`MAX_RESPONSE_MS=5000`) inside
`BaseClient`, so a functional contract test FAILED whenever the response took
longer than 5s. On a shared test environment that produced recurring false reds: a
different, unrelated endpoint breached 7–14s each run while every functional
assertion was correct. That is latency jitter, not a defect — but it coloured the
regression gate red and eroded trust in the suite. The 5000ms was never a contract
value either: no latency target was specified anywhere in the API contract, and
Decision 13 already notes performance is not what this suite measures.

**Decision.** Split the budget into two tiers (`ApiConfig.responseTargetMs` +
`responseCeilingMs`, env `RESPONSE_TARGET_MS` / `RESPONSE_CEILING_MS`):

- `ms > ceiling` → **hard fail** — the response reads as a hang, a functional test
  should break.
- `target < ms <= ceiling` → **soft warn** — a non-failing `⚠ Slow response` step
  in the report keeps the latency visible without red'ing a correct test.
- `ms <= target` → silent (no report node, as before).

`RESPONSE_TARGET_MS=5000`, `RESPONSE_CEILING_MS=15000` in every env. Provisioning
configs set both tiers to 30s so setup latency neither warns nor fails.

**Reason.** ISTQB separates functional from non-functional testing; coupling a
latency threshold to a functional pass/fail conflates them. A single-sample
per-request check is a poor performance signal anyway (no percentiles, no warmup
exclusion — one GC pause trips it), so its only honest job here is catching a
true hang. Keeping the measurement visible (warn) preserves the latency signal
for triage without making it a gate.

**Trade-off.** A genuine, sustained latency regression in the 5–15s band shows
only as warnings, not a failure — acceptable because real performance coverage
belongs in a dedicated, multi-sample perf check (separately tagged, run against a
perf-stable env), not piggybacked on every contract call. Per-endpoint budgets
were rejected: the breaches were whole-env jitter spread across unrelated
endpoints, so per-endpoint numbers would chase infra noise and drift.

**Where.** [src/core/types.ts](../src/core/types.ts) (`ApiConfig`),
[src/config/api-config.ts](../src/config/api-config.ts) (loads both, falls back to
legacy `MAX_RESPONSE_MS` for the target),
[src/core/BaseValidator.ts](../src/core/BaseValidator.ts)
(`expectResponseTime` soft/hard), `.env.*` (`RESPONSE_TARGET_MS` /
`RESPONSE_CEILING_MS`).

---

## How to add a new decision

When you make a choice that future-you (or a new contributor) might question:

1. Add a section to this file with the same template: Context / Decision /
   Reason / Trade-off / Where.
2. Date the section if it relates to time-sensitive constraints
   ("as of 2026-05 the API does X").
3. Link from the relevant code with a one-line comment:
   `// see docs/decisions.md §N`
4. If a decision becomes obsolete, mark the section **SUPERSEDED** with a link
   to the new section — don't delete it. Future-you needs the history.
