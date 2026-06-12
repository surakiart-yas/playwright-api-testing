# Architecture — the layers and why each exists

One page, design-first. Code detail lives in the linked files; rationale lives in
[decisions.md](decisions.md) (§ numbers below).

```
┌─────────────────────────────────────────────────────────────────────┐
│ tests/<svc>/*.spec.ts            BEHAVIOR — what the API must do    │
│   isolated (per-endpoint contract) + flows/ (composition)          │
│   inline expect() = field values, business invariants        (§4)  │
├─────────────────────────────────────────────────────────────────────┤
│ tests/<svc>/fixtures.ts + provisioner.ts   WIRING + PRECONDITIONS  │
│   test-scoped client · worker-scoped provisioner (create/recycle/  │
│   cleanup) · skip-when-unconfigured                    (fixtures.md)│
├─────────────────────────────────────────────────────────────────────┤
│ src/services/<svc>/              AOM — one client per SERVICE (§18)│
│   types.ts    request types + code/error catalogs (hand-written)   │
│   schemas.ts  Zod, SINGLE SOURCE of response shape           (§13) │
│   Client.ts   HTTP surface, extends BaseClient                     │
│   Validator.ts structural asserts, extends BaseValidator      (§4) │
├─────────────────────────────────────────────────────────────────────┤
│ src/core/                        FRAMEWORK — service-agnostic      │
│   BaseClient   verbs + auth header + auto response-time check (§20)│
│   BaseValidator expectStatus/expectSchema/expectErrorData/verify   │
│   types        ApiConfig · envelope type · HttpStatus              │
├─────────────────────────────────────────────────────────────────────┤
│ src/fixtures/base.ts + src/utils/ + src/config/   INFRASTRUCTURE   │
│   workerRequest (pre-warmed, worker-scoped) · apiConfig (env)      │
│   http (send+attach+log) · reporting · allure-meta (§1/§2) · random│
├─────────────────────────────────────────────────────────────────────┤
│ mock/server.ts                   THE BACKEND (offline, seeded bugs)│
│   real Hono HTTP server via Playwright webServer        (§10, §15) │
└─────────────────────────────────────────────────────────────────────┘
```

## Why each layer exists

- **core vs services** — `core` knows HTTP and assertions, never a domain. A new service
  adds four files and zero core changes; a core fix (e.g. the response-time policy, §20)
  lands everywhere at once.
- **one client per service, not per story (§18)** — REST is resource-oriented; stories
  overlap services, resources don't. Stories live at the test layer, composing clients.
- **schema as the single source (§13)** — the Zod schema both validates the response AND
  generates the response types (`z.infer`), so shape and types cannot drift. `looseObject`
  keeps unknown/leaked fields visible to assertions (the costPrice lesson).
- **two-layer assertions (§4, §5)** — validators assert structure (status, schema, business
  code) for every test identically; tests assert the values that make THIS test exist.
  Both layers show up in the report: a boxed `Verify:` node per validator call, inline
  diffs (`toMatchObject`) for behavior.
- **fixtures own scope (fixtures.md)** — the request context is worker-scoped (one warmed
  TCP pool per worker); config and clients are test-scoped (each test gets its own
  `testInfo` so every request attaches to the right report). Provisioners are
  worker-scoped because their cache and cleanup span tests.
- **provision, don't seed (fixtures.md, §6, §8, §19)** — every mutable precondition is
  created at runtime under the `autotest-` prefix, recycled where read-only, and removed
  in teardown. Only credentials (none for the mock) and deterministic reference data
  (constants, §19) live outside the tests.
- **the mock is a real server (§15)** — tests exercise the real network stack, and the
  seeded bugs make the discipline lessons (RED-by-design, leak detection) concrete.

## Trace of one request

`test` → `productsClient.createProduct(body)` → `BaseClient.post` → `sendRequest`
(URL build, fetch, timing, masked attachment, debug log) → `expectResponseTime`
(warn/fail tiers, §20) → back to the test → `ProductsValidator.expectCreateSuccess(res)`
(status → schema → code, boxed `Verify:`) → inline `expect(json.data).toMatchObject(...)`.

Read it in code: [tests/products/create.spec.ts](../tests/products/create.spec.ts) TC-001.
