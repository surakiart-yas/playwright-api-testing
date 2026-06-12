# CI/CD — the PR gate (and how to grow it)

The template ships **one workflow**: [.github/workflows/pr-gate.yml](../.github/workflows/pr-gate.yml).
Because the suite runs offline against the bundled mock, the gate needs **no secrets, no
environments, no concurrency locks** — every step a contributor runs locally is exactly
what CI runs.

| Step                     | Catches                                                   |
| ------------------------ | --------------------------------------------------------- |
| `pnpm lint`              | style / unused vars                                       |
| `pnpm type-check`        | schema↔type drift (lesson 2), wiring errors               |
| `pnpm format:check`      | formatting drift                                          |
| `pnpm check:consistency` | code ↔ 07 ↔ 08-rtm TC drift, unsanctioned tags (lesson 8) |
| `pnpm test:regression`   | actual behavior, against the mock booted by `webServer`   |

**Why `test:regression`, not `test`:** RED-by-design specs (lesson 7) are deliberately
failing and carry no scope tag — the gate must be green by construction while `pnpm test`
(full) keeps the reds visible. The scope hierarchy `@smoke ⊂ @regression ⊂ all` is the
single mechanism behind both.

## Growing it for a real API

When tests target live environments, the design constraints change — these were the
hard-won rules from the source project:

- **Don't run live envs on every PR.** Live runs need secrets, collide across parallel
  PRs (shared accounts, single-session APIs), and turn infra flakiness into PR noise.
  Keep the PR gate static (lint/type/format/consistency) + mock tests; move live runs to
  a schedule (`nightly: smoke daily, regression weekly`) and a `workflow_dispatch` with
  typed inputs (environment / service tag / scope / workers).
- **Serialize per environment** (`concurrency: <workflow>-<env>`) — parallel runs against
  one env fight over provisioned accounts.
- **Secrets per GitHub Environment** (`sit` / `uat` / …), never in the repo; `BASE_URL`
  and admin credentials come from the environment, selected by the dispatch input.
- **Per-service dispatch dropdown** must list each service tag — adding a service means
  adding an option (the one manual CI step; forgetting it makes the service un-runnable
  on-demand).
- **Publish the Allure report** (`allure:generate` with the committed
  `allure-history.json` for trend) as a workflow artifact or to Pages.
