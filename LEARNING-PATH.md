# Learning Path — how to design an API test framework

This template teaches **framework design** — the architecture and the decisions — using a
small runnable suite as the vehicle. Each lesson is: **(a)** the design problem, **(b)** the
decision taken + where its rationale lives, **(c)** where to see it in code, **(d)** a
one-line exercise.

Before lesson 1: `pnpm install && pnpm test` (offline; expect **18 green + 2 red** — the
red ones ARE lesson 7). Skim [docs/architecture.md](docs/architecture.md) for the layer map.

> Sequencing: lessons 1–6 build the framework, 7–8 are the discipline that makes it
> trustworthy, 9–10 are the operational wrap. You can stop after 6 and already build;
> 7–10 are what makes it _production_.

---

## 1. Architecture & layers — where does code go?

**Problem.** Without a layering rule, every test invents its own HTTP calls and helpers;
"fix one endpoint" means touching twenty files.

**Decision.** Four layers — core (service-agnostic) → services (AOM: one client per
_service domain_, not per user story) → fixtures (wiring + scope) → tests (behavior).
Rationale: [decisions §18](docs/decisions.md), [docs/architecture.md](docs/architecture.md).

**See it.** [src/core/](src/core/) knows no domain; [src/services/products/](src/services/products/)
is four files; the checkout-style story composes clients in
[tests/orders/flows/order-fulfillment.spec.ts](tests/orders/flows/order-fulfillment.spec.ts).

**Exercise.** Find the one place you'd change to add a default header to every request of
every service. (If your answer names more than one file, reread the layer map.)

## 2. The envelope & schema as single source of truth

**Problem.** APIs wrap everything in an envelope (`{ code, message, data }`). Hand-writing
a TS interface _and_ a validation schema for each response makes two sources that drift.

**Decision.** One bespoke Zod schema per response; the type is INFERRED from it
(`z.infer`). Envelopes/data use `looseObject` so unknown — and leaked — fields stay
visible. Rationale: [decisions §13](docs/decisions.md), [§3](docs/decisions.md),
[rules/api-patterns.md](.claude/rules/api-patterns.md).

**See it.** [src/services/products/schemas.ts](src/services/products/schemas.ts) (the
`successEnvelope` helper) + [types.ts](src/services/products/types.ts) (`z.infer`, and the
hand-written `ProductCode` catalog — requests and constants stay hand-written on purpose).

**Exercise.** Delete `price` from `productData` in schemas.ts and run `pnpm type-check` —
watch the inferred type break the spec that uses it. Revert.

## 3. BaseClient — one HTTP surface

**Problem.** Every client needs the same things: base URL joining, auth header, timing,
logging, report attachments. Repeat them per service and they diverge.

**Decision.** `BaseClient` owns the verbs; `request`/`testInfo` are injected via the
constructor (never method params); auth is one `getAuthHeaders()` override; the
response-time check runs automatically after every call.
Rationale: [rules/api-patterns.md](.claude/rules/api-patterns.md) "BaseClient Rules".

**See it.** [src/core/BaseClient.ts](src/core/BaseClient.ts) →
[src/utils/http.ts](src/utils/http.ts) (one boxed report step per request, masked
attachment) → [ProductsClient.ts](src/services/products/ProductsClient.ts) (how thin a
concrete client is).

**Exercise.** Trace TC-001's single `createProduct` call through all three files.

## 4. Two-layer assertions — structural vs behavioral

**Problem.** If validators assert field values they become god-objects; if tests assert
structure every test copy-pastes three lines.

**Decision.** Validator = structure (status → schema → business code), boxed under one
`Verify:` report node. Test = the values this TC exists to prove, via `toMatchObject`
(one diff shows all mismatches). Rule of 3 before abstracting a field combo.
Rationale: [decisions §4, §5](docs/decisions.md), [rules/testing.md](.claude/rules/testing.md)
"Assertion Style".

**See it.** [ProductsValidator.ts](src/services/products/ProductsValidator.ts) vs the
inline expects in [tests/products/create.spec.ts](tests/products/create.spec.ts) TC-001.

**Exercise.** TC-012 asserts a readback after a rejected update. Say which of its lines
are structural and which behavioral — and why the readback line is the one that earns
the test its existence.

## 5. Fixtures & scopes — who lives how long

**Problem.** A fresh TCP connection per test is slow; one shared client for everything
attaches requests to the wrong test report and leaks auth state across tests.

**Decision.** `workerRequest` is worker-scoped (pre-warmed once); `apiConfig` and clients
are test-scoped (each carries the live `testInfo`); provisioners are worker-scoped (their
cache + cleanup span tests). Rationale: [rules/fixtures.md](.claude/rules/fixtures.md).

**See it.** [src/fixtures/base.ts](src/fixtures/base.ts) →
[tests/products/fixtures.ts](tests/products/fixtures.ts) (the extend chain).

**Exercise.** Predict what breaks if `productsClient` became worker-scoped. (Hint: where
do its request attachments land in the report?)

## 6. Runtime provisioning & independence

**Problem.** Tests that need pre-existing state (an existing product, a user with a known
password) either depend on seeded data (drifts, fought over in parallel) or create a pile
of junk every run.

**Decision.** Provision at runtime: worker-scoped provisioner creates on demand under the
`autotest-` prefix, caches read-only subjects, gives mutating tests disposables, deletes
everything in teardown. Setup failure THROWS; a missing dependency SKIPS.
Rationale: [rules/fixtures.md](.claude/rules/fixtures.md) "Provisioning stateful services",
[decisions §6, §8, §19](docs/decisions.md).

**See it.** [tests/products/provisioner.ts](tests/products/provisioner.ts) (simple shape);
the advanced shape (admin pools, session kicks) is in
[.claude/skills/implement-api-tests/references/provisioning.md](.claude/skills/implement-api-tests/references/provisioning.md).

**Exercise.** Why does TC-011 use `createDisposableProduct()` while TC-009 uses
`getSubjectProduct()`? What ordering bug appears if you swap them?

## 7. Spec-is-truth / RED-by-design

**Problem.** The API violates its own contract. Weakening the assertion to match the bug
turns the suite green — and removes every reason for the bug to ever get fixed.

**Decision.** Assert the documented-correct behavior, leave the test visibly RED, omit
scope tags so it doesn't block the PR gate, and comment the defect. Never `test.fail(true)`
(a masked green hides the gap). Rationale: [rules/testing.md](.claude/rules/testing.md)
"Spec is the source of truth".

**See it — live.** The 2 red tests in `pnpm test`:
[create.spec.ts](tests/products/create.spec.ts) TC-006 (mock seeded BUG #1: missing price
accepted) and [list.spec.ts](tests/products/list.spec.ts) TC-010 (BUG #2: `costPrice`
leaks — only catchable because of lesson 2's `looseObject`). The contract they defend:
[docs/openapi/openapi(products).yaml](<docs/openapi/openapi(products).yaml>).

**Exercise.** docs/exercises.md exercise 3 — "fix" a seeded bug in the mock and watch the
red test flip green, then restore the bug.

## 8. Traceability — the catalog ↔ code contract

**Problem.** Test docs rot. Six months in, nobody knows whether the catalog, the RTM, or
the code is current — so none is trusted.

**Decision.** One DAG with one source of truth (`07-test-cases.md`); code carries TC-IDs;
`08-rtm` is derived; snapshots are banner-marked; `pnpm check:consistency` mechanically
gates code↔07↔08 drift in CI. Rationale: [rules/traceability.md](.claude/rules/traceability.md).

**See it.** [docs/examples/products/](docs/examples/products/) (the full worked 01→09 set —
note REQ-008 recorded as a _deliberate_ gap) ↔ the `allure.label.tc` annotations in
[tests/products/](tests/products/) ↔ [scripts/check-consistency.sh](scripts/check-consistency.sh).

**Exercise.** Delete one TC row from 07 and run `pnpm check:consistency`. Read the error,
restore the row.

## 9. Reporting & the response-time budget

**Problem.** A report nobody can read is a report nobody reads; and a hard per-request SLA
turns infra jitter into false reds that train people to ignore failures.

**Decision.** Allure tree = Service → Type → Endpoint (epic/feature/story from tags), with
`Verify:`/`Precondition:` boxed steps and masked attachments per request. Response time is
two-tier: soft target → non-failing warn; hard ceiling → fail (a hang).
Rationale: [decisions §1, §2, §17, §20](docs/decisions.md).

**See it.** [src/utils/allure-meta.ts](src/utils/allure-meta.ts),
[BaseValidator.expectResponseTime](src/core/BaseValidator.ts),
[src/utils/reporting.ts](src/utils/reporting.ts). Run `pnpm test:report` and explore.

**Exercise.** Set `RESPONSE_TARGET_MS=1` and rerun one spec — find the ⚠ warn steps and
explain why they don't fail the run.

## 10. CI gates & releasing

**Problem.** What should block a PR? Running RED-by-design tests in the gate blocks every
PR forever; running nothing lets drift in. And a test suite needs versioning discipline
just like a product.

**Decision.** One PR gate: lint + type-check + format + `check:consistency` +
`test:regression` against the mock (RED-by-design specs carry no scope tag, so the gate is
green by construction while full runs stay honest). Releases: SemVer 0.x for a test suite,
gitflow with merge commits, the `/release` runbook.
Rationale: [.github/workflows/pr-gate.yml](.github/workflows/pr-gate.yml),
[CONTRIBUTING.md](CONTRIBUTING.md) "Releasing", [.claude/skills/release/](.claude/skills/release/SKILL.md).

**Exercise.** Explain why `pnpm test` is allowed to be red while `pnpm test:regression`
must be green — and what breaks (socially, not technically) if you swap that.

---

## After the path

- Build something: [docs/exercises.md](docs/exercises.md) (graded, with solution pointers).
- Adopt for a real API: change `BASE_URL`, re-derive the envelope from YOUR spec
  (lesson 2 — never assume it), grow a provisioner (lesson 6), delete the mock when a
  stable env replaces it ([decisions §10](docs/decisions.md) shows both states of that
  decision being right).
- The process skills: `/test-design` (catalog), `/test-case` (per-TC quality),
  `/implement-api-tests` (catalog → code), `/release`.
