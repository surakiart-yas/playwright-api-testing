## Summary

<!-- 1–3 sentences: what changed and why. Link the issue / requirement if applicable. -->

## Type of change

<!-- Check one. If multiple, split into separate PRs. -->

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `test` — adding / updating tests
- [ ] `refactor` — internal change, no behaviour difference
- [ ] `docs` — documentation only
- [ ] `chore` — tooling / deps / config

## Checklist

- [ ] Tests added or updated (and pass locally — `pnpm verify`)
- [ ] Affected docs updated:
  - [ ] `docs/decisions.md` if a new convention was introduced
  - [ ] `.claude/rules/*.md` if a rule changed
  - [ ] `README.md` / `CONTRIBUTING.md` if onboarding flow changed
- [ ] No new `// TODO` / `// FIXME` left behind
- [ ] No hardcoded test data — `autotestSlug()` used for any resource names
- [ ] If new endpoint or service: `types → schemas → Client → Validator → spec` order followed

## Test plan

<!-- How was this verified? Paste commands / screenshots / report links. -->

```
pnpm verify
```

## Notes for reviewer

<!-- Optional: areas of uncertainty, decisions made, follow-ups. -->
