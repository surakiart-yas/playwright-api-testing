# Decisions

ทำไม project นี้ถึงมีหน้าตาแบบนี้ — อ่านก่อนที่จะแก้ไข pattern ที่ดูแปลก
เพราะทางเลือกส่วนใหญ่ที่ "ดูแปลก" ในที่นี้ล้วนตั้งใจไว้แล้ว

แต่ละ decision จะมี **Context**, **Decision**, **Reason** และ **Trade-off**
เพื่อให้คุณตัดสินได้ว่า constraint นั้นยังใช้ได้อยู่หรือไม่

---

## 1. Allure tree: Service → Type (ไม่ใช่ Type → Service)

**Decision.** Allure `epic` = service tag `@<svc>` (เช่น `@users`) และ `feature` =
`Contract Tests` (จาก `@isolated`) หรือ `Business Flows` (จาก `@flow`) ดังนั้นทุก
test ต้องติด service tag `@users` (ที่ระดับ `test.describe`) ไม่งั้น epic จะว่าง

**Reason.** กลุ่มเป้าหมายหลักของ report คือ QA และ Dev ไม่ใช่ stakeholder
พวกเขาเปิด report โดยมองที่ service ก่อน ("สถานะของ Users เป็นยังไง?") แล้วค่อย
drill down ไปดู test type การจัดทุก test ของ service เดียวกันไว้ใต้ epic เดียวกัน
จะได้ไม่ต้องกระจาย health state ออกเป็นหลาย group

**Trade-off.** Stakeholder ที่อยากดูแบบ type-first ("มี contract violation
เปิดอยู่เท่าไหร่?") ให้ไปใช้แท็บ **Categories** แทน — ได้ grouping แบบ type-first
โดยไม่ต้องปรับโครงสร้าง tree

**Where.** [src/utils/allure-meta.ts](../src/utils/allure-meta.ts)

---

## 2. Allure cross-service tests: epic "Cross-Service" แยกต่างหาก

**Decision.** Test ที่ติด tag สอง service tags ขึ้นไปจะถูกจัดอยู่ใน epic
ชื่อ **`Cross-Service`** — ไม่อยู่ใต้ service ใด service หนึ่ง

**Reason.** ตัวเลือกก่อนหน้านี้สองแบบมีปัญหา:

1. _ใส่ทั้งสอง service tag เป็น epic_ — Allure จะ drop test ที่มีหลายค่าใน
   label ที่ใช้ group ออกจาก Behaviors view ทั้งหมด test จะหายไปเฉยๆ
2. _First service tag wins_ (ตัดสินใจเก่า) — test ไปโผล่ใต้ service แรก ทั้งที่
   มันแตะหลาย service ทำให้ contributor ใหม่งงว่า report ขึ้นใต้ service ไหน

Epic `Cross-Service` ทำให้ QA แยกดู health ของ cross-service ออกจาก single-service ได้ทันที

> **สถานะ:** template นี้มี service เดียว (`users`) ยังไม่มี cross-service test —
> โค้ดใน `allure-meta.ts` รองรับไว้แล้ว (เช็ค `serviceTags.length >= 2`) จะ active
> เมื่อ test ติด service tag ตั้งแต่ 2 ตัวขึ้นไป (เช่นเพิ่ม posts ที่อ้าง user)

**Trade-off.** เพิ่ม epic หนึ่งตัวที่ top level แต่ยอมรับได้เพราะ cross-service
test มีจำนวนน้อยมาก และการมีบ้านของตัวเองชัดกว่าแบบ first-tag-wins
Tags filter ยังคงใช้เป็น secondary navigation ได้ปกติ

**Where.** [src/utils/allure-meta.ts](../src/utils/allure-meta.ts) —
`applyAllureFromTags` (ดูส่วนที่เช็ค `serviceTags.length >= 2`)

---

## 3. Schemas: lock เฉพาะ field ที่ประกาศ (`looseObject`)

**Decision.** ทุก schema (`userData` เป็นต้น) ใช้ `z.looseObject` — **field ที่ประกาศชื่อ
ไว้ถูก lock** (ต้องมี + type ตรง) แต่ field เกินที่ไม่ได้ประกาศ **ผ่านได้และถูกเก็บไว้**
ใน parsed body ไม่ตัดทิ้ง

**Reason.** ต้องป้องกัน failure สองรูปแบบต่างกัน:

- Resource drift (API ลบ/เปลี่ยนชื่อ field ที่เป็น contract เช่น `email` หาย) → schema
  จับให้ดังเพราะ field ที่ประกาศไว้ขาด/type ผิด นี่คือสิ่งที่ contract test มีไว้เพื่อ
- Field เกินที่ API แอบเพิ่ม (`traceId` หรือ field ที่ **หลุดมาไม่ควรมี** เช่น internal flag)
  → ต้องไม่ทำให้ test พัง **แต่ต้องเก็บไว้ให้เห็น** เพราะ absence/leak test ต้องตรวจมันได้
  (ถ้าใช้ `z.object` แบบ strip จะซ่อน leak จริงๆ ไว้เงียบๆ)

**Trade-off.** field เกินที่ API เพิ่มจะ "เงียบ" (ไม่ทำให้ test แดงเอง) — แต่จงใจ:
contract test lock เฉพาะสิ่งที่ระบุไว้ ส่วน leak ที่ไม่ควรมีให้ behavioral assertion
(เช่น `expect(json).not.toHaveProperty('password')`) เป็นคนจับ ไม่ใช่ schema

> GoRest ไม่มี wrapper envelope (ส่ง bare resource) ดังนั้น "resource" กับ "envelope"
> จึงเป็นสิ่งเดียวกัน — ใช้ `looseObject` ทั้งหมด ดู §12 (Zod conventions)

**Where.** [src/services/users/schemas.ts](../src/services/users/schemas.ts)

---

## 4. Validator = structural, Test = behavioral

**Decision.** `*Validator.expect*Success` ตรวจ STRUCTURE (HTTP status, schema,
response time) ส่วน test inline-`expect()` ตรวจ VALUES ที่แต่ละ test สนใจ

**Reason.** Validator เป็น general — ทุก test ผ่านมัน ส่วน field-value assertion
เฉพาะ — แตกต่างกันตาม test ถ้าใส่ field assertion ใน validator จะกลายเป็น
god-object ที่มี parameter เยอะขึ้นเรื่อยๆ แต่ถ้าใส่ structural check ใน
ทุก test ก็จะกลายเป็น copy-paste

**The Rule of 3.** ถ้า field-value combo เดิมปรากฏใน 3+ test ให้ abstract ออก
จนกว่าจะถึงตอนนั้น ให้เขียน inline ไว้ก่อน

**Where.** [src/core/BaseValidator.ts](../src/core/BaseValidator.ts) +
service-specific validators

---

## 5. Field-value assertions ใช้ `toMatchObject`

**Decision.** การเช็ค field หลายตัวใช้ `expect(json).toMatchObject({...})`
ไม่ใช่หลาย `toBe`

**Reason.**

- Field ที่ fail ทุกตัวจะแสดงใน error เดียว (ไม่ต้องรัน fix รัน fix ทีละตัว)
- Partial match — field ที่ test ไม่สนใจ (`id`, `createdAt`) ไม่ต้องใส่ wildcard
- Schema lock รูปร่างไว้แล้ว `toMatchObject` ต้องการแค่ lock _values_ ที่ test สนใจ

**Trade-off.** `toMatchObject` ยอมรับ field เพิ่มเติมได้ เราพึ่ง `expectSchema`
(ที่เรียกใน `expect*Success` validator ทุกครั้ง) ให้จับ field แปลก ทั้งสองทำงานเป็น
คู่กัน — อย่า drop schema check โดยคิดว่า `toMatchObject` เพียงพอแล้ว

**Where.** ทุกที่ที่จะเขียน 2+ consecutive `expect(json.X).toBe(Y)`

---

## 6. Helper throw เมื่อ setup fail (ไม่ใช่ skip)

**Decision.** Provisioning helpers (`createDisposableUser` เป็นต้น) จะ throw
พร้อม message ที่อธิบายชัดเจนเมื่อ precondition API call fail

**Reason.** Precondition ที่ fail คือ test failure ไม่ใช่ test skip การ skip
เงียบๆ ซ่อน infrastructure problem และปล่อยให้ regression ผ่านไป ถ้า provisioning
create คืน 500 นั่นคือ bug จริงๆ ที่เราต้องการให้ดังๆ (การ skip สงวนไว้สำหรับ
dependency ที่ MISSING เช่น credentials ไม่ได้ตั้งค่า ไม่ใช่ dependency ที่ fail
ดู `.claude/rules/fixtures.md`)

**Where.** [tests/users/provisioner.ts](../tests/users/provisioner.ts)

---

## 7. GoRest ใช้ personal Bearer token จาก env

**Decision.** Suite นี้ทำงานตรงกับ GoRest public API โดยใช้ personal Bearer
token จาก env var `GOREST_TOKEN` เป็น auth เพียงแหล่งเดียว เมื่อ token ไม่ได้ตั้งค่า
test จะ skip พร้อม message อธิบาย ไม่มี runtime login หรือ admin pool

**Reason.** GoRest เป็น public practice API ที่ใช้ personal token โดยตรง
ไม่มี login endpoint หรือ session management pattern ที่ซับซ้อน การ skip
เมื่อไม่มี token ดีกว่าการ fail แบบ cryptic เมื่อไม่มี auth source ตั้งค่า

**Where.** [tests/helpers.ts](../tests/helpers.ts) (`getGoRestToken`, `gorestConfig` ฉีด
token) + [tests/users/fixtures.ts](../tests/users/fixtures.ts) (gate + skip เมื่อไม่มี token)

---

## 8. ทุก test resource ใช้ `autotestSlug()`

**Decision.** Resource names (เช่น ชื่อ user, email) ต้องขึ้นต้นด้วย `TEST_PREFIX`
(`autotest-` by default) ผ่าน `autotestSlug()` ห้าม hardcode prefix string

**Reason.** prefix `autotest-` ทำ 2 อย่าง: (1) ทำให้ record ของเรา **จำได้ด้วยตา** ใน
shared DB และ (2) เป็น safety net ถ้าวันหน้าทำ global prefix-sweep prefix ที่ hardcode
จะ drift เมื่อใครเปลี่ยนชื่อ constant test ที่ลืมใส่ prefix จะ leak ทิ้งใน shared env

> **หมายเหตุ:** cleanup จริงตอนนี้ลบ **ตาม tracked id** (`provisioner.cleanup()` วน
> ลบ id ที่ track ไว้) — **ยังไม่มี** global prefix-sweep; `global-teardown.ts` เป็น no-op
> leak ที่หลุดจริงๆ พึ่ง GoRest reset ทุก 24 ชม. ดู `.claude/rules/fixtures.md`

**Where.** [src/utils/test-data.ts](../src/utils/test-data.ts) (`autotestSlug`) +
[tests/users/provisioner.ts](../tests/users/provisioner.ts) (`track` + `cleanup`)

---

## 9. Allure history: external file ไม่อยู่ใน `allure-results/`

**Decision.** `pnpm allure:generate` ใช้ `--history-path allure-history.json`
ไฟล์ `allure-history.json` ถูก commit เข้า repo ส่วน `allure-results/` จะ wipe
ก่อนทุก test run

**Reason.** ถ้าไม่มี history Allure Trend chart จะแสดงเฉพาะ "current run" เท่านั้น
เมื่อมี history จะเห็น pass-rate evolution ข้าม build ได้ history file ถูกทั้ง
อ่านและเขียนด้วย flag เดียวกัน — การ commit ทำให้ CI run และ local run ใช้
baseline เดียวกัน

**Trade-off.** `allure-history.json` จะโตขึ้นเรื่อยๆ ถ้ามันใหญ่เกินไปให้ prune
ด้วยตนเอง จากประสบการณ์จริง: ~50 KB หลัง 100 run ถือว่าไม่มีปัญหา

**Where.** [package.json](../package.json) script `allure:generate`

---

## 10. ไม่มี mock server

Suite นี้รันตรงกับ GoRest เสมอ ไม่มี mock server bundled ไว้
Token มาจาก env var `GOREST_TOKEN` — ถ้าไม่ตั้งค่า test จะ skip อัตโนมัติ
ไม่ fail

---

# Tooling decisions

Decisions ที่มีหมายเลขข้างต้นเกี่ยวกับ test pattern ส่วนด้านล่างนี้คือ decisions
เกี่ยวกับ tooling — เราเลือกอะไร และยอมสละอะไรไป

---

## 11. Prettier + ESLint (ไม่ใช่ Biome.js)

**Decision.** ใช้สองเครื่องมือแยกกัน: Prettier สำหรับ formatting, ESLint
สำหรับ linting

**Reason.**

- ESLint plugin ecosystem กว้างกว่ามาก (typescript-eslint, eslint-plugin-playwright
  เป็นต้น) หลาย rule ที่เราต้องการยังไม่มีใน Biome
- Prettier มี IDE support เกือบทุกที่แบบ out of the box (`esbenp.prettier-vscode`)
  ส่วน Biome มี extension แต่การใช้งานยังกระจัดกระจายตาม editor/CI runner
- Team familiarity — Prettier + ESLint คือ default mental model ของ developer
  TS/Node ส่วนใหญ่ onboarding จึงเร็วกว่า

**Trade-off.** Biome เร็วกว่า **5–20 เท่า** (Rust binary) และเป็นเครื่องมือเดียว
ในโปรเจกต์เล็กๆ ความต่างด้านความเร็วแทบไม่มีนัยสำคัญ — `pnpm exec lint-staged`
รันไม่ถึง 2 วินาที ถ้า lint time เริ่มเป็นปัญหา หรือ team ต้องการ moving part
น้อยลง การ migrate ไป Biome เป็น mechanical process (`biome migrate`)

**Where.** [.prettierrc](../.prettierrc), [eslint.config.js](../eslint.config.js),
[package.json](../package.json) block `lint-staged`

---

## 12. Zod สำหรับ response validation (เดิมใช้ AJV + JSON Schema)

**Decision.** ตรวจ response shape ผ่าน **Zod** schemas ใน
`src/services/<svc>/schemas.ts` แต่ละ schema คือ SINGLE SOURCE: types ของ
response data ถูก infer มาจาก schema (`z.infer`) ทำให้ schema กับ type ไม่มีทางแตกต่างกันได้
`BaseValidator.expectSchema` รัน `schema.safeParse` และแสดง failure ผ่าน
`z.prettifyError`

**Reversal note (2026-06-11).** Decision นี้เดิมเลือก AJV + hand-written JSON
Schema เมื่อทบทวนโค้ดจริง เหตุผลของ AJV สองในสามข้อไม่ได้ใช้จริงที่นี่:

- ประโยชน์ด้าน **"interoperable format"** เป็นแค่ทฤษฎี hand-written schema
  ถูกใช้เฉพาะใน `*Validator` ของตัวเอง ไม่มีอะไร export ออกไปสู่ contract
  registry, Postman, หรือ faker เลย backend อ่าน **OpenAPI spec** ไม่ใช่ schema
  ของ test repo ทิศทาง interop ที่สมเหตุสมผลคือ spec → repo (generate types)
  ไม่ใช่ repo → backend
- **Performance** ไม่มีความหมายสำหรับ test suite ที่ validate response ไม่กี่ร้อยตัว
  ต่อ run (ต่างกันระดับ µs)

สิ่งที่เหลืออยู่คือ trade-off ที่จ่ายทุกวัน: **maintain JSON Schema ใน `schemas.ts`
AND interface คู่ขนานใน `types.ts` ด้วยมือ** Zod รวบมาเป็น source เดียวผ่าน
`z.infer` พร้อม DX ที่ดีกว่า (refinements, discriminated unions) และ failure formatter
ที่อ่านง่าย เรายอมรับว่าเสีย direct spec→schema path; ถ้าต้องการ spec-driven
generation ใน future `openapi-zod-client` / `ts-to-zod` รองรับได้

**Conventions.**

- Envelope ใช้ `z.looseObject` (ไม่ใช่ `z.object`) เพื่อให้ infra field
  แปลกๆ (`requestId` เป็นต้น) และ **field ที่หลุดมา** ถูก KEEP ไว้ใน parsed body
  — เหมือน semantics `additionalProperties: true` ของ JSON Schema เดิม
  ซึ่ง load-bearing: `z.object` แบบ strip จะซ่อน leak จริงๆ ไว้
- Const catalogs และ **request** types ยังคงเขียนด้วยมือใน `types.ts`
  เฉพาะ **response data** types เท่านั้นที่ infer
- Schema ที่ตั้งใจ shallow อาจเก็บ hand-written type ที่ละเอียดกว่าไว้
  (schema validate shape บน, type document tree ทั้งหมดสำหรับ behavioral assertions)
  — ใช้แบบประหยัด
- `types.ts` ทำ `import type { … } from './schemas'`; `schemas.ts` import
  const catalogs จาก `types.ts` เป็น value การ import แบบ type-only จะถูก
  erase ตอน runtime จึง **ไม่มี import cycle**

**Where.** [src/core/BaseValidator.ts](../src/core/BaseValidator.ts),
`src/services/<svc>/schemas.ts` + `src/services/<svc>/types.ts`

---

## 13. `test.step()` (ไม่ใช่ `@step` decorator)

**Decision.** Multi-step flow test ใช้ `test.step()` ของ Playwright โดยตรง
ไม่ใช้ decorator library เช่น `allure-decorators`

**Reason.** Pattern `@step` decorator เกือบทั้งหมดมาจาก **Selenium/Java**
— มาจาก annotation `@Step` ของ Allure ใน Java และ mental model แบบ class-based POM
ของ JUnit/TestNG ทีมที่ย้ายมาจาก Selenium-Java หรือ .NET มักพา pattern นี้
มาด้วย แต่ JS/Playwright ไม่ต้องการมัน: function เป็น first-class และ string-label
argument คือ native equivalent ของ annotation

เหตุผลสามข้อที่เราหลีกเลี่ยง:

- **Decorator บังคับให้เขียน test แบบ class-based** ซึ่งขัดกับ model ของ
  Playwright ที่ใช้ fixture และ function — fixture inject เข้า class method
  ไม่ natural, `this`-binding สับสนใน async, parallelism ยุ่งยาก
- **TS decorator spec กำลังเปลี่ยน** (stage-3 TC39 ≠ flag `experimentalDecorators`
  ที่ library `@step` ส่วนใหญ่พึ่งอยู่) — เป็น maintenance liability หลายปี
- **อ่าน inline ง่ายกว่า** `await test.step('Create user', ...)` ใส่ label
  ไว้ตรงจุดที่ action เกิด ส่วน `@step('Create user')` เหนือ method ทำให้
  ต้องเลื่อนขึ้นไปอ่าน

`test.step()` ยังรวมเข้ากับ trace viewer, HTML report และ Allure tree ของ
Playwright โดยอัตโนมัติ — decorator library มักจะ hook เฉพาะ Allure เท่านั้น

**Rule of thumb.** เลือก idiom ของ tool ปัจจุบัน ไม่ใช่ idiom ของ tool เก่า

**Trade-off.** เพิ่มตัวอักษรเล็กน้อยต่อ step ถ้า verbosity เป็นปัญหา (พบน้อยมากใน
API test) ให้ใช้ helper function ก่อนที่จะหันไปใช้ decorator

**Where.** `tests/**/flows/*.spec.ts` ทั้งหมด

---

## 14. Husky (ไม่ใช่ lefthook / simple-git-hooks)

**Decision.** Husky v9 สำหรับ git hooks ตั้งค่าไว้ใน `.husky/`

**Reason.**

- **Default ใน TS/Node ecosystem** documentation, Stack Overflow, และ tutorial
  ของ third-party ต่างก็ assume Husky คนที่เคยทำงานกับ JS project ในช่วง 5 ปีที่ผ่านมา
  จะคุ้นเคยกับมัน
- **Zero-config ใน v9** แค่ shell script ใน `.husky/<hook>` — ไม่มี `huskyrc`
  ไม่มี `pre-commit` package wrapper
- **Portable** เป็น pure JS ทำงานได้บนทุก platform ที่ pnpm รันได้

**Trade-off.** **lefthook** เร็วกว่า (Go binary, parallel hooks) **simple-git-hooks**
มี dependency เป็นศูนย์ (~50 บรรทัด JS) Husky ไม่ได้เปรียบทั้งสองอย่าง — แต่เป็น
default ที่ contributor ใหม่คาดหวัง ถ้า hook runtime เริ่มเป็นปัญหา (ตอนนี้ pre-commit
ใช้เวลา <2s) ให้ switch ไป lefthook

**Where.** [.husky/](../.husky/),
[package.json](../package.json) script `prepare`

---

## 15. Allure 3 `awesome` (ไม่ใช่ classic Allure 2 / ไม่ใช่ custom dashboard)

**Decision.** Generate report ผ่าน `allure awesome` (Allure 3 UI) ไม่ใช่
classic Allure 2 HTML หรือ custom dashboard

**Reason.**

- **Three-level Behaviors tree** (epic → feature → story) ให้ QA/Dev drill down
  ได้ ส่วน classic Allure แบน
- **Trend ข้าม run** ผ่าน `--history-path allure-history.json` — ไฟล์เดียว
  ที่ commit ไว้ ทำงานได้ทั้ง local และ CI
- **Categories** จำแนก failure (schema / status / SLA / infra) ทำให้ triage
  scale ได้กับ test จำนวนมาก
- **Single binary** — `allure` npm package เดียวกันรองรับทั้ง `awesome` และ
  classic ไม่ต้อง install เพิ่ม

**Trade-off.** Custom dashboard (Grafana / Datadog / GH Pages แบบ custom HTML)
จะช่วยติดตาม metric ระดับ **organisation-wide** (cross-repo flakiness, SLA trends
ต่อ team) ได้ Allure เน้น per-run ถ้า org โตเกิน ~3 repo และต้องการ report ตัดข้าม
Allure จะกลายเป็นหนึ่งในหลาย source ไม่ใช่ source เดียว — แต่ยังไม่เป็นปัญหาในขนาดปัจจุบัน

**Where.** [package.json](../package.json) scripts `allure:*`,
[playwright.config.ts](../playwright.config.ts) reporter config

---

## 16. AOM client ต่อ service (ไม่ใช่ต่อ story / flow)

**Context.** Contributor ที่มาจาก BDD หรือ Selenium-Java มักคาดว่า client class
จะแยกตาม user story (เช่น `RegistrationClient`) template นี้ใช้แกนต่างกัน:
client หนึ่งตัวต่อ **service domain** (`UsersClient`)

**Decision.** Client abstraction อยู่ที่ระดับ service Stories / behaviors อยู่
หนึ่งชั้นขึ้นไป — ที่ test file:

- `@isolated` tests (`tests/<svc>/*.spec.ts`) ครอบคลุม per-endpoint contracts
- `@flow` tests (`tests/<svc>/flows/*.spec.ts`) ครอบคลุม multi-step single-service stories
- Cross-service stories compose หลาย service client ใน test body เดียว
  และติด tag ของทั้งสอง service

**Reason.**

- REST เป็น resource-oriented; client สะท้อนสิ่งนั้น มี source of truth หนึ่งที่ต่อ
  endpoint ไม่ใช่สำเนาห้าชุดของ `POST /users` กระจายอยู่ใน story client
- Stories ทับซ้อนกันระหว่าง service (checkout ใช้ users + orders) แต่ resource
  domain ไม่ทับกัน การเลือก axis ที่ orthogonal กว่าทำให้ refactor ปลอดภัยกว่า
- Client = HTTP surface (the _what_) Test = behavior (the _when / why_)
  ผสมกันจะทำให้ client กลายเป็น god-object ที่โตตามทุก story ใหม่
- สอดคล้องกับ official guidance ของ Playwright และ convention ของ JS/TypeScript ecosystem

**Trade-off.** Complex multi-step flow ต้องอยู่ใน test body และต้องเชื่อม
client หลายตัวเอง ถ้า flow เดียวกันปรากฏใน 3+ test ให้ abstract เป็น helper
ที่ **compose** service client ที่มีอยู่แล้ว — ไม่ใช่สร้าง client ใหม่ที่ reimplement endpoint

**Related.** §13 ("เลือก idiom ของ tool ปัจจุบัน") — เหตุผลเดียวกัน: AOM-per-service
คือ idiom แบบ Playwright/JS native; per-story client class เป็น carry-over
จาก framework ที่ story มี class ของตัวเอง

**Where.** [src/services/](../src/services/) — หนึ่ง folder ต่อ service
[tests/](../tests/) — หนึ่ง folder ต่อ service

---

## 17. Reference data ที่ deterministic seed ไว้ + ใช้เป็น code constants (ไม่ใช่ env) (2026-06-06)

**Context.** Test บางครั้งต้องการ **reference data** ฝั่ง server ที่ suite ไม่ควร
สร้างต่อ test — เช่น role/permission catalog: test ที่ต้องการ "role สิทธิ์ต่ำกว่า
อีกตัว" ไม่สามารถ provision ได้ on the fly เมื่อ role management เป็น admin feature
นอก scope ของ suite

**Decision.** Reference data ถูก **seed เข้าแต่ละ environment โดย script** ที่มี
source of truth เป็นไฟล์ committed matrix (ไฟล์เดียว review เหมือน code) Test
ใช้ identifier ที่ seed ไว้เป็น **constants ในโค้ด** — **ห้ามใช้ env var** identifier
เหล่านี้ไม่ใช่ secret และ deterministic (seed เหมือนกันทุก env) จึงควรอยู่ในโค้ด
การ env-gate ทำให้ env drift ได้

**Reason.** สาม failure mode ที่ decision นี้กำจัด:

- _Env drift_ — identifier ที่อยู่ใน `.env.<env>` อาจต่างกันแต่ละ env; constant
  - identical seeding ทำไม่ได้
- _Hidden coupling_ — reviewer เห็นชัดเจนว่า test depend กับ reference data
  ไหนโดยอ่านโค้ด ไม่ต้อง diff env file
- _Blocked coverage_ — "ไม่มี role ที่สอง" ไม่ใช่เหตุผลที่ test รันไม่ได้อีกต่อไป
  seed script ทำให้ precondition มีจริงทุก env รวมถึง env ใหม่

**Boundary.** ใช้กับ reference data ที่ test **อ่านเท่านั้น ไม่ mutate** สิ่งที่ test
mutate ต้อง provision ต่อ test/worker แทน — seeding mutable state จะทำให้
parallel test coupling กัน

**Where.** GoRest ไม่มี reference data แบบ role/permission ที่ต้อง seed (และไม่มี admin
API) ดังนั้น template นี้จึงไม่มี live seed script — รูปแบบของ pattern คือ:
`scripts/<matrix>.ts` (source of truth ที่ commit) +
`scripts/seed-*.ts` (idempotent apply เรียกจาก global-setup ด้วย) พร้อม constants
ใน `tests/<svc>/helpers.ts` ให้นำ pair นี้กลับมาเมื่อ API มี reference data

---

## 18. Response time: two-tier soft-target + hard-ceiling (ไม่ใช่ SLA เดียว) (2026-06-12)

**Context.** ทุก request เคยรัน hard SLA เดียว (`MAX_RESPONSE_MS=5000`) ใน
`BaseClient` ทำให้ functional contract test **FAIL** เมื่อ response ช้าเกิน 5s
ใน shared test environment เกิด false red ซ้ำซาก: endpoint ที่ไม่เกี่ยวกันเลย
breach 7–14s ทุก run ทั้งที่ functional assertion ถูกทุกอย่าง นั่นคือ latency
jitter ไม่ใช่ defect — แต่ทำให้ regression gate แดง และทำลายความน่าเชื่อถือของ suite

**Decision.** แบ่ง budget เป็นสองชั้น (`ApiConfig.responseTargetMs` +
`responseCeilingMs`, env `RESPONSE_TARGET_MS` / `RESPONSE_CEILING_MS`):

- `ms > ceiling` → **hard fail** — response นั้นถือว่า hang; functional test ควรพัง
- `target < ms <= ceiling` → **soft warn** — step `⚠ Slow response` ที่ไม่ fail ใน
  report ทำให้ latency ยังมองเห็นได้โดยไม่ทำให้ test ที่ถูกต้อง red
- `ms <= target` → ไม่มีอะไร (ไม่มี report node เหมือนเดิม)

`RESPONSE_TARGET_MS=5000`, `RESPONSE_CEILING_MS=15000` ในทุก env
Provisioning config ตั้ง tier ทั้งสองเป็น 30s เพื่อให้ setup latency ไม่ warn ไม่ fail

**Reason.** ISTQB แยก functional testing จาก non-functional testing; การผูก
latency threshold กับ functional pass/fail ปนสองอย่างนี้เข้าด้วยกัน การเช็ค
single-sample ต่อ request เป็น performance signal ที่แย่อยู่แล้ว (ไม่มี percentile,
ไม่มี warmup exclusion — GC pause เดียวก็ trip ได้) งานที่ honest ของมันที่นี่คือ
จับ true hang เท่านั้น การ keep measurement ไว้ (warn) รักษา latency signal
สำหรับ triage โดยไม่ทำให้มันเป็น gate

**Trade-off.** Latency regression จริงที่ sustained อยู่ในช่วง 5–15s จะเห็นเป็นแค่
warning ไม่ใช่ failure — ยอมรับได้เพราะ performance coverage จริงๆ ควรอยู่ใน
dedicated multi-sample perf check (tag แยก รันกับ env ที่ stable) ไม่ควร
piggyback ไปกับทุก contract call

**Where.** [src/core/types.ts](../src/core/types.ts) (`ApiConfig`),
[src/config/api-config.ts](../src/config/api-config.ts) (โหลดทั้งสอง, fallback
legacy `MAX_RESPONSE_MS` สำหรับ target),
[src/core/BaseValidator.ts](../src/core/BaseValidator.ts)
(`expectResponseTime` soft/hard), `.env.*` (`RESPONSE_TARGET_MS` /
`RESPONSE_CEILING_MS`)

---

## 19. pnpm ผ่าน Corepack (ไม่ใช่ npm / yarn / global install)

**Context.** โปรเจคต้องการ package manager หนึ่งตัวที่ทุกคน + CI ใช้เวอร์ชัน
เดียวกัน lockfile รูปแบบเดียว ถ้าปล่อยให้บางคนใช้ npm บางคนใช้ pnpm คนละ
เวอร์ชัน → lockfile ขัดกัน, "works on my machine", phantom dependency

**Decision.** ใช้ **pnpm** โดย pin เวอร์ชันไว้ใน `package.json`
(`"packageManager": "pnpm@10.18.0"`) และให้ **Corepack** (ติดมากับ Node แล้ว)
เป็นคนเรียกเวอร์ชันที่ pin ให้อัตโนมัติ — setup คือ `corepack enable` ครั้งเดียว
**ไม่** ใช้ `npm install -g pnpm` (global install ทำให้เวอร์ชันลอยจากที่ pin ไว้)

**Reason.**

- _pnpm vs npm_ — pnpm ใช้ content-addressable store + symlink → ลงเร็วกว่า,
  ใช้ disk น้อยกว่า, และ strict กว่า (เข้าถึงได้เฉพาะ dependency ที่ประกาศไว้
  จริง → จับ phantom dependency ที่ npm ปล่อยผ่าน)
- _Corepack vs global install_ — `packageManager` field + Corepack การันตีว่า
  ทุกเครื่องและ CI ใช้ pnpm **เวอร์ชันเป๊ะเดียวกัน** โดยไม่ต้องลงเอง การ
  `npm i -g pnpm` ได้เวอร์ชันล่าสุดเสมอ ซึ่งอาจไม่ตรงกับที่ทดสอบไว้

**Trade-off.** Corepack ไม่ใช่ของบังคับ — ใครมี pnpm อยู่แล้ว (วิธีใดก็ตาม)
`pnpm install` ก็ทำงานเลย Corepack แค่เป็นทางที่การันตีว่าได้เวอร์ชันตรงที่ pin ไว้
จะพังก็ต่อเมื่อเครื่องไม่มี pnpm เลย **และ** ไม่ได้เปิด Corepack — แก้ด้วยการเขียน
prerequisite ให้ชัดใน README/CONTRIBUTING ว่าเลือกทางไหนก็ได้

**Where.** [package.json](../package.json) (`packageManager`, `engines.pnpm`),
[.nvmrc](../.nvmrc) (Node version), [README.md](../README.md) +
[CONTRIBUTING.md](../CONTRIBUTING.md) (Prerequisites)

---

## วิธีเพิ่ม decision ใหม่

เมื่อคุณตัดสินใจอะไรที่ตัวเองในอนาคต (หรือ contributor ใหม่) อาจตั้งคำถาม:

1. เพิ่ม section ในไฟล์นี้ด้วย template เดิม: Context / Decision / Reason /
   Trade-off / Where
2. ใส่วันที่ถ้าเกี่ยวกับ constraint ที่มีเวลาจำกัด
   ("ณ 2026-05 API ทำ X")
3. Link จาก code ที่เกี่ยวข้องด้วย comment หนึ่งบรรทัด:
   `// see docs/decisions.md §N`
4. ถ้า decision ล้าสมัยแล้ว ให้ mark section นั้นว่า **SUPERSEDED** พร้อม link
   ไปยัง section ใหม่ — อย่าลบออก เพราะตัวเองในอนาคตต้องการ history นั้น
