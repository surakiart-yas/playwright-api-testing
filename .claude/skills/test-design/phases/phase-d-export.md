---
phase: D
artifact: 10-export-*.md
gate: none (optional, on request only)
parent_skill: test-design
---

# Phase D — Export (optional, on request)

If the user asks to export, offer formats:

- **Clipboard markdown** (`10-export-clipboard.md`): tables ready to paste into Jira / Confluence
- **MDX `<TestCase>` blocks** (`10-export-mdx.md`): only if the spec is generalized and they want to promote to site content
- **Plain checklist** (`10-export-checklist.md`): for quick share
- **TMS-row CSV** (`10-export-tms.csv`): if the user wants 1-row-per-TC export for TestRail / Xray / Zephyr — split `Both`-layer TCs into 2 rows (one UI, one API) so each row maps to a single execution unit

Do not modify earlier-phase artifacts when exporting.
