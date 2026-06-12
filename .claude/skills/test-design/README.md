# test-design — วิธีใช้

Skill สำหรับออกแบบ test cases แบบ phased workflow แนว ISTQB-driven, **self-contained + portable** ใช้ได้ทุกโปรเจค

ใช้เมื่อมี feature spec แล้วต้องการให้ Claude ช่วยออกแบบ test แบบมีระบบ ตั้งแต่ REQ → scope → breakdown → cases → review

## Portability

Skill นี้ทำงานได้ในทุกโปรเจค ไม่ได้ผูกกับ testbydesign knowledge-base repo

- **ลงที่ไหน:** copy `.claude/skills/test-design/` ไปไว้ใน `.claude/skills/` ของโปรเจคใด ๆ หรือ global ที่ `~/.claude/skills/`
- **Workspace artifacts:** ทุก phase เขียนไฟล์ลง `.test-design-scratch/<feature>/` ในโปรเจคนั้น ๆ (เพิ่มลง `.gitignore` ของโปรเจคถ้าไม่อยาก commit)
- **ไม่ต้องอ่าน external file:** rules ที่จำเป็น (title format, FB 4 properties, Risk + TC budget, technique decision tree) inline อยู่ใน `phases/phase-{a,b,c,d}.md` แล้ว skill รันได้แม้ไม่มี `.mdx` methodology files
- **In testbydesign repo:** มี methodology pages ที่ `src/content/docs/{th,en}/practice/` + `src/content/docs/{th,en}/techniques/` skill จะ cite เป็น **optional anchors** สำหรับคนที่อยากอ่าน hook/example/exercise ลึก ๆ
- **Optional team playbook:** ถ้าใน workspace มี `_team-notes/qa-playbook.md` (team process doc) skill จะ defer to playbook สำหรับ team-specific conventions ถ้าไม่มี skill ก็รันด้วย inline rules ปกติ

## วิธี Invoke

**ไม่ต้องจำ flag** พิมพ์ `/test-design` ตามด้วยอะไรก็ได้ — skill จะ infer + ถามกลับถ้าไม่ชัด

**ตัวอย่าง:**

| พิมพ์                                           | Skill เข้าใจว่า                             |
| ----------------------------------------------- | ------------------------------------------- |
| `/test-design payment-alert`                    | เริ่ม feature ใหม่ ทำ Phase 0 → A → B → C   |
| `/test-design payment-alert ทำต่อ`              | resume — อ่าน `_state.json` ทำต่อจากที่ค้าง |
| `/test-design payment-alert ขอแค่ scope ก่อน`   | scope-only — จบที่ Phase A                  |
| `/test-design payment-alert ขอ review เคสที่มี` | review — ข้ามไป Phase C audit               |
| `/test-design` (ไม่มี feature)                  | ถาม "Feature name?"                         |

ถ้ายังคุ้นกับ flag style ก็ยังใช้ `--resume / --scope-only / --review` ได้ (skill รับทั้ง 2 แบบ)

## Phases สรุปสั้น

| Phase | Output                                                                                                                                      | Gate                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 0     | `_context.md`, `_state.json` (incl. layer_scope)                                                                                            | —                                                                           |
| A     | `01-reqs.md` (REQ list, first), `02-scope.md` (boundary decision), `03-flow.md`, `04-questions.md`                                          | Gate A: refuse B ถ้ายังมี question status=open หรือ reqs.md ว่าง/ขาด source |
| B.1   | `05-breakdown.md` (FBs linked to REQ-IDs, satisfy 4 properties of good test condition)                                                      | —                                                                           |
| B.2   | `06-technique-map.md`                                                                                                                       | —                                                                           |
| B.3   | `07-test-cases.md` (with Layer/Tags/Test data), `08-rtm.md`                                                                                 | Gate B: refuse C ถ้า FB/REQ gap หรือ technique skew >60%                    |
| C     | `09-review.md` (REQ traceability / coverage / distribution / ambiguity / ID gaps / priority / **layer balance** / tag sanity / granularity) | —                                                                           |
| D     | `10-export-*.md` (clipboard md / MDX / checklist)                                                                                           | — (on request)                                                              |

## Test case format

**Recommended: compact table per FB** (1 row = 1 TC, scannable, exports cleanly to TestRail / Xray / Sheet):

```markdown
### FB-001 — Required field check (REQ-001, 6 TCs)

| TC     | Title                                  | Layer | Pri      | Steps                                                      | Expected                                              | Tags                                               |
| ------ | -------------------------------------- | ----- | -------- | ---------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| TC-001 | Create: 5 fields filled → save success | Both  | critical | UI: fill 5 fields + Save<br>API: POST `/users` w/ 5 fields | UI: 201, redirect<br>API: 201, status=1               | EP, smoke, regression, critical-path, automate-now |
| TC-002 | Create: Name empty → validation error  | Both  | critical | name=""                                                    | UI: error "Name required"<br>API: 400/422, field=name | EP, regression, negative, automate-now             |
```

**Title format (mandatory):** `[Subject]: [scenario] → [expected]` — title อ่านเป็น failure message ได้ rule + bad/good examples อยู่ใน `phases/phase-b-breakdown.md` Section B.3 (Optional deeper context สำหรับคนที่อยู่ใน testbydesign repo: `src/content/docs/th/practice/writing-good-test-cases.mdx`)

**Why Operation field (CRUD column ใน TMS export):** FB grouping (test-condition-driven) does not map 1:1 to CRUD grouping (industry standard for spreadsheets and test management tools). Phase D export adds `Operation` column (`create` / `read` / `update` / `delete` / `cross-cut`) when exporting to TMS row format.

**Tag vocabulary:**

- Suite: `smoke`, `regression`, `sanity`
- Strategic: `critical-path`, `negative`, `boundary`, `security`, `a11y`, `api-contract`, `performance`
- Automation: `automate-now`, `manual-only`, `automate-later`

## Workspace

Default (ทุกโปรเจค): `.test-design-scratch/<feature>/` — workspace-local, ใช้กฎ "no real workplace specs" + gitignored ปลอดภัย ไม่ commit หลุด (ต้องเพิ่ม `.test-design-scratch/` ลง `.gitignore` ของโปรเจคถ้ายังไม่มี)

Commit-ready (optional): โฟลเดอร์ภายในโปรเจคที่ทีมเก็บ reviewed test designs เช่น `docs/case-studies/<feature>/` ในโปรเจคที่เก็บแบบนี้ ต้อง generalize spec ก่อน + ยืนยันชัดเจน

## Privacy

Skill จะ scan signals เหล่านี้ก่อนเขียนไฟล์:

- ชื่อบริษัท / product / employee ของจริง
- internal URLs, real API endpoints, hostnames
- proprietary product codes, real customer data

ถ้าเจอจะ warn และให้เลือก: generalize หรือยืนยันว่า scratch only

## Quick start example

```
You: /test-design payment-alert

Claude: Feature name? (default: payment-alert)
You: payment-alert

Claude: Spec source? (paste / file path / discover together)
You: [paste spec from Jira]

Claude: Testing goal? (find-defects / prevent / assess / build-confidence / inform)
You: find-defects

Claude: Workspace mode? (scratch / case-study)
You: scratch

Claude: [creates .test-design-scratch/payment-alert/, writes _context.md, enters Phase A]
       [Reads phases/phase-a-scope.md for Phase A rules]
       [produces 01-reqs.md (REQ list, first), 02-scope.md (boundary), 03-flow.md, 04-questions.md]
       Gate A check: 3 questions with status=open → refuse to proceed
       Please resolve these or mark deferred:
         1. Can INACTIVE alert be edited?
         2. ...
```

## Vocabulary alignment (ISTQB)

Skill ใช้ **"test condition"** เป็นคำหลัก (ISTQB Foundation Syllabus v4.0 Section 4.1) สำหรับ "ประเด็นที่ต้องทดสอบ 1 เรื่อง" Feature Breakdown (FB) = test condition ที่มี identifier definition + 4 properties + ที่มาอยู่ใน `phases/phase-b-breakdown.md` Section B.1 inline (ไม่ต้องอ่าน external file)

## Methodology source

Skill cite anchors 2 ระดับ (primary จำเป็น, secondary optional):

**Primary anchor (universal, industry standard):**

- ISTQB Foundation Level Syllabus v4.0 (Section 4.1 Test Analysis, 4.2-4.4 Techniques, 2.2 Levels, 5.1-5.4 Test Process)

**Secondary anchor (optional, available เฉพาะใน testbydesign repo):**

- Scope: `src/content/docs/th/practice/ticket-to-scope.mdx`
- Breakdown: `src/content/docs/th/practice/feature-breakdown.mdx`
- Cases: `src/content/docs/th/practice/writing-good-test-cases.mdx`
- Techniques: `src/content/docs/th/techniques/{black-box,experience-based,white-box}/*.mdx`
- Goals: `src/content/docs/th/foundations/what-is-testing.mdx`
- Fixtures: `src/content/docs/th/examples/{bank-onboarding,login-flow}.mdx`

ในโปรเจคอื่น secondary anchors ไม่มี — ใช้ primary anchor (ISTQB) + inline rules ใน phase files ก็พอ

**Optional team playbook (workspace-local):**

- ถ้าใน workspace มี team process doc (เช่น `_team-notes/qa-playbook.md` หรือ `.test-design-scratch/_team-notes/qa-playbook.md`) skill จะ defer to playbook สำหรับ project/team-specific conventions ถ้าไม่มี skill รัน inline rules ปกติ

## โครงสร้าง skill (orchestrator + phase detail)

```
.claude/skills/test-design/
├── SKILL.md                       (orchestrator: workflow, gates, references, invocation)
├── README.md                      (this file — user-facing intro)
└── phases/
    ├── phase-a-scope.md           (Phase A detail: REQ + scope + flow + questions)
    ├── phase-b-breakdown.md       (Phase B detail: breakdown + technique-map + test-cases)
    ├── phase-c-review.md          (Phase C detail: 8-check audit)
    └── phase-d-export.md          (Phase D detail: export formats)
```

SKILL.md เป็น entry point ที่อ่านเข้าใจ workflow ทั้งหมดได้ใน 1 หน้าจอ ส่วน detailed guidance ของแต่ละ phase อยู่ใน `phases/phase-X.md` (skill อ่าน on-demand ตอนเข้าสู่ phase นั้น)

## ถ้า Claude Code ไม่เห็น skill

หลังเพิ่ม skill ใหม่ Claude Code session ปัจจุบันอาจยังไม่เห็น `/exit` แล้ว `claude` ใหม่ในโฟลเดอร์ repo skill จะ auto-discover จาก `.claude/skills/test-design/SKILL.md`
