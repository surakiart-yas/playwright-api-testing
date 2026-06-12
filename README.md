# API Automation Template

A Playwright API-test framework template whose product is **the design** — the layered
architecture, the conventions, and the recorded reasoning behind them — not the example
domain. You clone it, run it offline in two minutes, then learn _why each layer exists_
from the ADRs sitting next to a minimal reference implementation.

```bash
nvm use && pnpm install
pnpm test        # offline — the bundled mock boots automatically. No secrets, no network.
```

**Expected result: 20 tests — 18 green, 2 red.** The red ones are deliberate
(`RED-by-design`, [lesson 7](LEARNING-PATH.md#7-spec-is-truth--red-by-design)): the mock
ships two seeded contract bugs and the suite refuses to pretend otherwise. The CI gate
runs `pnpm test:regression`, which is fully green.

## Start here

| You want to…                               | Go to                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| **Learn the framework design** (the point) | [LEARNING-PATH.md](LEARNING-PATH.md) — 10 lessons, each tied to an ADR + real code |
| See the layer map on one page              | [docs/architecture.md](docs/architecture.md)                                       |
| Understand why a convention looks strange  | [docs/decisions.md](docs/decisions.md) — **read before changing patterns**         |
| Get your hands dirty                       | [docs/exercises.md](docs/exercises.md) — graded, with solution pointers            |
| Contribute / add a service / release       | [CONTRIBUTING.md](CONTRIBUTING.md)                                                 |

## What's inside

```
mock/server.ts            the offline backend (Hono) — incl. 2 SEEDED BUGS (teaching material, do not fix)
src/core/                 BaseClient, BaseValidator, types — service-agnostic framework
src/services/products/    the FULL reference service (AOM: types/schemas/Client/Validator)
src/services/orders/      the MINIMAL second service (cross-service dependency)
src/fixtures/, src/utils/ wiring + infra (http, reporting, allure-meta, random, jwt…)
tests/products/           isolated + flow specs, provisioner, 2 RED-by-design specs
tests/orders/             cross-service flow (order decrements product stock)
docs/decisions.md         the ADRs — the teaching gold
docs/examples/products/   a complete worked test-design artifact set (01-reqs → 09-review)
docs/openapi/             the exemplar contract (what the RED tests defend)
.claude/rules/            testing / api-patterns / fixtures / traceability rules
.claude/skills/           /test-design · /test-case · /implement-api-tests · /release
```

## The big ideas (each is a lesson)

1. **AOM layering** — one client per service domain; stories compose clients at the test layer.
2. **Schema = single source** — Zod validates the response AND generates its type (`z.infer`);
   `looseObject` keeps leaked fields visible to assertions.
3. **Two-layer assertions** — validators lock structure; tests assert the values they exist to prove.
4. **Provision, don't seed** — every precondition is created at runtime, recycled, and cleaned up.
5. **Spec is truth** — a contract-violating API gets a visible RED test, never a weakened assertion.
6. **Traceability is mechanical** — `pnpm check:consistency` gates catalog ↔ code drift in CI.

## Commands

```bash
pnpm test               # full suite vs mock (18 green + 2 RED-by-design)
pnpm test:regression    # the green CI gate
pnpm test:smoke         # critical paths only
pnpm test:debug         # verbose HTTP logging
pnpm test:report        # run + open the Allure report
pnpm verify             # lint + type-check + consistency + regression
pnpm mock:start         # run the mock standalone (debugging)
```

Run against a real API: set `BASE_URL` in `.env` (see `.env.example`) — the mock then
stays out of the way. Re-derive your envelope first (lesson 2): never assume it.

## Quality gates

Husky hooks: `pre-commit` lint-staged · `commit-msg` commitlint (Conventional Commits) ·
`pre-push` type-check. CI: one [PR gate](.github/workflows/pr-gate.yml) running exactly
what you run locally — see [docs/cicd-pipeline.md](docs/cicd-pipeline.md) for how to grow
it for live environments.

## Provenance

Extracted from a production API-automation suite (a real back-office project):
services, hosts, accounts, and defect logs were stripped; the framework, the ADRs, and the
hard-won rules were kept and genericized. Where a decision changed between contexts (the
bundled mock!) the ADR records _both_ states — that's [decisions §10](docs/decisions.md),
and it's the most honest lesson in here.

## License

MIT — see [LICENSE](LICENSE). Replace if your organisation requires a different license.
