# Provisioning — independent, stable preconditions

The difference between a suite that runs the same every time and one that flakes is how it
gets its preconditions. The rule: **create what a test needs at runtime; never depend on
fixed accounts somebody seeded once.** The SIMPLE reference (public API, no credentials)
is `tests/products/provisioner.ts` + `tests/products/fixtures.ts`. The ADVANCED shape
below — admin accounts, bypass values, session kicks — is distilled from a real
production auth suite; reach for it when your API is protected and stateful.

## First, decide per TC: does it need a precondition?

| TC kind                                                    | Needs provisioning? |
| ---------------------------------------------------------- | ------------------- |
| Missing/empty field, malformed token, no auth header → 4xx | No — zero-config    |
| Unknown/non-existent entity → 4xx                          | No — random id      |
| Anything that needs an existing entity in a specific state | Yes                 |
| Anything that needs a valid session / known credential     | Yes                 |

Zero-config negatives are the cheapest, most reliable tests you have. They need only an
unauthenticated client and run on a bare checkout. Write them first; they are your smoke
signal that the endpoint is reachable and the envelope is right.

## The hard constraint: the API rarely hands back what you need

The expensive discovery in the source project's auth suite: the API never returns or lets you set a password.
`POST /user/create` returns only `{ id }`; `resetPassword` returns expiry metadata, not the
value; there is no set-password and no hard-delete. So "create a user then log in as them"
is impossible with the create API alone.

Before designing the provisioner, find out from the spec (and the team) **what the
environment lets you do that the public contract does not**:

- Is there an admin/create API at all?
- Is there a QA bypass — a fixed value the test backend accepts in place of a generated
  secret? The source project had a "bypass temp password": login with it as any
  must-change user always succeeds, which is what makes full provisioning possible
  (create → log in with bypass → set a known password → recycle).
- Is there a way to backdate time-based fields? Usually not → those cases are manual (see
  feasibility in `spec-authoring.md`).

This dependency on an admin API is not a smell. It is the cost of independence: you cannot
have both "no seeded accounts" and "no dependency on a create API". Pick independence.

## The provisioner shape

A worker-scoped class that owns: a per-worker admin login (when the API needs one), an
admin client, the bypass value, a list of everything it created (for teardown), and a few
cached reusable subjects. Copy `tests/products/provisioner.ts` and grow it. The
production auth provisioner exposed:

- `getActiveSubject()` — create a user, run the first-time flow (log in with bypass → set a
  known password), cache it. Reused across tests; login is read-only so reuse is safe.
- `mintChangePasswordToken()` — reset the cached must-change subject, return a fresh scoped
  token. Reset-before-each makes it order-independent and infinitely repeatable.
- `getInactiveUsername()` — create a user with status INACTIVE; cache.
- `createDisposableActive()` — a fresh subject for a destructive test (one whose state the
  test will mutate, e.g. change its password or deactivate it).
- `setStatus(id, status)` / `cleanup()` — flip state mid-test; teardown soft-deletes.

Three patterns make it stable:

1. **Recycle, do not pile up.** No hard-delete means every created user is forever. So reuse
   a small set of worker-cached subjects and `reset` them back to the needed state instead
   of creating one per test. A run creates a handful of users per worker, not one per test.
   Corollary: every unique value is consumed forever, so generate full-width random (not a
   short prefix + a couple of chars) or runs eventually collide on a stale username.
2. **Refresh on `exp`, not on a clock — and retry once on a kick.** Do NOT use a "re-login if
   the token is older than ~12 min" wall-clock timer (a real defect we had to remove): it
   cannot detect a session revoked EARLY by a kick, and it guesses a TTL that varies per env.
   Read the token's own `exp` (`isJwtExpired`) to decide refresh, and wrap every admin op in a
   retry that, on an auth-code error, forces one fresh login and retries once.
3. **Share ONE admin session per worker across provisioners.** The subtle one. When all
   services run in a single process (nightly `service: all`), the auth provisioner and the
   user provisioner on the same worker each log into the SAME per-worker admin account — and
   the second login single-session-kicks the first (the API validates sessions server-side by
   accessUUID, so even a not-yet-expired cached token then 401s). Symptom: a perfectly valid
   admin call flakes with 401 ONLY when suites run together. Fix: a module-scoped shared admin
   session (one login per worker process) that every provisioner reuses, so there is no second
   login and no kick — a module-level `getSharedAdminToken(config, request, creds)` cache.

## Two more traps: the spec client's SLA, and per-field charsets

- **The assert-against client must inherit the REAL per-request SLA.** Provisioning clients get
  a relaxed timeout (e.g. 30s) so setup never trips the SLA — but the client the SPEC asserts
  through must NOT. Bake the relaxed timeout into it and you silently disable the response-time
  check for every contract call (an endpoint regressing to 8s stays green). Give the spec client
  the real target/ceiling from `loadApiConfig`; keep the relaxed budget for setup calls only.
- **One slug does not satisfy every field.** Field charsets differ — `username` is alphanumeric,
  `lastName` may be letters-only, `email` takes the slug. A single shared slug with hyphens or
  digits fed to a letters-only field is rejected (1009) and shows up as flaky "create failed" in
  setup. Build each field to its own rule in the payload factory. (1009 here = the
  source API's `invalid_data` code.)

## Env model (what belongs in env vs code)

Env holds **only credentials**; every create/reset/deactivate/cleanup operation lives in
code. For a protected API that is typically:

```
ADMIN_01_USERNAME / _PASSWORD    # per-worker admin accounts (create/reset/deactivate)
ADMIN_02_* ...                   # one per parallel worker
QA_BYPASS_TEMP_PASSWORD          # the QA fixed bypass value (if the backend offers one)
# (reference data stamped on created records = a constant in helpers.ts, not env — §19)
```

Per-worker admins matter: single-session-kick revokes a shared admin's token when another
worker logs in, so different workers must not share one admin account. (Two distinct axes: a
DIFFERENT admin per worker — env above — AND, within a worker, all provisioners SHARE that one
account's session via the shared-session pattern. Distinct-per-worker + shared-within-worker is
the combination that never kicks: at least as many admin accounts as `workers`.)

Treat a `REPLACE_ME_*` placeholder as "unset" (a tiny helper that returns undefined for
empty-or-placeholder values), so `.env.local` can ship with visible placeholders and the
suite still skips cleanly until real values are pasted in.

## Wire it as a worker fixture, and skip when unconfigured

```typescript
svcProvisioner: [
  async ({ workerRequest }, use, workerInfo) => {
    const admin = getWorkerAdmin(workerInfo.workerIndex)
    const bypass = getBypassTempPassword()
    if (!admin || !bypass) { await use(undefined); return }   // skip, do not fail
    const p = new Provisioner(loadApiConfig(), workerRequest, admin, bypass, getRole())
    await use(p)
    await p.cleanup()                                          // teardown soft-deletes
  },
  { scope: 'worker' },
],
```

In each precondition test: `test.skip(!provisioner, 'requires admin provisioning — set ...')`.
When the admin/bypass is absent the test skips with a clear reason; the zero-config
negatives still run. A missing env var should never produce a wall of red.

## You usually cannot verify provisioning offline

Provisioning calls the real API, so type-check + lint + `--list` cannot prove the runtime
assumptions (does the bypass really yield the must-change scope? does create really start
must-change?). State those assumptions explicitly in your handoff so the first real run with
credentials confirms them, and consider catching provisioning-setup failures into a `skip`
so an upstream API hiccup degrades to skipped rather than a red worker.
