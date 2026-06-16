# Testing

## Tags

| Tag           | ประเภท  | ใช้เมื่อ                                                                      |
| ------------- | ------- | ----------------------------------------------------------------------------- |
| `@<svc>`      | service | ทุก test — ระบุ resource เช่น `@users` (→ Allure epic) ใส่ที่ `test.describe` |
| `@isolated`   | type    | test endpoint เดียว                                                           |
| `@flow`       | type    | test หลาย step ต่อกัน                                                         |
| `@smoke`      | scope   | happy path สำคัญ — gate ก่อน deploy                                           |
| `@regression` | scope   | ทุก test ที่ผ่านได้แน่นอน — CI gate                                           |

**Hierarchy:** `@smoke ⊂ @regression ⊂ all`
**Service tag:** ทุก test ต้องมี `@<svc>` หนึ่งตัว (Allure epic) — เพิ่ม service ใหม่ต้องเพิ่มใน `ALLOWED` ของ `scripts/check-consistency.sh`

## กฎการเขียน test

- Happy path + critical → ใส่ `@smoke` (ได้ `@regression` ด้วยอัตโนมัติ)
- API มี bug → assert ตาม contract จริง ปล่อยให้ test RED อย่าลด assertion ให้ผ่าน ไม่ใส่ `@regression`
- ไม่มี conditional assertion — ใช้ `test.fixme` สำหรับ bug ใน code เรา / `test.skip` สำหรับ dependency ที่ไม่พร้อม
- ทุก resource ที่สร้างต้องตั้งชื่อด้วย `autotestSlug()` จาก `@utils/test-data`

## Assertion style

Two-layer:

1. **Structural** (validator) — HTTP status, Zod schema
2. **Behavioral** (inline) — ค่า field ที่ test นั้นมีอยู่เพื่อพิสูจน์

```typescript
// ✅ multi-field ใช้ toMatchObject — เห็น diff ทีเดียว
await GoRestUsersValidator.expectUserSuccess(res, HttpStatus.CREATED)
expect(await res.json()).toMatchObject({ name: slug, status: 'active' })

// ❌ หลาย toBe — ซ่อน failure หลังตัวแรก
expect(json.name).toBe(slug)
expect(json.status).toBe('active')
```

## ชื่อ test

- Isolated: `test('should <verb> <object> [<condition>]')`
- Flow: `test('<Subject> flow: <step> → <step> → ...')`
- Negative: ขึ้นต้นด้วย `should reject` หรือ `should return <status>`
- Step ใน flow: imperative `'Create user'` ไม่ใช่ `'should create user'`

## Layout ไฟล์

```
tests/
├── helpers.ts              # shared: gorestConfig, TOKEN gate
└── users/                  # resource subfolder
    ├── fixtures.ts         # extends base.ts, wire UsersClient + UsersProvisioner
    ├── provisioner.ts      # runtime data setup + cleanup
    ├── create.spec.ts      # @isolated
    ├── list.spec.ts        # @isolated
    ├── get-by-id.spec.ts   # @isolated error cases
    └── flows/
        └── crud.spec.ts    # @flow
```

เมื่อเพิ่ม resource ใหม่ให้เพิ่ม subfolder ใหม่ เช่น `tests/posts/`, `tests/comments/`
