# Fixtures

## Fixture Scopes

| Fixture                | Scope  | Purpose                                     |
| ---------------------- | ------ | ------------------------------------------- |
| `workerRequest`        | worker | Shared `APIRequestContext` — pre-warmed TCP |
| `apiConfig`            | test   | Loaded from env vars                        |
| `<service>Client`      | test   | Wired in `tests/<service>/fixtures.ts`      |
| `<service>Provisioner` | worker | Creates/recycles test data; cleans up       |

## Credentials

- Never hardcode credentials. The exemplar API is public; when a real API needs
  accounts, keep ONLY the provisioning admin account(s) in env — the suite provisions
  every other test user/resource at runtime.
- Credentials live in env vars only, never in `ApiConfig` defaults or code.

## Protected Endpoints

- Tests provision + mint their own token at runtime (no static token bypass). The
  service fixture auto-skips when the required credentials aren't configured.
- Pass a minted token via constructor: `new <Svc>Client({ ...apiConfig, authToken }, request, testInfo)`

## Provisioning stateful services (independence)

When a test needs a server-side precondition the API never hands back (a resource in a
specific state, a known password), do NOT seed fixed records in env — provision at
runtime so tests stay independent and repeatable. Reference:
`tests/products/provisioner.ts` (the simple, credential-free shape; the advanced
admin-pool shape is sketched in docs/exercises.md exercise 5).

- **env holds only**: provisioning admin credentials (when the API needs them) + any
  QA bypass value. Make admin accounts per-worker when the API enforces
  single-session-per-account — a shared admin session is flaky across parallel
  workers. Deterministic reference data (e.g. role codes) does **not** live in env —
  it is a CONST in `tests/<svc>/helpers.ts`, seeded identically across envs. Don't
  env-gate reference data. See [docs/decisions.md §19](../../docs/decisions.md).
- **provision in code**: a worker-scoped fixture builds the provisioner; it creates /
  resets / deletes test resources on demand. Name them with `autotestSlug()`.
- **recycle, don't pile up**: reuse worker-cached subjects for READ-ONLY tests
  (`getSubjectProduct()`); tests that MUTATE their subject take a disposable one
  (`createDisposableProduct()`) or reset it back to the needed state. Each test
  derives its own state → order-independent, run N times = same result.
- **cleanup**: teardown removes everything created (tracked ids / matched by the
  `autotest-` prefix). If the API has no hard-delete, soft-delete (set status
  INACTIVE) and say so in a comment.
- **degrade gracefully**: required admin / bypass credentials unset → `test.skip`
  (never fail). Negative tests that need no precondition stay zero-config and always
  run. (Distinct from a provisioning call that FAILS — that throws; see
  docs/decisions.md §6.)
