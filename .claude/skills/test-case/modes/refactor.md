---
mode: refactor
parent_skill: test-case
input: 1 existing TC + target mode to rewrite to
output: revised TC + diff + rationale per change
---

# Refactor mode

User has an existing TC and wants it rewritten — usually to a different target mode (manual → automation, or vice versa) or to bring it up to pattern after style drift.

For multi-TC rewrite, run batch mode with "apply fixes all" instead.

## Inputs the skill needs

| Field           | Required            | Notes                                                                                     |
| --------------- | ------------------- | ----------------------------------------------------------------------------------------- |
| Original TC     | Yes                 | markdown, table row, or prose                                                             |
| Target mode     | Asked if not stated | usually the **destination** mode (e.g., "refactor ไป automation")                         |
| Layer change    | Inferred or asked   | refactor manual UI → automation usually changes Layer to API or Both                      |
| Preserve fields | Asked if ambiguous  | "Title คงเดิมมั้ย?" — sometimes the original Title is fine and only Steps/Expected change |

## Workflow

1. **Parse original TC** — extract all fields. Note current target mode (resolved from Tags / Steps style).
2. **Confirm target mode + Layer** — if user said "ไป automation" but Layer was UI, ask whether new Layer should be API, UI (still automated), or Both.
3. **Read rule files** — core.md + rules for target mode
4. **Run pre-audit on original** — note which rules originally failed; refactor will fix those + adapt to new mode
5. **Rewrite TC** — apply target-mode rule transformations
6. **Self-audit revised TC** — must pass all applicable checks. Iterate inline if not.
7. **Emit diff + rationale** — see format below
8. **Offer apply** — "apply ลงไฟล์เดิมมั้ย / output เป็น TC ใหม่ / ปิด"

## Diff output format

```markdown
## TC-XXX refactor: manual → automation

### Original (target mode: manual, Layer: UI)

(original TC block, unchanged for reference)

### Revised (target mode: automation, Layer: API)

(new TC block)

### Diff

| Field         | Before                                                      | After                                                                                    | Rationale                                                  |
| ------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Layer         | UI                                                          | API                                                                                      | refactor target = automation; API is cheapest stable layer |
| Tags          | regression, manual-only                                     | regression, negative, automate-now                                                       | swap automation hint, add strategic tag                    |
| Preconditions | "user สถานะ ACTIVE login แล้ว"                              | "user = factory.user.create({status:'ACTIVE'}); mockClock.freeze()"                      | A3 factory isolated, A5 explicit setup                     |
| Test data     | "phone ที่ valid"                                           | `phone = "0812345678"`                                                                   | C8 exact values                                            |
| Steps         | "1. เปิดแอป<br>2. กรอกเบอร์<br>3. แตะปุ่ม OTP<br>4. รอ SMS" | "1. POST /auth/otp/request body {phone}<br>2. capture otp = testProvider.lastOtp(phone)" | A1 selector, A2 condition wait, atomic                     |
| Expected      | "toast 'OTP ส่งแล้ว' ปรากฏ"                                 | "HTTP 200, body.expires_in = 180"                                                        | A4 atomic, contract-level not UI text                      |
| Cleanup       | (missing)                                                   | "factory.user.cleanup(user); mockClock.restore()"                                        | A5 teardown explicit                                       |

### Audit

- Before: ❌ C8, ⚠️ A1/A2/A3/A5 (because Tags = manual-only it was ok, but moving to automation flips these to Fail)
- After: ✅ C1-C12, A1-A6

### Next step

[a] apply revised TC ลงไฟล์เดิม (ระบุ path)
[b] output revised TC เป็น TC ใหม่ที่ stdout (TC-XXX-auto)
[c] ปิด
```

## Common refactor directions

### Manual → Automation

Most common direction. Typical changes:

- Layer: UI → API (preferred) or keep UI but switch from human-readable to selector-based
- Tags: `manual-only` → `automate-now`
- Steps: prose → code-translatable instructions
- Expected: UI text observable → contract-level assertions (HTTP status, JSON paths)
- Preconditions: shared account → factory + fixture
- Add Cleanup / Teardown

**Title:** usually stays the same. The 3-part pattern works for both modes.

### Automation → Manual

Less common but happens (e.g., test moved out of CI because too flaky, kept as manual regression):

- Layer: API → UI (usually)
- Tags: `automate-now` → `manual-only`
- Steps: API calls → UI actions a human performs
- Expected: contract assertions → observable UI states
- Add: visual signals for waits, cleanup notes for stateful changes
- Drop: factory setup details (use shared test accounts if approved)

### Both layer split

Sometimes user wants to split a `Both` TC into two: one UI manual + one API automation. Treat as 2 refactors.

### Style drift (same mode)

TC is already automation but doesn't match current pattern (e.g., older style without `data-testid`, no factory). Refactor stays in automation mode but updates Steps + Preconditions to current pattern.

## Edge cases

### Title would need to change

If the original Title is vague ("ทดสอบ login"), refactor MUST also fix the title. Show before/after in the diff with rationale referencing C1.

### Same-mode refactor (no mode change)

User says "refactor TC-014" without specifying direction. Skill resolves current mode and asks: "TC นี้ปัจจุบัน mode = X จะ refactor ภายใน mode เดิม (ปรับ pattern) หรือเปลี่ยน mode?"

### Refactor would split into multiple TCs

If the original TC fails C3 (Atomic) because it lumps 3 conditions, refactor must split it. Output emits 3 revised TCs + a note "Original 1 TC split into 3 TCs because each fails independently (C3)".

### Apply to file

If user picks `[a] apply` and provides a file path:

1. Read the file
2. Locate the TC by ID or original Title (ask if ambiguous)
3. Replace the block
4. Write file
5. Confirm: "TC-XXX updated in [path]"

If no path provided, output revised TC to stdout + suggest where it might go (e.g., `.test-design-scratch/<feature>/07-test-cases.md`).

## Rationale discipline

Every diff row must cite the rule ID that motivated the change. This is how the user learns the rules — not just "I changed this" but "I changed this because A1 requires stable selectors".

Avoid generic rationales like "better pattern" or "improved". Always: `<Rule ID> <short why>`.

## Refuse to refactor

- Refactor to test code (`.spec.ts`) → skill stays in markdown
- Real-system content + no generalize consent → privacy rule
- "Refactor everything" with no clear target → ask for direction, or redirect to `batch` apply-fixes mode
