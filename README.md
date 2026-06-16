# API Automation Template

Playwright API-test framework สำหรับ [GoRest public practice API](https://gorest.co.in/)
— ออกแบบตามแนวทาง API Object Model (AOM), ใช้ Zod schemas, two-layer assertions,
runtime provisioning และ traceability ที่เชื่อมโยงตั้งแต่ requirement จนถึง spec ที่รันได้จริง

## Prerequisites

- **Node 22+** (ดู `.nvmrc`) — `nvm use` ถ้าใช้ nvm
- **pnpm** — ถ้ามีอยู่แล้ว (`pnpm -v`) ข้ามได้เลย ถ้ายังไม่มี เลือกทางใดทางหนึ่ง:

  ```bash
  corepack enable          # แนะนำ — มากับ Node, ใช้ pnpm เวอร์ชันที่ pin ไว้ใน package.json อัตโนมัติ
  # หรือ: brew install pnpm / npm i -g pnpm  (ได้เวอร์ชันล่าสุด อาจไม่ตรงที่ pin)
  ```

  ทำไม pnpm ไม่ใช่ npm + ทำไม Corepack ดีกว่า global install → [decisions §19](docs/decisions.md)

## Quick start

```bash
nvm use && pnpm install
# ตั้งค่า GOREST_TOKEN ใน .env (สมัครฟรีที่ https://gorest.co.in/consumer/login)
pnpm test        # รัน full suite — ถ้าไม่มี token test จะ skip อัตโนมัติ
```

## เริ่มต้นที่นี่

| ต้องการ…                                   | ไปที่                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| **ไม่รู้ว่า test / fixture / AOM คืออะไร** | [docs/concepts.md](docs/concepts.md) — primer ศัพท์พื้นฐาน อ่านก่อนเป็นอันดับแรก |
| **เรียนรู้ design ของ framework**          | [LEARNING-PATH.md](LEARNING-PATH.md) — 10 บทเรียน แต่ละบทผูกกับ ADR + โค้ดจริง   |
| ดู layer map ในหน้าเดียว                   | [docs/architecture.md](docs/architecture.md)                                     |
| เข้าใจว่าทำไม convention ถึงเป็นแบบนั้น    | [docs/decisions.md](docs/decisions.md) — **อ่านก่อนเปลี่ยน pattern ใดๆ**         |
| Contribute / เพิ่ม resource ใหม่           | [CONTRIBUTING.md](CONTRIBUTING.md)                                               |

## โครงสร้างภายใน

```
src/core/                 BaseClient, BaseValidator, types — framework ที่ไม่ผูกกับ domain ใด
src/services/<svc>/       AOM layer ต่อ resource: users · posts · comments · todos
src/fixtures/, src/utils/ wiring + infra (http, reporting, allure-meta, random…)
tests/                    isolated + flow specs, provisioner — skip เมื่อไม่มี GOREST_TOKEN
docs/test-plans/          requirements + test-case catalogs (users, posts, comments, todos)
docs/decisions.md         ADRs — เหตุผลเบื้องหลังการออกแบบ
.claude/rules/            กฎสำหรับ testing / api-patterns / fixtures / traceability
```

## แนวคิดหลัก (แต่ละข้อคือหนึ่งบทเรียน)

1. **AOM layering** — one client per service domain; test layer ประกอบ client หลายตัวเป็น story
2. **Schema = single source** — Zod validate response พร้อมกับ generate type ด้วย `z.infer`; `looseObject` ทำให้เห็น field แปลกที่ API แอบส่งมา
3. **Two-layer assertions** — validator ล็อก structure; test assert ค่าที่ test นั้นมีอยู่เพื่อพิสูจน์
4. **Provision, don't seed** — ทุก precondition สร้างตอน runtime, นำกลับมาใช้ได้, และลบทิ้งเมื่อเสร็จ
5. **Spec is truth** — assert ตาม contract ที่เขียนไว้; ถ้า API ทำผิด ปล่อยให้ test เป็น RED
6. **Traceability is mechanical** — `pnpm check:consistency` ตรวจ drift ระหว่าง catalog กับโค้ดใน CI

## คำสั่งที่ใช้บ่อย

```bash
pnpm test               # full suite
pnpm -s test            # full suite แบบ silent (ตัด pnpm script header ออก)
pnpm test:regression    # CI gate
pnpm test:smoke         # เฉพาะ critical paths
pnpm test:debug         # verbose HTTP logging (DEBUG_API=true — ดู request/response เต็ม)
pnpm test:report        # รัน + เปิด Allure report
pnpm verify             # lint + type-check + consistency + regression
```

## ตั้งค่า GoRest

GoRest คือ shared public practice API — account สร้างด้วย personal token และถูกลบทุก 24 ชั่วโมง
**write tests ทุกตัวต้องใช้ token; read tests ก็ skip ถ้าไม่มี token** เพื่อให้ผลลัพธ์ clean

```bash
# 1. ขอ token ฟรี: login ที่ https://gorest.co.in/consumer/login → API tokens
# 2. เพิ่มใน .env:  GOREST_TOKEN=<your token>
pnpm test
```

Resource ที่สร้างขึ้นจะมี prefix `autotest-` และถูกลบทิ้งทุกครั้งใน teardown

## Quality Gates

Husky hooks: `pre-commit` lint-staged · `commit-msg` commitlint (Conventional Commits) ·
`pre-push` type-check. CI: [PR gate](.github/workflows/pr-gate.yml) รันสิ่งเดียวกับที่รันในเครื่อง —
ดู [docs/testing.md](docs/testing.md) สำหรับ CI strategy
