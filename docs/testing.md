# Testing

## Strategy

### Isolated vs Flow

| ประเภท      | ใช้เมื่อ                                           | ไฟล์              |
| ----------- | -------------------------------------------------- | ----------------- |
| `@isolated` | test endpoint เดียว — แต่ละ test อ่านได้ด้วยตัวเอง | `*.spec.ts`       |
| `@flow`     | หลาย step ต่อกัน ต้องอาศัย state จาก step ก่อนหน้า | `flows/*.spec.ts` |

เริ่มจาก isolated เสมอ — flow เพิ่มเมื่อ isolated พิสูจน์ไม่ได้ว่า resource ถูกสร้างจริงและ link ถูกต้อง

### Scope Tags

| Tag           | ใช้เมื่อ                               |
| ------------- | -------------------------------------- |
| `@smoke`      | happy path สำคัญ — ควรผ่านก่อน deploy  |
| `@regression` | ทุก test ที่ผ่านได้แน่นอน — gate ใน CI |
| _(ไม่มี tag)_ | test ที่ยังมี bug / RED-by-design      |

`@smoke ⊂ @regression ⊂ all`

## Organization

```
tests/
├── fixtures.ts          # extends base.ts, wire clients
├── helpers.ts           # token gate, config helpers
├── provisioner.ts       # runtime data setup + cleanup
├── create.spec.ts       # @isolated — POST contract
├── list.spec.ts         # @isolated — GET list contract
├── get-by-id.spec.ts    # @isolated — GET error cases
└── flows/
    └── crud.spec.ts     # @flow — full lifecycle
```

เมื่อเพิ่ม resource ใหม่ให้เพิ่มไฟล์ spec ใน `tests/` (flat ใน `tests/` ไม่ต้อง subfolder ต่อ resource)

## CI

```bash
pnpm test:smoke       # pre-deploy gate
pnpm test:regression  # CI gate
pnpm test:debug       # verbose HTTP logging
pnpm report           # open HTML report
pnpm allure           # open Allure report
```

GitHub Actions (`.github/workflows/pr-gate.yml`) รัน lint + type-check + check:consistency + test:regression ทุก PR

### GoRest เป็น shared public DB

- Record ของคนอื่นอยู่ในระบบด้วย — ห้าม assert จำนวนที่แน่นอนใน list
- GoRest reset ทุก 24 ชั่วโมง แต่ teardown ของเราลบ record เองอยู่แล้ว
- Token หมดอายุ → tests skip อัตโนมัติ (ไม่ fail)
