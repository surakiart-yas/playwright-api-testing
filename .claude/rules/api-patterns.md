# API Patterns

## Response Envelope (GoRest)

GoRest คืน resource โดยตรง — ไม่มี wrapper envelope:

- **Success** → bare object หรือ array เช่น `{ id, name, email, gender, status }`
- **422** → array `[{ field: string, message: string }]`
- **401 / 404** → `{ message: string }`

สร้าง Zod schema ใน `src/services/<svc>/schemas.ts` ต่อ resource:

```typescript
export const UserSchema = z.looseObject({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  gender: z.enum(['male', 'female']),
  status: z.enum(['active', 'inactive']),
})
export type User = z.infer<typeof UserSchema>
```

- **ใช้ `z.looseObject` ไม่ใช่ `z.object`** — เก็บ field แปลกๆ ที่ API แอบส่งมาไว้ ไม่ตัดทิ้ง
- **Schema คือ single source of truth** — infer type ด้วย `z.infer` ไม่เขียน interface ซ้ำ
- Assert HTTP status ก่อน schema เสมอ

## BaseClient

`request` และ `testInfo` inject ผ่าน constructor — ไม่ใส่เป็น parameter ของแต่ละ method:

```typescript
// ✅ ถูก
async getUser(id: number) {
  return this.get<User>(`users/${id}`)
}

// ❌ ผิด
async getUser(request: APIRequestContext, id: number) { ... }
```

- Auth headers → override `getAuthHeaders()` ใน subclass
- Response-time check เกิดอัตโนมัติหลังทุก request

## BaseValidator

```typescript
// ✅ ถูก — เรียกแบบ static เสมอ
await BaseValidator.expectSchema(res, UsersSchemas.user)

// ❌ ผิด
await this.expectSchema(res, UsersSchemas.user)
```

## Test Data

- ทุก resource ที่สร้างต้องใช้ `autotestSlug()` จาก `@utils/test-data` เพื่อให้ cleanup หาเจอ
- Email ต้องไม่ซ้ำ — ใส่ slug ลงไปด้วยเสมอ

```typescript
// ✅ ถูก
import { autotestSlug } from '@utils/test-data'
const slug = autotestSlug()
await usersClient.createUser({ name: slug, email: `${slug}@example.com`, ... })

// ❌ ผิด — hardcode prefix
const name = `AutoTest_${randomAlphanumericCode(8)}`
```
