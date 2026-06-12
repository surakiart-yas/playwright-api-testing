---
rule_set: manual
applies_to: TCs with target mode = manual (Tags include manual-only, or operating mode set to manual)
check_count: 4
parent_skill: test-case
---

# Manual rules (M1-M4)

4 manual-specific checks. Apply **in addition to** Core C1-C12 when target mode = `manual`.

A manual TC is executed by a human reading the steps and reporting pass/fail. The rules ensure the human can actually do it without external context.

---

## M1 — Steps human-readable

**Rule:** Steps describe actions a person performs on the UI / app / device. No code-like syntax.

**Banned in Manual mode:**

- `POST /api/...`, `GET /auth/...`
- `page.click(...)`, `page.fill(...)`, `await locator(...).click()`
- `[data-testid=...]`, `#elementId`, `getByRole(...)`
- SQL queries (`SELECT ... FROM ...`) unless the manual tester is explicitly a DB-tester role + the org allows it

**Pass:**

```
Steps:
  1. เปิดแอป TestPay บนมือถือ (state: หน้า welcome)
  2. แตะปุ่ม "เข้าสู่ระบบ"
  3. กรอกเบอร์ "0812345678" ในช่อง phone
  4. แตะปุ่ม "ส่งรหัส OTP"
  5. รอ SMS เข้ามาภายใน 30 วินาที จด OTP ที่ได้
  6. กลับเข้า app กรอก OTP ที่จดไว้
  7. แตะ "ยืนยัน"
```

**Fail:**

```
Steps:
  1. POST /auth/otp/request body {phone: "0812345678"}
  2. capture otp = response.otp
  3. POST /auth/otp/verify body {phone, otp}
```

→ manual tester ทำ POST ผ่าน Postman ก็ได้ แต่ถ้า intent คือ test ในแอป step ต้องเขียนเป็นภาษา UI

**Edge case:** Manual API testing via Postman / curl IS valid manual testing. In that case M1 allows API syntax IF the TC explicitly marks Layer = API and Tags include `manual-only` + the Steps mention the tool (e.g., "เปิด Postman" / "ใช้ curl").

---

## M2 — Wait condition approx duration

**Rule:** Manual steps that require waiting must give the tester an approximate duration or a visual signal to wait for. Tester cannot inspect network or assert response times exactly; they need a "wait until you see X" or "wait ~N seconds" instruction.

**Pass:**

- "รอ loading spinner หายไป (~ 3-5 วินาที)"
- "รอ SMS เข้ามาภายใน 30 วินาที"
- "รอจน timer ใน UI นับถึง 0 (3 นาที)"
- "รอ toast หายไปเอง (~ 5 วินาที)"

**Fail:**

- "รอ" (ไม่บอกนานเท่าไร / รออะไร)
- "wait for response" (manual tester ไม่เห็น response)
- "until ready" (อะไรเรียก ready?)

**Why:** without duration / signal, the tester might wait 1s and call it broken, or wait 10min and miss a regression.

---

## M3 — Cleanup note (when needed)

**Rule:** If the TC creates side effects that affect later tests (account locked, OTP used, balance changed), Steps must include a cleanup step OR Preconditions of the next TC must restore state.

**Common side effects to flag:**

- Account state changes (TEMP_LOCKED, SUSPENDED, transferred balance)
- OTP / token consumed (subsequent test of same phone fails OTP send)
- Data created (user / transaction record left in DB)
- Lock files / session tokens issued
- Feature flag flipped during test

**Pass:**

```
Steps:
  1-7. (test steps)
Cleanup:
  - logout user
  - reset account state ผ่าน admin panel: user "0812345678" → ACTIVE
  - หรือใช้ test account อื่นสำหรับ TC ถัดไป
```

**Fail:** TC ที่ lock account แล้วไม่ระบุ cleanup ทำให้ TC อื่นที่ใช้ account เดียวกัน fail แบบ silent

**N/A:** read-only TCs (e.g., "View dashboard"), TCs with no persistent side effect. Mark `Cleanup: N/A (read-only)`.

---

## M4 — No privileged tooling

**Rule:** Steps must not require tools a typical manual tester doesn't have access to. If unavoidable, flag clearly.

**Tools typically off-limits to manual QA:**

- Direct DB access (`SELECT * FROM users WHERE ...`)
- Production logs / Splunk / Datadog queries
- Backend admin panel without explicit role
- SSH into server
- Kafka / message queue inspection

**If verification truly needs a privileged tool:**

- State it as a separate "Verification (privileged)" block, not in Steps
- Note who can perform it (e.g., "dev / SRE ทำ verify ขั้นนี้")
- Suggest an alternative observable for the regular tester (UI sign / API response that proxies the DB state)

**Pass:**

```
Expected:
  - UI: บัญชีถูก lock (toast "บัญชีถูกล็อก", ปุ่ม login disabled)
Verification (privileged, optional):
  - DB: SELECT status FROM users WHERE phone='0812345678' → 'TEMP_LOCKED'
  - dev / DBA only
```

**Fail:**

```
Steps:
  5. ใช้ Splunk query level=ERROR แล้ว filter app="testpay" ดู error log
```

→ manual tester เข้า Splunk ไม่ได้ ต้อง redesign

---

## Quick reference (cheatsheet)

| ID  | Rule                   | Pass signal                  | Fail signal                  |
| --- | ---------------------- | ---------------------------- | ---------------------------- |
| M1  | Human-readable Steps   | UI verbs (แตะ / กรอก / เห็น) | code-ish (POST / page.fill)  |
| M2  | Wait duration / signal | "รอ X วินาที" / "รอ Y ปรากฏ" | "wait" / "until ready"       |
| M3  | Cleanup when needed    | restore state ระบุ           | side effect ไม่มีการเก็บกวาด |
| M4  | No privileged tooling  | UI / app-level verify        | SQL / Splunk / SSH in Steps  |
