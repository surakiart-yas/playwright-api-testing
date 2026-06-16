# Learning Path — วิธีออกแบบ API test framework

template นี้สอน **framework design** — สถาปัตยกรรมและการตัดสินใจที่อยู่เบื้องหลัง — โดยใช้ suite ขนาดเล็กที่รันได้จริงเป็นตัวอย่าง แต่ละบทเรียนประกอบด้วย **(a)** ปัญหาด้านการออกแบบ **(b)** การตัดสินใจที่เลือกและเหตุผลอยู่ที่ไหน **(c)** ดูในโค้ดได้ที่ไหน

ยังไม่รู้ว่า test / fixture / AOM คืออะไร? อ่าน [docs/concepts.md](docs/concepts.md) ก่อน

ก่อนบทเรียนที่ 1: ตั้งค่า `GOREST_TOKEN` ใน `.env` แล้วรัน `pnpm install && pnpm test`
จากนั้น skim [docs/architecture.md](docs/architecture.md) เพื่อดู layer map

> ลำดับ: บทเรียน 1–6 สร้าง framework, 7–8 คือวินัยที่ทำให้มันน่าเชื่อถือ, 9–10 คือ operational wrap ถ้าหยุดหลังบทที่ 6 ก็พอ build ได้แล้ว — 7–10 คือสิ่งที่ทำให้มันพร้อม _production_

---

## 1. Architecture & layers — โค้ดแต่ละชิ้นอยู่ที่ไหน?

**ปัญหา.** ถ้าไม่มีกฎการแบ่ง layer แต่ละ test จะเขียน HTTP calls และ helper ของตัวเอง พอต้องแก้ endpoint หนึ่ง ก็ต้องแตะยี่สิบไฟล์

**การตัดสินใจ.** แบ่งเป็น 4 layer — core (service-agnostic) → services (AOM: one client per _service domain_, ไม่ใช่ per user story) → fixtures (wiring + scope) → tests (behavior)
เหตุผล: [decisions §16](docs/decisions.md), [docs/architecture.md](docs/architecture.md)

**ดูในโค้ด.** [src/core/](src/core/) ไม่รู้จัก domain เลย; [src/services/users/](src/services/users/) มีแค่สี่ไฟล์ที่เพิ่ม GoRest users domain เข้า framework โดยไม่แก้ core แม้แต่ไฟล์เดียว

## 2. Envelope & schema ในฐานะ single source of truth

**ปัญหา.** API มักห่อข้อมูลด้วย envelope (`{ code, message, data }`) การเขียน TS interface แยกและ validation schema แยกสำหรับแต่ละ response ทำให้มีสอง source ที่ drift ออกจากกัน

**การตัดสินใจ.** ใช้ Zod schema เดียวต่อ response; type ถูก infer มาจากมัน (`z.infer`) ทุกอย่างใช้ `looseObject` เพื่อให้ field แปลกๆ ที่ API ส่งมาโดยไม่ได้ประกาศยังคง visible อยู่
เหตุผล: [decisions §12](docs/decisions.md), [§3](docs/decisions.md), [rules/api-patterns.md](.claude/rules/api-patterns.md)

**ดูในโค้ด.** [src/services/users/schemas.ts](src/services/users/schemas.ts) — GoRest ไม่มี envelope (ส่ง bare resource), 422 errors เป็น array ลองเปรียบกับ wrapper แบบ `{ code, data }` ทั่วไปเพื่อสัมผัสว่า schema layer รับภาระได้มากแค่ไหนโดยไม่ต้องแก้ framework
[types.ts](src/services/users/types.ts) แสดงการใช้ `z.infer` บวกกับ hand-written const catalogs

## 3. BaseClient — HTTP surface จุดเดียว

**ปัญหา.** ทุก client ต้องการสิ่งเดิมซ้ำๆ: ต่อ base URL, ใส่ auth header, จับ timing, log, แนบ report attachment ถ้า repeat ทุก service มันจะ drift

**การตัดสินใจ.** `BaseClient` เป็นเจ้าของ HTTP verbs ทั้งหมด; `request` และ `testInfo` inject ผ่าน constructor (ไม่ใช่ method params); auth override ที่ `getAuthHeaders()` เพียงที่เดียว; response-time check ทำงานอัตโนมัติหลังทุก call
เหตุผล: [rules/api-patterns.md](.claude/rules/api-patterns.md) "BaseClient Rules"

**ดูในโค้ด.** [src/core/BaseClient.ts](src/core/BaseClient.ts) →
[src/utils/http.ts](src/utils/http.ts) (boxed report step ต่อ request หนึ่งครั้ง พร้อม masked attachment) → [UsersClient.ts](src/services/users/UsersClient.ts) (ดูว่า concrete client บางแค่ไหน)

## 4. Two-layer assertions — structural vs behavioral

**ปัญหา.** ถ้า validator assert ค่า field จะกลายเป็น god-object; ถ้า test assert structure ทุก test ก็ copy-paste code เดิมสามบรรทัด

**การตัดสินใจ.** Validator = structure (status → schema → business code) ห่อใต้ `Verify:` node เดียวใน report; Test = ค่าที่ TC นั้นมีอยู่เพื่อพิสูจน์ ใช้ `toMatchObject` (diff ครั้งเดียวเห็นทุก mismatch) ใช้กฎ Rule of 3 ก่อน abstract field combo
เหตุผล: [decisions §4, §5](docs/decisions.md), [rules/testing.md](.claude/rules/testing.md) "Assertion Style"

**ดูในโค้ด.** [UsersValidator.ts](src/services/users/UsersValidator.ts) เทียบกับ inline `expect` ใน [tests/users/create.spec.ts](tests/users/create.spec.ts) TC-005

## 5. Fixtures & scopes — แต่ละอย่างมีอายุยาวแค่ไหน

**ปัญหา.** ถ้าเปิด TCP connection ใหม่ทุก test จะช้า; ถ้า share client ตัวเดียวทั้งหมด request จะแนบไปผิด test report และ auth state จะรั่วข้าม test

**การตัดสินใจ.** `workerRequest` เป็น worker-scoped (warm ครั้งเดียว); `apiConfig` และ clients เป็น test-scoped (แต่ละตัวถือ `testInfo` ที่ live อยู่); provisioner เป็น worker-scoped เพราะ cache และ cleanup ของมันครอบคลุมหลาย test
เหตุผล: [rules/fixtures.md](.claude/rules/fixtures.md)

**ดูในโค้ด.** [src/fixtures/base.ts](src/fixtures/base.ts) →
[tests/users/fixtures.ts](tests/users/fixtures.ts) (extend chain)

## 6. Runtime provisioning & independence

**ปัญหา.** Test ที่ต้องการ state ที่มีอยู่ก่อน (เช่น product ที่มีอยู่แล้ว, user ที่รู้ password) มักพึ่ง seeded data (drift และช่วงชิงกันใน parallel) หรือไม่ก็สร้างขยะสะสมทุก run

**การตัดสินใจ.** Provision ตอน runtime: worker-scoped provisioner สร้าง resource on demand ใต้ prefix `autotest-`, cache สำหรับ read-only subjects, ให้ disposable แก่ test ที่ mutate, และลบทุกอย่างใน teardown ถ้า setup fail ให้ THROW; ถ้า dependency ไม่พร้อมให้ SKIP
เหตุผล: [rules/fixtures.md](.claude/rules/fixtures.md) "Provisioning", [decisions §6, §8, §17](docs/decisions.md)

**ดูในโค้ด.** [tests/users/provisioner.ts](tests/users/provisioner.ts) (ตรวจ credential ก่อน, hard-delete ใน teardown เพราะ GoRest เป็น shared public DB)

## 7. Spec-is-truth / RED-by-design

**ปัญหา.** API ทำผิด contract ของตัวเอง ถ้าลด assertion ให้ผ่าน suite จะกลายเป็นสีเขียว และเหตุผลทุกอย่างที่จะให้ bug นั้นได้รับการแก้ก็หายไปด้วย

**การตัดสินใจ.** Assert behavior ที่ถูกต้องตาม document, ปล่อยให้ test เป็น RED อย่างชัดเจน, ไม่ใส่ scope tag เพื่อไม่ให้บล็อก PR gate, และ comment ชี้ defect อย่าใช้ `test.fail(true)` เพราะมันซ่อน failure ให้ดูเหมือนผ่าน
เหตุผล: [rules/testing.md](.claude/rules/testing.md) "Spec is the source of truth"

**ดูในโค้ด.** [tests/users/update.spec.ts](tests/users/update.spec.ts) TC-011 — contract บอกว่า
write ไม่มี token → 401 (POST ทำตาม, TC-008) แต่ GoRest คืน 404 สำหรับ PATCH ที่ไม่มี token
test assert 401 ตาม contract แล้วปล่อยแดง ไม่ใส่ scope tag → `pnpm test:regression` เขียว
แต่ `pnpm test` เต็มโชว์แดง (ดู expected ใน [docs/test-plans/users.md](docs/test-plans/users.md) TC-011)

## 8. Traceability — สัญญาระหว่าง catalog กับโค้ด

**ปัญหา.** เอกสาร test เสื่อมสภาพตามกาลเวลา พอผ่านไปหกเดือน ไม่มีใครรู้ว่า catalog, RTM หรือโค้ด อันไหนเป็นข้อมูลล่าสุด และก็ไม่มีใครไว้วางใจอันไหนเลย

**การตัดสินใจ.** `docs/test-plans/<resource>.md` คือ source of truth; โค้ดฝัง TC-ID ไว้ (`allure.label.tc`); `pnpm check:consistency` ตรวจว่า TC-ID ในโค้ดต้องมีอยู่ในไฟล์ doc ด้วย
เหตุผล: [rules/traceability.md](.claude/rules/traceability.md)

**ดูในโค้ด.** [docs/test-plans/users.md](docs/test-plans/users.md) ↔ `allure.label.tc` annotations ใน [tests/](tests/) ↔ [scripts/check-consistency.sh](scripts/check-consistency.sh)

## 9. Reporting & response-time budget

**ปัญหา.** Report ที่อ่านไม่ออกก็ไม่มีใครอ่าน; และ hard SLA ต่อ request ทำให้ infra jitter กลายเป็น false red ที่ฝึกให้คนเพิกเฉยต่อ failure

**การตัดสินใจ.** Allure tree จัดเป็น Service → Type → Endpoint (epic/feature/story จาก tags) พร้อม `Verify:`/`Precondition:` boxed steps และ masked attachments ต่อ request Response time มีสองชั้น: soft target → warn แต่ไม่ fail; hard ceiling → fail (กรณีค้าง)
เหตุผล: [decisions §1, §2, §15, §18](docs/decisions.md)

**ดูในโค้ด.** [src/utils/allure-meta.ts](src/utils/allure-meta.ts),
[BaseValidator.expectResponseTime](src/core/BaseValidator.ts),
[src/utils/reporting.ts](src/utils/reporting.ts) แล้วลอง `pnpm test:report` เพื่อสำรวจ

## 10. CI gate

**ปัญหา.** อะไรควรบล็อก PR? ถ้ารัน RED-by-design tests ใน gate จะบล็อกทุก PR ตลอดไป; ถ้าไม่รันอะไรเลยก็ปล่อยให้ drift เข้ามา

**การตัดสินใจ.** PR gate เดียว: lint + type-check + `check:consistency` + `test:regression` (test ที่ยัง RED จะไม่มี scope tag จึงไม่บล็อก gate แต่ยังคง visible ใน full run)
เหตุผล: [.github/workflows/pr-gate.yml](.github/workflows/pr-gate.yml), [docs/testing.md](docs/testing.md)

---

## นำไปใช้ต่อ

- ดูตัวอย่างครบ: [tests/users/](tests/users/) มี 14 TC (รวมเคส RED-by-design TC-011) ↔
  catalog ที่ [docs/test-plans/users.md](docs/test-plans/users.md)
- ดู cross-resource pattern: [tests/posts/](tests/posts/), [tests/comments/](tests/comments/),
  [tests/todos/](tests/todos/) — provisioner สร้าง parent chain (user → post → comment) ก่อน
- เพิ่ม API ของตัวเอง: เปลี่ยน `BASE_URL` + derive envelope จาก spec (บทเรียนที่ 2)
- นำไปใช้กับ API ของตัวเอง: เปลี่ยน `BASE_URL`, derive envelope จาก spec ของคุณ (บทเรียนที่ 2),
  สร้าง provisioner (บทเรียนที่ 6)
- กระบวนการ: **ออกแบบ catalog ก่อนเสมอ** (ดู [docs/test-plans/](docs/test-plans/) สำหรับ pattern),
  implement one `test()` per catalog TC ([CONTRIBUTING](CONTRIBUTING.md)), keep traceability
  mechanical ([rules/traceability.md](.claude/rules/traceability.md))
