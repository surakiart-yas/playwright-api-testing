---
rule_set: core
applies_to: every TC (manual + automation + both)
check_count: 12
parent_skill: test-case
---

# Core rules (C1-C12)

12 mode-agnostic checks. Every TC must pass these regardless of target mode. Skill cites the rule ID in feedback (e.g. "Fail C1") so users can look up rationale.

If a check **does not apply** to a particular TC (e.g., C8 Test data on a TC that takes no inputs), mark `N/A` with one-line rationale rather than silently skipping.

---

## C1 — Title format

**Rule:** Title must match `[Subject]: [scenario] → [expected]` (Thai: `[หัวเรื่อง]: [สถานการณ์] → [ผลที่คาด]`)

- Subject: feature / module / endpoint / page being tested
- Scenario: the specific input or condition
- Expected: the observable outcome

**Pass examples:**

- "Login: session token หมดอายุ → 401 redirect"
- "OTP: 6 digits within 3 min → pass + next step"
- "Banner upload: GIF format → rejected (unsupported)"
- "Signup: Name empty → validation error"

**Fail examples (with fix):**

| ❌ Fail               | ✅ Fix                                            |
| --------------------- | ------------------------------------------------- |
| "ทดสอบ login"         | "Login: ใส่ PIN ถูกต้อง → เข้าหน้า home"          |
| "All 5 fields filled" | "Signup: 5 fields filled → save success"          |
| "Name empty blocked"  | "Signup: Name empty → validation error"           |
| "test OTP timeout"    | "OTP: เกิน 3 นาทีก่อนกรอก → expired + ขอใหม่ได้"  |
| "เทส flow ลืม PIN"    | "Forgot PIN: identity verified → reset link sent" |

**Reference:** xUnit Test Patterns (Meszaros) `Test_<Behavior>_<Condition>_<Expected>` / BDD Given-When-Then. Skill's `:` + `→` is a Thai-friendly variant.

---

## C2 — Title อ่านเป็น failure message ได้

**Rule:** Imagine the title printed next to a red FAIL in a test report. A reader (PM, dev, another QA) must understand what broke without opening Steps.

**Heuristic:** Cover the Steps section, read only the Title — can you guess:

- ระบบส่วนไหนพัง? (Subject)
- อะไรเป็นตัวกระตุ้น? (Scenario)
- อะไรควรเกิดขึ้นแต่ไม่เกิด? (Expected)

ถ้าตอบไม่ได้ทั้ง 3 → fail C2.

**Pass:** "Login: PIN ผิด 3 ครั้งใน 15 นาที → account TEMP_LOCKED + cooldown 30 นาที"
**Fail:** "Test lockout" (รู้แค่ "lockout" ไม่รู้ trigger / outcome)

---

## C3 — Atomic (1 TC = 1 scenario)

**Rule:** One TC verifies one condition. If failure could mean ≥2 different things, split the TC.

**Smell signals:**

- Title มี "and" / "และ" / "+" connecting independent conditions
- Expected มี ≥3 unrelated assertions (UI state + DB state + email sent + log entry)
- Steps spans multiple business operations (signup + login + transfer in one TC)

**Pass:** "Signup: phone format invalid → validation error before submit"
**Fail:** "Signup: phone empty + email empty + name too long → all 3 errors shown"
→ split into 3 TCs

**Exception:** Cross-cutting concerns intentionally verified together (e.g. "after successful signup → user CREATED + welcome email sent + log entry written") OK if the FB explicitly covers cross-cut and Tags include `cross-cut` or similar.

---

## C4 — Steps numbered + 1 action per step

**Rule:** Steps use numbered list (1. 2. 3.), one user-observable action per step.

**Pass:**

```
1. เปิดหน้า /login
2. กรอก phone "0812345678"
3. กรอก PIN ที่ผิด "000000"
4. กดปุ่ม "เข้าสู่ระบบ"
```

**Fail (collapsed):**

```
- กรอก phone และ PIN ที่ผิดแล้วกด login รอ error
```

→ ไม่รู้ว่า fail ตอนกรอก หรือตอนกด หรือตอนรอ

**Fail (bulleted, not numbered):**

```
- เปิดหน้า login
- กรอก credentials
- กด submit
```

→ ใช้ bullet ทำให้ขั้นไม่ชัด ใช้เลขแทน

---

## C5 — Steps ไม่ฝัง assertion

**Rule:** Assertions / expected outcomes go in `Expected`, not in `Steps`. Steps describe **what to do**, Expected describes **what should happen**.

**Pass:**

```
Steps:
  1. กรอก phone "0812345678"
  2. กด submit
Expected:
  - HTTP 201, response.next_step = "otp"
  - redirect ไป /otp
```

**Fail (assertion ใน step):**

```
Steps:
  1. กรอก phone "0812345678" และ verify ว่า input รับ
  2. กด submit แล้วเห็น 201 response และ redirect ไป /otp
```

→ ย้าย verify / เห็น / response เข้า Expected

**Exception:** A "checkpoint" step ใน long flow ที่ต้อง verify ระหว่างทางก่อน proceed ได้ระบุได้ แต่ต้องเขียน explicitly ว่า "verify X" และยังต้องมี Expected ของ final outcome ด้วย

---

## C6 — Expected specific (no vague success)

**Rule:** Expected must name observable facts. Vague words = automatic fail.

**Banned (without further qualification):**

- "ทำงานปกติ" / "work normally"
- "success" / "ok" / "ผ่าน" (โดดๆ)
- "error" / "fail" (โดดๆ)
- "ไม่มีปัญหา"
- "as expected"

**Pass — specific assertions:**

- "HTTP 201, response.id ≠ null, response.status = 'PENDING_OTP'"
- "Toast สีแดง 'รหัสผ่านไม่ตรงกัน' ปรากฏใต้ Confirm Password field"
- "Redirect ไป /login ภายใน 2 วินาที, query string มี ?reason=session_expired"
- "DB row users.status = 'TEMP_LOCKED', locked_until = now() + 30min"

**Fail example fixes:**

| ❌ Vague        | ✅ Specific                                                                           |
| --------------- | ------------------------------------------------------------------------------------- |
| "save success"  | "HTTP 201, response.id != null, response.created_at = current timestamp ±2s"          |
| "error appears" | "Inline error text 'เบอร์ไม่ถูกต้อง' below phone field, submit button stays disabled" |
| "redirect"      | "Navigate to /home within 2s, URL bar shows '/home' (no query)"                       |
| "OTP works"     | "HTTP 200, response.token returned, token decodes to user.id, expires_in = 3600"      |

---

## C7 — Preconditions ระบุชัด

**Rule:** Preconditions describe the system state required before Step 1. Cover:

- **User state** — login? role? account status (ACTIVE / SUSPENDED)?
- **Data state** — what records must exist?
- **Env state** — feature flag on? clock frozen? mock service running?
- **Permission state** — token scope, session validity

**Pass:**

```
Preconditions:
  - User สถานะ ACTIVE, role = "customer"
  - มี wallet balance ≥ 100 บาท
  - Feature flag "transfer_v2" = on
  - Recipient user "0898765432" exists + ACTIVE
```

**Fail:**

```
Preconditions: -
```

หรือ

```
Preconditions: ระบบพร้อมใช้งาน
```

**Acceptable for trivial cases:** "None (open the page directly)" — explicitly stating none is OK; missing the field is not.

---

## C8 — Test data list ค่าจริง

**Rule:** If the TC takes inputs, Test data lists the exact values used. Generic placeholders ("valid data", "any number") = fail.

**Pass:**

```
Test data:
  - phone = "0812345678"
  - pin = "123456"
  - otp = "999000" (from fixture testProvider.fixedOtp)
```

**Fail:**

```
Test data: valid phone and PIN
```

→ ใส่ exact value ที่ใช้

**For parametrized / boundary TCs:** list each variant explicitly or reference a data table.

**For factory-generated data:** call the factory + state the contract:

```
Test data:
  - user = factory.user.create({ status: 'ACTIVE', balance_min: 100 })
  - recipient = factory.user.create({ status: 'ACTIVE' })
```

**N/A:** TCs that take no inputs (e.g., "View dashboard for ACTIVE user" with no form). Mark `Test data: N/A`.

---

## C9 — Tags ครบ (suite + automation hint)

**Rule:** Every TC has ≥1 tag from each axis:

- **Suite** (required): `smoke` / `regression` / `sanity`
- **Automation hint** (required): `automate-now` / `manual-only` / `automate-later`
- **Strategic** (optional but recommended): `critical-path` / `negative` / `boundary` / `security` / `a11y` / `api-contract` / `performance`

**Pass:** `Tags: smoke, regression, critical-path, automate-now`
**Fail (missing suite):** `Tags: automate-now`
**Fail (missing automation hint):** `Tags: smoke, regression, negative`

**Team override:** if the workspace playbook defines a different suite vocabulary, defer to it but still require ≥1 from suite axis + ≥1 from automation hint axis.

---

## C10 — Layer ระบุ

**Rule:** Layer field present + value ∈ `UI` / `API` / `Both`.

**Why:** automation engineer needs this to know where to wire the test. Without Layer, TC handoff is ambiguous.

**Team variant (per playbook FAQ):** teams may extend Layer vocabulary to `unit` / `api-automation` / `ui-e2e-automation` / `manual`. Accept any value as long as the field is present and the team has documented it consistently.

---

## C11 — ถ้า Layer = Both → 4 block ครบ

**Rule:** When Layer = `Both`, the TC must contain all four blocks, none empty:

- `Steps (UI):` ...
- `Steps (API):` ...
- `Expected (UI):` ...
- `Expected (API):` ...

**Fail:**

```
Layer: Both
Steps:
  1. fill form, click submit
Expected: success
```

→ split into UI + API blocks; missing API block is the typical defect

**Why:** Both means the test exercises both layers; if you can only describe one, the TC is actually single-layer (UI or API).

---

## C12 — Traceability (FB-ID and/or REQ-ID)

**Rule:** TC links back to at least one of `FB-ID` (feature breakdown) or `REQ-ID` (requirement). Both is better; neither = fail.

**Pass:**

- `FB-ID: FB-008` + `REQ-ID: REQ-014`
- `FB-ID: FB-008` (REQ-ID can be derived via RTM)
- `REQ-ID: REQ-014` (FB tracking not yet adopted)

**Fail:** No FB or REQ at all.

**Exception:** ad-hoc exploratory TC produced outside any feature spec — Tags must include `exploratory` and a one-line rationale must explain why no trace exists.

---

## Quick reference (cheatsheet)

| ID  | Rule                  | Pass signal                   | Fail signal                           |
| --- | --------------------- | ----------------------------- | ------------------------------------- |
| C1  | Title format          | `[Subj]: [scen] → [exp]`      | "ทดสอบ X" / single word               |
| C2  | Title = failure msg   | reader understands w/o Steps  | needs Steps to understand             |
| C3  | Atomic                | 1 condition, 1 verdict        | "and" / multiple unrelated assertions |
| C4  | Steps numbered        | `1. 2. 3.` 1 action/step      | bullets / collapsed actions           |
| C5  | No assertion in Steps | verify lives in Expected      | "do X and see Y" in Steps             |
| C6  | Expected specific     | named values + observables    | "success" / "works" / "ok"            |
| C7  | Preconditions clear   | user/data/env/permission      | empty / "ระบบพร้อม"                   |
| C8  | Test data exact       | listed values                 | "valid data" / "any input"            |
| C9  | Tags ครบ              | ≥1 suite + ≥1 automation hint | missing one axis                      |
| C10 | Layer ระบุ            | UI/API/Both (or team variant) | empty                                 |
| C11 | Both → 4 blocks       | UI Steps/Exp + API Steps/Exp  | one block missing                     |
| C12 | Traceability          | FB or REQ linked              | both missing                          |
