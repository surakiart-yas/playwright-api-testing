---
mode: review
parent_skill: test-case
input: 1-3 TCs
output: per-TC verdict + fix suggestions
---

# Review mode

User pastes 1-3 TCs (markdown or prose). Skill audits each against applicable rules and produces verdicts.

For ≥4 TCs, use `batch` mode instead.

## Inputs the skill needs

| Field             | Required               | Notes                                                |
| ----------------- | ---------------------- | ---------------------------------------------------- |
| TC content        | Yes                    | markdown, table row, or prose                        |
| Target mode       | Resolved automatically | from Tags, then Steps style, then default automation |
| Apply-fix consent | Asked after verdict    | "ต้องการให้ apply fix ลงให้เลยมั้ย?"                 |

## Workflow

1. **Parse input** — extract TC fields (Title, FB, REQ, Layer, Tags, Preconditions, Steps, Expected, Test data, Cleanup, Notes). Tolerate missing fields; record what's missing.
2. **Resolve target mode** — apply the order from SKILL.md: explicit → tags → steps style → default automation
3. **Read rule files** — core.md always; manual.md / automation.md based on target
4. **Run checks** — apply all rules, classify each as ✅ Pass / ⚠️ Warning / ❌ Fail / N/A
5. **Output verdict** — see format below
6. **Offer fixes** — for each Fail/Warning, suggest a concrete fix in 1-2 lines
7. **Ask** — "apply fixes ทั้งหมด rewrite ให้เลย / ดู fix ที่ละ rule / ปิด"

## Verdict format

```markdown
## TC-XXX review verdict

- **Target mode (resolved):** automation (from Tags: automate-now)
- **Overall:** ❌ Fail (3 issues) | ⚠️ Warning (2 issues) | ✅ Pass

| Rule                     | Status     | Detail                                                           |
| ------------------------ | ---------- | ---------------------------------------------------------------- |
| C1 Title format          | ❌ Fail    | "ทดสอบ login PIN" ไม่ match `[Subject]: [scenario] → [expected]` |
| C2 Title = failure msg   | ❌ Fail    | ตามมาจาก C1                                                      |
| C3 Atomic                | ✅ Pass    | -                                                                |
| C4 Steps numbered        | ⚠️ Warning | ใช้ bullets เปลี่ยนเป็นเลขลำดับจะชัดกว่า                         |
| C5 No assertion in Steps | ✅ Pass    | -                                                                |
| C6 Expected specific     | ❌ Fail    | "error" คลุมเครือ                                                |
| C7 Preconditions clear   | ⚠️ Warning | ไม่ระบุ user state ก่อน test                                     |
| C8 Test data exact       | ✅ Pass    | -                                                                |
| C9 Tags ครบ              | ❌ Fail    | ขาด suite tag                                                    |
| C10 Layer ระบุ           | ✅ Pass    | API                                                              |
| C11 Both → 4 blocks      | N/A        | Layer = API only                                                 |
| C12 Traceability         | ✅ Pass    | FB-008                                                           |
| A1 Stable selector       | N/A        | Layer = API                                                      |
| A2 Wait condition        | ✅ Pass    | -                                                                |
| A3 Factory isolated      | ❌ Fail    | ใช้ shared "qa-test-01" account                                  |
| A4 Atomic assertion      | ✅ Pass    | -                                                                |
| A5 Setup/teardown        | ⚠️ Warning | Preconditions ระบุแต่ teardown ขาด                               |
| A6 No env assumption     | ✅ Pass    | -                                                                |

## Fix suggestions

1. **C1 Title** — เปลี่ยน "ทดสอบ login PIN" → "Login: PIN ผิด 3 ครั้งใน 15 นาที → account TEMP_LOCKED"
2. **C6 Expected** — แทน "error" → "HTTP 401, body.error_code = 'INVALID_PIN'"
3. **C9 Tags** — เพิ่ม "regression" (suite) → tags = "regression, negative, automate-now"
4. **A3 Factory** — แทน "qa-test-01" → "factory.user.create({status: 'ACTIVE', pin_set: true})"

(warnings) — ⚠️ C4, ⚠️ C7, ⚠️ A5: optional improvements; ดูรายละเอียดด้านบน

ต้องการให้:
[a] apply fix ทั้งหมด rewrite ให้เลย
[b] ดู fix ทีละ rule (เลือก rule ID)
[c] ปิด review จบที่นี่
```

## Severity classification

- **❌ Fail** — rule violated; output is incorrect or misleading. Always show fix.
- **⚠️ Warning** — rule technically met but with smell; might cause confusion or maintenance pain. Show fix as suggestion.
- **✅ Pass** — rule satisfied. No action needed.
- **N/A** — rule does not apply to this TC (e.g., A1 selector on API-only test). Show with one-line rationale.

When in doubt between Warning and Pass, prefer Pass. When in doubt between Fail and Warning, prefer Warning. Skill should not nitpick.

## Concise mode (when input is 1 TC + obvious clean pass)

If all checks pass on first parse, skip the table; emit:

```
## TC-XXX review verdict

- Target mode (resolved): automation
- Overall: ✅ Pass — all 18 applicable checks (C1-C12, A1-A6, M N/A)

ไม่มี fix แนะนำ TC พร้อมใช้
```

## Fixing modes

### Option a — Apply all fixes (full rewrite)

Skill outputs the full revised TC inline, with a one-line summary at the top:

```
## TC-XXX revised

(Changes: C1 title, C6 expected, C9 tags added, A3 factory replaced shared account)

[revised TC content here]

✅ Checks now passing: C1-C12, A1-A6
```

### Option b — Per-rule fix

User picks a rule ID (e.g., "ขอ fix C1") → skill shows only that rule's revised content (typically a one-field change).

### Option c — Skip

Skill records the verdict but does not rewrite. Useful when the user wants to fix manually.

## Edge cases

### Input is prose, not markdown TC

If the user describes the TC in prose ("เคสนี้คือ login PIN ผิดสามครั้งแล้ว lock"), treat as `write` mode instead, with the prose as scenario.

### Input has unparseable structure

If TC fields cannot be confidently identified, ask back: "TC structure ไม่ชัด ระบุ Title / Steps / Expected ตรงไหนได้มั้ย?"

### Input references a file path

User says "review TC-014 ใน 07-test-cases.md" → Read the file, extract the row matching TC-014, then proceed as normal. If row not found, ask.

### Input is multiple TCs

≥4 TCs → switch to `batch` mode automatically + announce: "พบ N TCs ใช้ batch mode แทน"
2-3 TCs → loop review for each; output verdict block per TC; offer batch summary at end.

## Refuse to review

- TCs that include real-system content + user refuses to generalize → privacy rule
- Pasted test code (`.spec.ts`) → "skill review TC ใน markdown form ไม่ review test code"
