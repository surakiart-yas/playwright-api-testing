# test-case — วิธีใช้

Skill สำหรับ **เขียน / ตรวจ / refactor test case ทีละตัว (หรือเป็นชุด)** ให้ผ่าน rubric เดียวกันทั้งทีม รองรับทั้ง manual และ automation ใน skill เดียว default mode = automation

ใช้เมื่อ:

- มี TC อยู่แล้วและต้องการตรวจว่าเขียนถูก pattern มั้ย
- อยากได้ TC draft 1-2 อันโดยไม่ผ่าน workflow `test-design` เต็ม
- มี TC ทั้งตาราง (Sheet / TestRail / Xray export) แล้วต้อง audit ทั้งชุดในรอบเดียว
- TC เก่า style เก่า อยาก rewrite ให้ตรง pattern ใหม่

## ตำแหน่งของ skill เทียบกับ test-design

| `test-design`                       | `test-case` (this skill)             |
| ----------------------------------- | ------------------------------------ |
| ทั้ง workflow: spec → REQ → FB → TC | จุดเดียว: TC ทีละตัวหรือเป็นชุด      |
| ผลิต TC catalog ทั้ง feature        | ผลิต / ตรวจ / refactor TC ที่มีอยู่  |
| มี Gate, Phase, state file          | ไม่มี gate, single-shot ตาม mode     |
| ทำตอนเริ่ม feature ใหม่             | ทำได้ทุกเวลา ไม่ต้องผ่าน test-design |

ใช้ร่วมกันได้: `test-design` Phase C สามารถ delegate การตรวจ Title format / TC quality ลงมาที่ skill นี้

## โครงสร้าง skill

```
.claude/skills/test-case/
├── SKILL.md           (orchestrator: mode resolution, references, invocation)
├── README.md          (this file)
├── modes/
│   ├── write.md       (write new TC)
│   ├── review.md      (audit 1-3 TCs)
│   ├── batch.md       (audit หลาย TCs พร้อมกัน)
│   └── refactor.md    (rewrite TC ไป target mode)
└── rules/
    ├── core.md        (C1-C12 mode-agnostic checks)
    ├── manual.md      (M1-M4 manual-only checks)
    └── automation.md  (A1-A6 automation-only checks)
```

## 2 axes ของการ invoke

ทุกครั้ง skill ตัดสินใจ 2 อย่าง:

**1. Operating mode (skill ทำอะไร):**

| Mode       | ใช้เมื่อ                                              |
| ---------- | ----------------------------------------------------- |
| `write`    | ไม่มี TC อยากให้ draft                                |
| `review`   | มี TC 1-3 ตัว ตรวจ                                    |
| `batch`    | มี TC ≥4 ตัว ตรวจรวด                                  |
| `refactor` | มี TC อยู่ ปรับให้ตรง pattern หรือเปลี่ยน target mode |

**2. Target mode (TC type ที่ rule จับคู่):**

| Target                 | Rules ที่ใช้                                        |
| ---------------------- | --------------------------------------------------- |
| `automation` (default) | C1-C12 + A1-A6                                      |
| `manual`               | C1-C12 + M1-M4                                      |
| `both`                 | C1-C12 + M (สำหรับ UI block) + A (สำหรับ API block) |

Skill เดา target จาก:

1. ผู้ใช้ระบุ explicit
2. Tags column (`automate-now` / `manual-only` / `automate-later`)
3. Steps style (เจอ `POST /...` / `page.fill(...)` → automation; เจอ "ตามอง" / "ลองคลิก" → manual)
4. ถ้าเดาไม่ออก → **default automation** + แจ้งผู้ใช้

## วิธี Invoke

ไม่ต้องจำ flag พิมพ์ `/test-case` ตามด้วยอะไรก็ได้

| พิมพ์                                               | Skill เข้าใจ                |
| --------------------------------------------------- | --------------------------- |
| `/test-case ช่วยเขียน TC: OTP timeout`              | write, automation (default) |
| `/test-case manual TC สำหรับ login PIN ผิด 3 ครั้ง` | write, manual               |
| `/test-case [paste 1 TC]`                           | review, target จากเนื้อหา   |
| `/test-case ตรวจทั้งตารางใน 07-test-cases.md`       | batch, target per row       |
| `/test-case refactor TC-014 ไป automation`          | refactor, automation        |
| `/test-case` (เปล่า)                                | ถามกลับว่าต้องการอะไร       |

## Quick start

### Write 1 TC

```
You: /test-case ช่วยเขียน TC: OTP กรอกเกิน 3 นาที expired
     Layer = API

Claude: Target mode: automation (default ของ skill)
        [reads core.md + automation.md]
        [drafts TC, self-checks C1-C12 + A1-A6]

        TC-XXX — OTP: กรอกเกิน 3 นาที → expired + ขอใหม่ได้
        Layer: API
        Tags: regression, negative, automate-now
        Priority: high
        Preconditions:
          - factory.user.create({ status: 'ACTIVE', phone: '0812345678' })
          - mockClock เปิด
        Test data: phone="0812345678"
        Steps (API):
          1. POST /auth/otp/request body {phone}
          2. capture otp = testProvider.lastOtp(phone)
          3. mockClock.advance("3m1s")
          4. POST /auth/otp/verify body {phone, otp}
        Expected (API):
          - step 4: HTTP 400, body.error_code = "OTP_EXPIRED"
          - body.can_request_new = true
        Cleanup: factory.user.cleanup(phone)

        ✅ Checks passed: C1-C12, A1-A6
```

### Review 1 TC

```
You: /test-case [paste TC ที่มี Title = "ทดสอบ login"]

Claude: Target mode: manual (resolved: ไม่มี automation tag, steps เป็น prose)
        [reads core.md + manual.md]

        Verdict: ❌ Fail (4 issues)

        - C1 Title format: "ทดสอบ login" ไม่ match [Subject]: [scenario] → [expected]
          Fix: "Login: ใส่ PIN ถูกต้อง → เข้าหน้า home"
        - C6 Expected specific: "เข้าได้" คลุมเครือ
          Fix: ระบุ "redirect ไป /home, แสดงชื่อ user ที่ header"
        - C9 Tags ครบ: ขาด suite tag + automation hint
          Fix: เพิ่ม "smoke, manual-only"
        - C10 Layer: ไม่ระบุ
          Fix: เพิ่ม "Layer: UI"

        ต้องการ apply fix ทั้งหมด rewrite ให้เลยมั้ย?
```

### Batch review

```
You: /test-case ตรวจทั้งตารางใน .test-design-scratch/live-stream/07-test-cases.md

Claude: Operating mode: batch
        [reads file, parse 47 rows]
        [target resolved per row from Tags]
        [runs all checks]

        Summary:
        | Verdict | Count |
        |---|---|
        | ✅ Pass | 31 |
        | ⚠️ Warning | 11 |
        | ❌ Fail | 5 |

        Top issues:
        - C6 Expected specific: 8 rows
        - C1 Title format: 3 rows
        - A1 Stable selector: 4 rows (automation TCs)
        - M1 Steps human-readable: 1 row (manual TC ใช้ code-ish)

        Failed rows: TC-007, TC-012, TC-022, TC-029, TC-041

        ดู detail row ไหน หรือ save report ที่ไหนครับ?
```

### Refactor TC

```
You: /test-case refactor TC-014 ไป automation
     [paste TC manual]

Claude: Target mode: automation (from request)
        [reads core.md + automation.md]
        [rewrite + diff]

        Title: (unchanged) "OTP: กรอกเกิน 3 นาที → expired + ขอใหม่ได้"
        Layer: UI → API ?  (ถามกลับเพราะ refactor ไป automation มักเปลี่ยน Layer)

        Diff:
        - Steps: "เปิดหน้า login → กรอกเบอร์ → รอ SMS"
        + Steps: "POST /auth/otp/request body {phone} → capture otp"
        - Expected: "toast 'OTP หมดอายุ' ปรากฏ"
        + Expected: "HTTP 400, error_code='OTP_EXPIRED'"
        - Tags: regression, manual-only
        + Tags: regression, negative, automate-now
        + Preconditions: factory.user.create(...), mockClock เปิด
        + Cleanup: factory.user.cleanup(phone)

        Rationale per change:
          - Steps → API form: A1 selector / A2 wait condition
          - Expected → contract-level: A4 atomic + ไม่ผูก UI text
          - Tags swap: automation hint update
          - Factory + cleanup: A3, A5

        ต้องการ apply ลงไฟล์เลยมั้ย?
```

## Output location

- `review` default → stdout
- `batch` default → stdout summary + offer save ไป `.test-design-scratch/<feature>/tc-review-<YYYY-MM-DD>.md`
- `write` / `refactor` default → stdout + offer append ไปไฟล์ที่ผู้ใช้ชี้

ไม่เขียนลง `docs/` หรือ commit-ready paths ถ้าไม่ได้ confirm

## Rule reference (ใช้เมื่อ skill อ้าง ID)

| ID  | สั้น                               | อยู่ใน        |
| --- | ---------------------------------- | ------------- |
| C1  | Title format                       | core.md       |
| C2  | Title อ่านเป็น failure message     | core.md       |
| C3  | Atomic                             | core.md       |
| C4  | Steps numbered + 1 action/step     | core.md       |
| C5  | Steps ไม่ฝัง assertion             | core.md       |
| C6  | Expected specific                  | core.md       |
| C7  | Preconditions ชัด                  | core.md       |
| C8  | Test data list ค่าจริง             | core.md       |
| C9  | Tags ครบ (suite + automation hint) | core.md       |
| C10 | Layer ระบุ                         | core.md       |
| C11 | ถ้า Both → 4 block ครบ             | core.md       |
| C12 | Traceability (FB/REQ)              | core.md       |
| M1  | Steps human-readable               | manual.md     |
| M2  | Wait approx duration               | manual.md     |
| M3  | Cleanup note                       | manual.md     |
| M4  | No privileged tooling              | manual.md     |
| A1  | Stable selector                    | automation.md |
| A2  | Wait condition-based               | automation.md |
| A3  | Factory / fixture isolated         | automation.md |
| A4  | Atomic assertion                   | automation.md |
| A5  | Setup / teardown explicit          | automation.md |
| A6  | No environment assumption          | automation.md |

## Portability

Skill ไม่ผูกกับ testbydesign repo ใช้ได้ทุกโปรเจค

- Copy `.claude/skills/test-case/` ไปไว้ใน `.claude/skills/` ของโปรเจคใด ๆ
- หรือ global ที่ `~/.claude/skills/`
- Workspace artifacts default ลง `.test-design-scratch/<feature>/` (gitignored)
- ไม่ต้องอ่าน external file rule ทั้งหมด inline ใน `rules/*.md`

## Optional team playbook

ถ้าใน workspace มี `_team-notes/qa-playbook.md` หรือ similar skill จะ defer to playbook สำหรับ team-specific tag / column / vocabulary ถ้าไม่มี skill รัน inline rules ปกติ
