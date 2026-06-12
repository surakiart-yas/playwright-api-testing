---
mode: write
parent_skill: test-case
default_target: automation
---

# Write mode

User provides a scenario or short context; skill drafts a TC that passes all applicable checks before output.

## Inputs the skill needs (ask back if missing)

| Field                                        | Default if missing                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Scenario description                         | Required, ask back                                                                                      |
| Layer (UI / API / Both)                      | Ask; default API if target = automation, UI if target = manual                                          |
| Target mode (automation / manual / both)     | **automation** (skill default)                                                                          |
| Subject (feature / module name)              | Inferred from scenario; confirm if ambiguous                                                            |
| Technique (EP / BVA / Decision Table / etc.) | Optional, inferred if obvious                                                                           |
| Priority                                     | Default `high` (write workflow assumes the user is asking because the case matters); user can downgrade |
| FB-ID / REQ-ID                               | Optional, mark `N/A` if not provided + add Note "trace not set; link to FB or REQ before commit"        |
| Workspace folder                             | Optional; default stdout-only                                                                           |

## Workflow

1. **Parse user input** — extract scenario, infer subject + technique + priority
2. **Confirm target mode** — state default (automation) explicitly; ask Layer if not given
3. **Read rule files** — `rules/core.md` always; plus `rules/automation.md` (target = automation) and/or `rules/manual.md` (target = manual). For `both`, read all three.
4. **Draft TC** — fill the template (see below) with the inferred fields
5. **Self-audit** — run all applicable checks (C1-C12 + M or A). If any fails, revise inline before output.
6. **Output** — print the TC + a one-line audit summary ("✅ Checks passed: C1-C12, A1-A6")
7. **Offer follow-up** — "ต้องการ TC คู่ negative / boundary / state transition ต่อมั้ย?" If the technique implies multiple TCs (EP partitions, BVA boundaries, decision table rules), enumerate and offer to draft them all.

## Draft template

```markdown
### TC-XXX — [Subject]: [scenario] → [expected]

- **FB-ID:** FB-XXX (or N/A)
- **REQ-ID:** REQ-XXX (or N/A)
- **Layer:** UI / API / Both
- **Operation:** create / read / update / delete / cross-cut / <step-name>
- **Technique:** EP / BVA / Decision Table / State Transition / Use Case / Error Guessing
- **Priority:** critical / high / medium / low
- **Tags:** <suite>, <strategic>, <automation hint>

**Preconditions:**

- ...

**Test data:**

- key = value

**Steps (UI):** (omit block when Layer = API only)

1. ...

**Steps (API):** (omit block when Layer = UI only)

1. ...

**Expected (UI):**

- ...

**Expected (API):**

- ...

**Cleanup / Teardown:** (when target = automation OR side effects exist)

- ...

**Notes:** (optional — gotchas, alternate scenarios)
```

For `Layer = UI` only or `API` only, drop the layer suffix and use plain `Steps:` / `Expected:`.

## Mode-aware variants

### Target = automation (default)

- Steps phrased as code-translatable instructions: "POST /endpoint body {...}", "fill [data-testid=...] with ...", "click [role=button name=Submit]"
- Expected phrased as assertable observables: HTTP status, JSON paths, element visibility states, store values
- Preconditions enumerate factory / fixture calls
- Cleanup / teardown listed unless using auto-teardown fixture
- Self-audit runs C1-C12 + A1-A6

### Target = manual

- Steps phrased in UI language: "เปิดแอป", "แตะปุ่ม X", "กรอก ... ในช่อง Y"
- Expected phrased as observables a human can see / hear / measure: "toast สีแดง ปรากฏ", "redirect ภายใน 2 วินาที"
- Preconditions describe state in plain language: "user ACTIVE login แล้ว"
- Waits use approximate durations or visual signals
- Cleanup explicit if test creates side effects
- Self-audit runs C1-C12 + M1-M4

### Target = both

- Layer = Both
- Produce 4 blocks: `Steps (UI)` + `Steps (API)` + `Expected (UI)` + `Expected (API)`
- Manual rules apply to UI block, automation rules apply to API block (or whichever the user designates)
- Self-audit runs C1-C12 + M (against UI block) + A (against API block)

## Multi-TC enumeration

When a single scenario implies multiple TCs (typical for EP / BVA / state transitions), draft one fully and stub the rest:

```
TC-001 (drafted in detail)
TC-002 — Subject: scenario variant 2 → expected (stub: same shape as TC-001, change input X to Y, expect Z)
TC-003 — ...

ต้องการให้ draft TC-002, TC-003 เต็มเลยมั้ย?
```

This avoids overwhelming the output while signaling that more TCs exist.

## Example interactions

### Example 1 — Automation default

```
User: /test-case ช่วยเขียน TC: ใส่ PIN ผิด 3 ครั้งใน 15 นาที → account TEMP_LOCKED

Skill:
  Target mode: automation (default)
  Layer ที่ทดสอบ: API หรือ UI? (default API สำหรับ automation)

User: API

Skill: [reads core.md + automation.md, drafts]

  ### TC-XXX — Login: PIN ผิด 3 ครั้งใน 15 นาที → account TEMP_LOCKED

  - **FB-ID:** N/A (set before commit)
  - **REQ-ID:** N/A
  - **Layer:** API
  - **Operation:** create (auth attempt) / cross-cut
  - **Technique:** State Transition
  - **Priority:** high
  - **Tags:** regression, negative, security, automate-now

  **Preconditions:**
  - user = factory.user.create({ status: 'ACTIVE', phone: '0812345678', pin_set: true })
  - mockClock = clockManager.freeze("2026-05-21 10:00:00")

  **Test data:**
  - phone = "0812345678"
  - wrongPin = "000000"

  **Steps (API):**
  1. POST /auth/login body {phone, pin: wrongPin} → expect HTTP 401
  2. POST /auth/login body {phone, pin: wrongPin} → expect HTTP 401
  3. POST /auth/login body {phone, pin: wrongPin} → expect HTTP 401
  4. GET /users/me/status (admin token) → check returned status

  **Expected (API):**
  - step 3 response: HTTP 401, body.error_code = "INVALID_PIN", body.attempts_remaining = 0
  - step 4 response: HTTP 200, body.status = "TEMP_LOCKED"
  - body.locked_until = "2026-05-21 10:30:00" (30 min after first lock)

  **Cleanup:**
  - factory.user.cleanup(user)
  - mockClock.restore()

  ✅ Checks passed: C1-C12, A1-A6

  ต้องการ TC คู่ negative ต่อมั้ย เช่น
  - PIN ผิด 2 ครั้งใน 15 นาที → ยังไม่ lock (boundary below)
  - PIN ผิด 1 ครั้ง แล้วถูก 1 ครั้ง → counter reset?
  - PIN ผิด 3 ครั้งเกิน 15 นาที → rolling window
```

### Example 2 — Manual override

```
User: /test-case ขอ TC manual สำหรับ login PIN ผิด

Skill: Target mode: manual (ตามที่ระบุ) Layer: UI (default สำหรับ manual)
       [reads core.md + manual.md, drafts]

  ### TC-XXX — Login: PIN ผิดติดกัน 3 ครั้ง → account ถูกล็อก 30 นาที

  - **FB-ID:** N/A
  - **REQ-ID:** N/A
  - **Layer:** UI
  - **Operation:** cross-cut (security)
  - **Technique:** State Transition
  - **Priority:** high
  - **Tags:** regression, negative, security, manual-only

  **Preconditions:**
  - user สถานะ ACTIVE, มี PIN ตั้งแล้ว
  - device ที่ login ปกติได้ (ไม่ใช่ device ใหม่)

  **Test data:**
  - phone = "0812345678"
  - PIN ที่ถูก = "123456" (ไม่ใช้)
  - PIN ผิด = "000000"

  **Steps:**
  1. เปิดแอป TestPay
  2. แตะ "เข้าสู่ระบบ"
  3. กรอก phone "0812345678" แตะ "ถัดไป"
  4. กรอก PIN "000000" แตะ "ยืนยัน"
  5. รอ toast / dialog แสดง error (~ 1-2 วินาที)
  6. ทำซ้ำ step 4-5 อีก 2 ครั้ง (รวม 3 ครั้งติดกัน)
  7. ลองกรอก PIN ที่ถูก "123456" แตะ "ยืนยัน"

  **Expected:**
  - step 5 ครั้งที่ 1: toast "รหัสผิด เหลืออีก 2 ครั้ง"
  - step 5 ครั้งที่ 2: toast "รหัสผิด เหลืออีก 1 ครั้ง"
  - step 5 ครั้งที่ 3: dialog "บัญชีถูกล็อกชั่วคราว ลองอีกครั้งใน 30 นาที"
  - step 7: dialog เดิม แสดงอีกครั้ง, ไม่เข้าระบบ

  **Cleanup:**
  - admin panel: reset user "0812345678" → ACTIVE (หรือรอ 30 นาที)

  ✅ Checks passed: C1-C12, M1-M4
```

## Refuse to write

- TC ที่ require test code output (`.spec.ts` file) → "skill ไม่ผลิต test code ผลิต TC markdown เท่านั้น"
- TC ที่ user paste real-system content → ขอ generalize ก่อน (privacy rule)
- TC สำหรับ feature ทั้งชุด (≥10 TCs) → redirect ไป `/test-design` (workflow ที่เหมาะกว่า)
