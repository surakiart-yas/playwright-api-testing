# Changelog

All notable changes to this template are documented here.

Format: [Keep a Changelog](https://keepachangelog.com). Versioning is **SemVer 0.x** adapted for a
test suite: **MINOR** = a new service / feature suite or a framework-level capability, **PATCH** =
coverage gap-fills, doc fixes, CI/tooling, dependency bumps. See CONTRIBUTING.md → "Releasing".

## [0.1.0] - 2026-06-12

Template baseline.

### Added

- Framework core: `BaseClient` (two-tier response budget), `BaseValidator`
  (`expectStatus` / `expectSchema` / `expectErrorData` / boxed `Verify:` steps), Zod
  schema-as-single-source pattern.
- Exemplar services: `products` (full AOM reference — isolated + flow specs, provisioner,
  RED-by-design specs) and `orders` (minimal cross-service exemplar).
- Offline Hono mock backend (`mock/server.ts`) with deliberately seeded bugs, wired via
  Playwright `webServer` — `pnpm test` is green on a fresh clone with no secrets and no network.
- Teaching layer: `LEARNING-PATH.md` (10 lessons), `docs/architecture.md`,
  `docs/exercises.md`, worked test-design example under `docs/examples/products/`.
- Design records: `docs/decisions.md` (ADRs), `.claude/rules/*`, skills
  (`/test-design`, `/test-case`, `/implement-api-tests`, `/release`).
