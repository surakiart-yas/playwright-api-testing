---
name: release
description: Cut a versioned release of the test suite (gitflow develop → main) following CONTRIBUTING "Releasing". Step-by-step executable runbook: pick the version (SemVer 0.x — PATCH vs MINOR), prep PR on develop (bump package.json + CHANGELOG), throwaway release/* PR → main, tag the merge commit, bump develop back to -dev, back-merge main → develop. Encodes the gotchas (never PR develop→main directly; resolve the merge-base CHANGELOG/version conflict; back-merge to stop it recurring). Use when the user says "cut a release", "release vX.Y.Z", "bump version", "tag a release", "deploy to main", or "ship develop to main". Asks before every git commit / push / PR / tag.
---

# release skill

You are running the **release runbook** for this test-suite repo. The authoritative process
is [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) → "Releasing"; this skill is the **executable
sequence** plus the gotchas learned in practice. Read CONTRIBUTING's Releasing section once before
starting — if it and this skill ever disagree, CONTRIBUTING wins and this file should be updated.

## Hard rules (do not skip)

- **Ask before every `git commit`, `git push`, PR create, and `git tag`/tag-push.** One action,
  one confirmation. Never chain them silently. (Global user rule.)
- **Merge method is a merge commit** — squash & rebase are disabled at the repo level; merged
  branches auto-delete. Do not try to squash.
- **Never open the release PR directly from `develop`.** Auto-delete-on-merge would delete
  `develop`. Always push a throwaway `release/vX.Y.Z` head.
- **Never weaken the version rules to fit.** SemVer 0.x for this suite:
  - **MINOR** (`0.X.0`) = a new service/feature suite **or** a major capability.
  - **PATCH** (`0.0.X`) = coverage gap-fills, reconciles, CI/tooling, dependency bumps.
  - `0.4.0` is **reserved** for the next service-suite milestone — do not consume it for a patch.
  - `version` lives in `package.json`; each CHANGELOG entry notes the **OpenAPI contract version**
    it targets (a separate axis).

## Phase 0 — Decide the version (ask the user)

1. Summarize what's on `develop` ahead of `main`:
   `git fetch origin -q && git log --oneline origin/main..origin/develop`.
2. Classify: new service / major capability → **MINOR**; reconcile / gap-fill / tooling → **PATCH**.
3. **Ask the user to confirm the exact version** (e.g. 0.3.3 vs 0.4.0) and which **OpenAPI contract**
   it targets. Do not pick for them when it's a close call — surface the trade-off (esp. the reserved
   `0.4.0`).

## Phase 1 — Prep PR on `develop`

A normal PR that bumps the version and writes the CHANGELOG section.

```bash
git checkout develop && git pull origin develop
git checkout -b chore/release-prep-vX.Y.Z
```

- `package.json`: `version` → `X.Y.Z` (drop the `-dev` suffix).
- `CHANGELOG.md`: convert `## [Unreleased] — X.Y.Z-dev` into
  `## [X.Y.Z] - <YYYY-MM-DD> — targets OpenAPI <contract>` with grouped **Added / Changed / Fixed**.
  (Use the real current date — pass it in; do not guess.) Do NOT add a fresh `[Unreleased]` yet
  (that happens in Phase 4).
- Verify: `pnpm exec prettier --check package.json CHANGELOG.md`.
- Commit `chore(release): prep vX.Y.Z (targets OpenAPI <contract>)`, push, open PR **→ develop**.
- Wait for the user to merge.

## Phase 2 — Release PR → `main`

Cut a **throwaway** `release/*` head from develop's tip (NOT develop itself).

```bash
git checkout develop && git pull origin develop      # now at X.Y.Z
git push origin develop:refs/heads/release/vX.Y.Z
gh pr create --base main --head release/vX.Y.Z --title "Release vX.Y.Z"
```

### Gotcha: the merge-base CHANGELOG/`package.json` conflict

If `main` and `develop` diverged before the previous release tag (squash-era history, or no prior
back-merge), GitHub reports a conflict in `package.json` + `CHANGELOG.md`. Resolve locally on the
release branch and push — do not edit on GitHub:

```bash
git checkout release/vX.Y.Z && git pull origin release/vX.Y.Z
git merge origin/main --no-edit            # surfaces the conflict
# package.json  → keep the RELEASE version: git checkout --ours package.json
# CHANGELOG.md  → keep the RELEASE side (it's the superset: [X.Y.Z] then the older sections);
#                 delete the duplicate older-version header the main side re-added + all markers.
git add package.json CHANGELOG.md
grep -rn '^<<<<<<<\|^=======\|^>>>>>>>' package.json CHANGELOG.md   # must be empty
pnpm exec prettier --check package.json CHANGELOG.md
git commit --no-edit
git push origin release/vX.Y.Z             # PR becomes MERGEABLE
```

Wait for the PR gate (lint / type-check / `check:consistency` / format) to go green, then the user merges.

## Phase 3 — Tag `main`

```bash
git checkout main && git pull origin main          # confirm version === X.Y.Z + merge landed
git tag -a vX.Y.Z -m "vX.Y.Z — <one-line summary> (targets OpenAPI <contract>)"
git push origin vX.Y.Z
```

## Phase 4 — Bump `develop` back to `-dev` (+ back-merge)

Restores the in-progress line AND fast-forwards develop to main's tip so the **next** release's
merge-base is current and won't re-hit the Phase 2 conflict.

```bash
git checkout develop && git pull origin develop
git checkout -b chore/post-release-vX.Y.Z-bump-develop
git merge origin/main --no-edit                    # usually a clean fast-forward
```

- `package.json`: `version` → next `-dev` (e.g. `0.4.0-dev` — the reserved milestone, or `X.Y.(Z+1)-dev`).
- `CHANGELOG.md`: re-open `## [Unreleased] — <next>-dev` above `[X.Y.Z]`, noting it's ahead of the
  released `main` (`vX.Y.Z`).
- Commit `chore(release): bump develop to <next>-dev after vX.Y.Z`, push, open PR **→ develop**, merge.

## Done — verify

- `git tag -l vX.Y.Z` exists on `main`; `main` `package.json` === `X.Y.Z`.
- `develop` `package.json` === `<next>-dev` with a fresh `[Unreleased]`.
- Throwaway `release/*` + feature/prep branches auto-deleted on merge (remove local leftovers with
  `git branch -D`).

## Notes

- This suite has **no deploy artifact** — a "release" is the version tag on `main`. The work needs
  human decisions (version classification, PR approvals), so a **skill runbook** fits better than a
  fully-automated GitHub Actions workflow.
- The CHANGELOG also tracks **OpenAPI contract drift**: if a newer `docs/openapi/openapi(x.y.z).yaml`
  exists but tests aren't reconciled to it yet, the release targets the **reconciled** contract and
  the newer spec is left untracked / called out as a follow-up — never claim to target a contract the
  tests don't cover.
