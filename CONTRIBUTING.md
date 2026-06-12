# Contributing

This is a Playwright API testing template. Before you start, read
[`docs/decisions.md`](docs/decisions.md) — every "why a convention exists" is captured there.

## Setup

```bash
nvm use            # pin Node version (.nvmrc)
pnpm install       # installs deps + Husky hooks via `prepare`
pnpm test          # full suite against the bundled mock — offline, no secrets
                   # (expect exactly 2 RED tests: the RED-by-design specs, see LEARNING-PATH lesson 7)
pnpm test:regression   # the green CI gate (RED-by-design specs carry no scope tag)
```

To run against a real API instead of the mock, set `BASE_URL` in `.env.<TEST_ENV>` and run
`TEST_ENV=<env> pnpm test`.

## Common workflows

### Add a new service

The recommended path is the `/implement-api-tests` skill. To do it by hand, follow this shape:

1. **Scaffold files** — copy `src/services/products/` to `src/services/<svc>/` and adapt:

   | File                | Adapt                                                                    |
   | ------------------- | ------------------------------------------------------------------------ |
   | `types.ts`          | Request types + `*Code`/`*Error` catalogs + state enum (if any)          |
   | `schemas.ts`        | Zod schemas — keep `looseObject` envelopes; response types via `z.infer` |
   | `<Svc>Client.ts`    | HTTP methods extending `BaseClient`                                      |
   | `<Svc>Validator.ts` | `expect*Success` / `expect*Error` helpers extending `BaseValidator`      |

2. **Scaffold tests** — copy `tests/products/` to `tests/<svc>/` and adapt:

   | File             | Adapt                                                                 |
   | ---------------- | --------------------------------------------------------------------- |
   | `fixtures.ts`    | Wire `<Svc>Client` (+ provisioner if the service is stateful)         |
   | `provisioner.ts` | Only for stateful services — see `.claude/rules/fixtures.md`          |
   | `*.spec.ts`      | Test cases per [`.claude/rules/testing.md`](.claude/rules/testing.md) |

3. **Register** — add a Service Registry row in [`CLAUDE.md`](CLAUDE.md) and the `@<svc>`
   tag to `ALLOWED` in `scripts/check-consistency.sh`.

4. **Playwright auto-discovers** the new `tests/<svc>/` directory — no config change.

5. **Mock-first development:** for a service that exists only as teaching material, also
   implement its endpoints in `mock/server.ts`. For a REAL service, point `BASE_URL` at
   its environment instead.

> **Envelope:** confirm the envelope from the spec examples before writing schemas — the
> single most expensive mistake is assuming it. This template uses `code: 'OK'`; many
> real APIs use a numeric sentinel or a `success` boolean. See
> `.claude/rules/api-patterns.md`.
>
> **Stateful services** (tests need a server-side precondition the API won't hand back):
> don't seed records in env. Use the **provisioning pattern** —
> `tests/products/provisioner.ts` + the "Provisioning stateful services" section in
> [`.claude/rules/fixtures.md`](.claude/rules/fixtures.md).

### Add a new endpoint to an existing service

Modify files **in this exact order** — skipping order causes type errors:

```
types.ts  →  schemas.ts  →  <Svc>Client.ts  →  <Svc>Validator.ts  →  spec
```

(Hands-on version with a solution sketch: [`docs/exercises.md`](docs/exercises.md) exercise 1.)

### Design test cases from a requirement

Two complementary skills live in `.claude/skills/`:

1. **`/test-design`** — ISTQB-driven analysis + design (REQ → scope → breakdown → catalog → review)
   - Produces portable markdown in `.test-design-scratch/<feature>/` (gitignored)
   - Does NOT generate spec code
2. **`/test-case`** — per-TC quality workbench
   - Write a single TC, review a TC against the 22-check rubric, or refactor batch

After the design phase, convert the approved test catalog into `tests/<svc>/*.spec.ts`
following the conventions in [`.claude/rules/testing.md`](.claude/rules/testing.md)
(naming, tags, validator pattern). A finished worked example of the whole artifact set
lives in [`docs/examples/products/`](docs/examples/products/).

## Conventions in 60 seconds

| What               | Rule                                                              |
| ------------------ | ----------------------------------------------------------------- |
| Test data names    | `autotestSlug()` only — never hardcode `autotest-`                |
| Multi-field assert | `expect(json.data).toMatchObject({...})`, not multi-`toBe`        |
| Validators         | Structural (HTTP status, schema, envelope) — never field values   |
| Tests              | Behavioral (field values, business invariants)                    |
| Tags               | `@smoke ⊂ @regression ⊂ all` + `@<service>` + `@isolated`/`@flow` |
| Negative test      | `expect<Svc>Error(res, status, code, error)` — pin the exact code |
| Cross-service      | Compose both services' clients; tag with BOTH service tags        |
| Buggy API          | Assert the contract, leave the test RED, no scope tags            |

Full rules: [`.claude/rules/testing.md`](.claude/rules/testing.md),
[`.claude/rules/api-patterns.md`](.claude/rules/api-patterns.md),
[`.claude/rules/fixtures.md`](.claude/rules/fixtures.md),
[`.claude/rules/traceability.md`](.claude/rules/traceability.md).

## Commits

We enforce [Conventional Commits](https://www.conventionalcommits.org/) via commitlint.

```
<type>(<scope>): <subject>

types:    feat | fix | docs | style | refactor | test | chore | perf | ci | revert | build
```

Examples:

```bash
git commit -m "feat(products): add bulk-publish endpoint"
git commit -m "fix(allure): correct story label index"
git commit -m "test(orders): add boundary cases for quantity"
git commit -m "chore: bump playwright to 1.61"
git commit -m "docs(decisions): add §21 on retry policy"
```

Bad messages get rejected at commit time — fix and retry.

## Before you push

The `pre-push` hook runs `pnpm type-check`. Also run locally for confidence:

```bash
pnpm lint
pnpm type-check
pnpm check:consistency
pnpm test:regression
```

CI runs the same set (plus `format:check`) on every PR — see
[`.github/workflows/pr-gate.yml`](.github/workflows/pr-gate.yml).

## Releasing

gitflow: `feature/* → develop → main`. `main` is the released/stable line; `develop` is integration.
Versioning is **SemVer 0.x** (see the [`CHANGELOG.md`](CHANGELOG.md) header): **MINOR** = a new service /
feature suite, **PATCH** = coverage gap-fills, reconciles, CI/tooling, dependency bumps. `1.0.0` = all
planned services covered.

> **Merge method (repo-enforced):** every PR merges via a **merge commit** — squash & rebase are
> disabled at the repo level and merged branches auto-delete. (Squash was the old default; it gave each
> merge a fresh SHA with no shared ancestry, so every `develop → main` release conflicted. Merge commits
> keep ancestry intact → clean releases.)

To cut a release (`develop → main`):

1. **Prep on `develop`** (via a normal PR):
   - bump `version` in `package.json`;
   - add a `CHANGELOG.md` section `## [X.Y.Z] - <date> — targets OpenAPI <contract version>` grouped
     Added / Changed / Fixed.
2. **Cut a throwaway `release/vX.Y.Z` branch from `develop`** and open the **Release PR**
   `release/vX.Y.Z → main`, titled `Release vX.Y.Z`. The PR gate runs.

   ```bash
   git checkout develop && git pull
   git push origin develop:refs/heads/release/vX.Y.Z      # snapshot of develop's tip
   gh pr create --base main --head release/vX.Y.Z --title "Release vX.Y.Z"
   ```

   > ⚠️ **Never open the release PR directly from `develop`.** Auto-delete-on-merge removes the PR's
   > head branch — a `develop → main` PR therefore **deletes `develop`** on merge. Always use a
   > throwaway `release/*` head: it auto-deletes harmlessly while `develop` survives. (If `develop` ever
   > does get deleted, restore it: `git push origin <release-PR-head-SHA>:refs/heads/develop`.)

3. **Merge, then tag** the merge commit on `main` and push:

   ```bash
   git checkout main && git pull
   git tag -a vX.Y.Z -m "vX.Y.Z — <one-line summary>"
   git push origin vX.Y.Z
   ```

4. Branches **auto-delete on merge** (repo setting); remove any local leftover with `git branch -D <branch>`.
5. **Bump `develop` to the next dev version** — right after the release, set `package.json` on `develop`
   to the next version with a `-dev` suffix (e.g. `0.2.0-dev`) and open an `## [Unreleased] — X.Y.Z-dev`
   CHANGELOG section. This keeps `develop` ahead of `main`, so report metadata shows a version that
   tells the in-progress line (`v0.2.0-dev`) apart from the released tag (`v0.1.0`). The `-dev` suffix is
   dropped at the next release prep (step 1).

> The suite version and the **OpenAPI contract version** (`docs/openapi/openapi(<svc>).yaml`) are
> separate axes — always note which contract a release targets in its CHANGELOG entry. After a
> hotfix/dep bump lands on `main`, back-merge it to `develop`.

## When a new pattern emerges

If during work you find that an existing convention doesn't cover your case:

1. **Don't silently invent a new pattern.** Stop and discuss.
2. Propose a new section for [`docs/decisions.md`](docs/decisions.md) — Context, Decision, Reason, Trade-off, Where.
3. Once approved, update the doc AND apply the pattern.
4. If it changes how tests get written, also update [`.claude/rules/testing.md`](.claude/rules/testing.md).

This keeps the project navigable for the next contributor.

## Questions

Open an issue or ask the relevant code owner. For "why is X like this?" — start with
[`docs/decisions.md`](docs/decisions.md). It's the single source of truth.
