---
mode: batch
parent_skill: test-case
input: 4+ TCs (table, file, or repeated paste)
output: summary table + on-demand detail
---

# Batch review mode

User wants to audit many TCs at once (typical: full feature TC catalog from `07-test-cases.md` or a Sheet paste). Skill produces a summary first; detail per row is on-demand.

For ≤3 TCs use `review` mode (loop per TC).

## Inputs the skill needs

| Field                  | Required | Notes                                                            |
| ---------------------- | -------- | ---------------------------------------------------------------- |
| TC list                | Yes      | markdown table, file path, CSV paste, or repeated TC blocks      |
| Feature folder context | Optional | improves trace check (C12) by Reading `_state.json` if available |
| Save location          | Optional | default stdout; ask if user wants `tc-review-<DATE>.md` saved    |

## Workflow

1. **Parse input** — detect format (markdown table / file / CSV / blocks). Count rows. If <4 rows, switch to `review` mode.
2. **Resolve target mode per row** — apply resolution order; mark rows where mode was inferred (not explicit).
3. **Read rule files** — core.md + manual.md + automation.md + cross-tc.md (you don't know which rows need which until parsed; cross-tc applies to the whole set)
4. **Run checks per row** — build a verdict object per TC: `{tc_id, target_mode, status, failed_rules, warning_rules, pass_count}`
5. **Cross-TC pass** — now that the whole set is parsed, run X1-X4 from cross-tc.md across all rows: duplicate conditions to merge (X1), over-split positives to collapse (X2), lopsided boundaries or uncovered partitions to add (X3), dishonest feasibility tags to retag (X4). These are set-level findings (merge / collapse / add / retag), not per-row pass/fail — surface them as their own block. This pass is where catalog bloat and coverage holes show up; the per-row checks cannot see them.
6. **Output summary** — see format below; show counts, top issues, failed row IDs, and the cross-TC findings
7. **Offer next step** — detail row(s), apply fixes, save report, or close

## Summary output format

```markdown
## Batch review summary — 47 TCs from `07-test-cases.md`

| Verdict    | Count | %   |
| ---------- | ----- | --- |
| ✅ Pass    | 31    | 66% |
| ⚠️ Warning | 11    | 23% |
| ❌ Fail    | 5     | 11% |

### Target mode distribution

| Target     | Count |
| ---------- | ----- |
| automation | 38    |
| manual     | 7     |
| both       | 2     |

### Top issues (rule-level frequency)

| Rule                 | Failures | Warnings | Note                               |
| -------------------- | -------- | -------- | ---------------------------------- |
| C6 Expected specific | 8        | 2        | vague "success" / "works" / "ผ่าน" |
| A1 Stable selector   | 4        | 1        | text-locator on i18n strings       |
| C1 Title format      | 3        | 1        | missing → / Subject                |
| C9 Tags ครบ          | 2        | 3        | missing suite or automation hint   |
| M1 Human-readable    | 1        | 0        | code-ish steps in manual-only TC   |

### Failed rows

| TC-ID  | Failed rules | One-line fix hint                                                |
| ------ | ------------ | ---------------------------------------------------------------- |
| TC-007 | C1, C6       | retitle + replace "success" with HTTP 201 + JSON path assertions |
| TC-012 | C6, A1       | name observable + use [data-testid] instead of text              |
| TC-022 | C9           | add suite tag (e.g. "regression")                                |
| TC-029 | C1, C6, A1   | major rewrite recommended (3 fails)                              |
| TC-041 | A3, A6       | replace shared account with factory, add explicit Preconditions  |

### Warning rows (selected)

(11 rows; expand on request)

### Cross-TC findings (set-level — merge / collapse / add / retag)

| ID  | Finding                                              | Action                |
| --- | ---------------------------------------------------- | --------------------- |
| X1  | TC-008 ≡ TC-012 (same input + expected)              | merge, multi-FB trace |
| X2  | TC-015 / TC-021 / TC-025 all "valid → 200"           | collapse to TC-015    |
| X3  | length 7 + 129 rejected, but 8 + 128 accept untested | add 8 + 128 positives |
| X4  | TC-010 `automate-now` but needs a real 7-day wait    | retag `manual-only`   |

Omit this block when the set is clean. Unlike the per-row table, these read as actions on
the catalog (merge/collapse/add/retag), not pass/fail — they often change the TC count.

### Next step

ต้องการ:
[a] ดู detail row ไหน (พิมพ์ TC-ID)
[b] apply fixes ทั้งหมด — skill จะ rewrite ทุก row ที่ fail + warning
[c] save detailed report ที่ `.test-design-scratch/<feature>/tc-review-<YYYY-MM-DD>.md`
[d] ปิด
```

## Detail-on-demand format

When user picks a row to inspect, emit the same `review` mode verdict block (see `modes/review.md`) for that single TC.

## Apply-fixes-all behavior

When user picks `[b] apply fixes`:

1. Confirm: "จะ rewrite N row, output เป็น markdown ใหม่ทั้งตาราง ok มั้ย?"
2. Read all rules, revise each failed/warning row in memory
3. Emit a new table with revised rows; mark changed cells with `[updated]`
4. Show change log per row at the end:
   ```
   Changes log:
   - TC-007: C1 title rewritten, C6 expected specified
   - TC-012: C6 expected specified, A1 selectors → data-testid
   - ...
   ```
5. If user provided original file path, ask: "เขียนทับไฟล์เดิมเลยมั้ย หรือ save เป็น file ใหม่?"

## Save report behavior

When user picks `[c]`:

1. Default path: `.test-design-scratch/<feature>/tc-review-<YYYY-MM-DD>.md`
2. If feature folder not detected, ask
3. Write the summary + detail of all failed + warning rows
4. Confirm path on success

## Parsing tolerance

Batch mode must tolerate messy input formats:

- Markdown table with extra/missing columns → fill `?` for missing, ignore unknown
- CSV / TSV from Sheet → detect by tab-separated header; map common column names (`TC ID` → `tc_id`, `Test Case` → `title`, etc.)
- Repeated TC blocks (per-FB style with H3 headers) → split on H3
- Mixed format → process what's parseable; report unparseable rows separately

## Heuristics for ambiguous rows

- Row missing target mode signal entirely → default automation + note in report
- Row with conflicting signals (e.g., Tags=manual-only but Steps look code-ish) → flag as `⚠️ Warning: mode mismatch` + ask user to pick
- Row with `Layer = Both` but only one block populated → automatic C11 fail

## Output limits

If TC count > 100, suggest:

- Split by feature / sub-feature group + batch each separately
- Or focus on `❌ Fail` rows only in first pass

Skill should not emit a 2000-line wall; cap detail to ≤30 rows; for the rest emit IDs + counts only.

## Edge case: 0 fails

If all rows pass cleanly, emit a short celebratory summary:

```
## Batch review summary — 47 TCs ✅ all passing

(checks: C1-C12 + applicable M/A per row)

ไม่มี issue ที่ flag TC catalog พร้อมใช้ ลองพิจารณา bonus checks ใน test-design Phase C สำหรับ feature-level audit
```
