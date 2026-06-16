# Contributing

ก่อนเริ่ม อ่าน [`docs/decisions.md`](docs/decisions.md) — ทุก convention มีเหตุผลอยู่ที่นั่น

## Setup

```bash
nvm use           # pin Node version (.nvmrc) — ต้องการ Node 22+
corepack enable   # (ข้ามได้ถ้ามี pnpm แล้ว) ใช้ pnpm เวอร์ชันที่ pin ไว้ — ดู decisions §19
pnpm install      # install deps + Husky hooks
cp .env.example .env
# ใส่ GOREST_TOKEN ของคุณใน .env
pnpm test:regression  # CI gate — ควรผ่านทั้งหมด
```

ต้องการ token จาก [gorest.co.in](https://gorest.co.in) — สมัครฟรี token ที่หน้าเว็บ

## Common Workflows

### เพิ่ม resource ใหม่ (เช่น posts, comments, todos)

1. **สร้าง test plan ก่อนเสมอ** — เขียน `docs/test-plans/<resource>.md` ก่อนเขียนโค้ด
   ดูตัวอย่าง: `docs/test-plans/users.md`

2. **Scaffold service files** — copy `src/services/users/` และ adapt:

   | File                | Adapt                                         |
   | ------------------- | --------------------------------------------- |
   | `schemas.ts`        | Zod schemas per resource; types via `z.infer` |
   | `<Svc>Client.ts`    | HTTP methods extending `BaseClient`           |
   | `<Svc>Validator.ts` | `expect*Success` / `expect*Error` helpers     |

3. **Scaffold tests** — เพิ่มไฟล์ใน `tests/`:

   | File             | Adapt                                                                 |
   | ---------------- | --------------------------------------------------------------------- |
   | `fixtures.ts`    | Wire client + provisioner                                             |
   | `provisioner.ts` | สำหรับ resource ที่ต้อง setup ก่อน test                               |
   | `*.spec.ts`      | Test cases ตาม [`.claude/rules/testing.md`](.claude/rules/testing.md) |

4. **Register** — เพิ่มแถวใน Service Registry ของ [`CLAUDE.md`](CLAUDE.md)

### เพิ่ม endpoint ให้ service ที่มีอยู่แล้ว

แก้ไขตามลำดับนี้ — ข้ามลำดับจะ type error:

```
schemas.ts  →  <Svc>Client.ts  →  <Svc>Validator.ts  →  spec
```

## Conventions

| อะไร              | กฎ                                                                  |
| ----------------- | ------------------------------------------------------------------- |
| ชื่อ test data    | `autotestSlug()` เสมอ — ห้าม hardcode prefix                        |
| assert หลาย field | `expect(json).toMatchObject({...})` ไม่ใช่ multi-`toBe`             |
| Validators        | Structural (HTTP status + schema) — ไม่ใส่ field value ใน validator |
| Tests             | Behavioral (field values, business invariants)                      |
| Tags              | `@smoke ⊂ @regression ⊂ all` — ดู `.claude/rules/testing.md`        |
| API มี bug        | Assert contract, ปล่อยให้ test RED, ไม่ใส่ scope tags               |

Rules เต็ม:

- [`.claude/rules/testing.md`](.claude/rules/testing.md)
- [`.claude/rules/api-patterns.md`](.claude/rules/api-patterns.md)
- [`.claude/rules/fixtures.md`](.claude/rules/fixtures.md)

## Commits

ใช้ [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

types: feat | fix | docs | style | refactor | test | chore | perf | ci | revert | build
```

ตัวอย่าง:

```bash
git commit -m "feat(users): add PATCH endpoint client"
git commit -m "test(users): add TC-016 update name flow"
git commit -m "docs(test-plans): add todos test plan"
```

## Before you push

```bash
pnpm lint
pnpm type-check
pnpm check:consistency
pnpm test:regression
```

## เมื่อ pattern ใหม่เกิดขึ้น

1. อย่าประดิษฐ์ pattern ใหม่โดยไม่หารือ
2. เสนอเพิ่มใน [`docs/decisions.md`](docs/decisions.md) — Context, Decision, Reason, Trade-off
3. เมื่อ approve แล้ว update doc และ apply pattern
4. ถ้ากระทบการเขียน test ให้ update [`.claude/rules/testing.md`](.claude/rules/testing.md) ด้วย
