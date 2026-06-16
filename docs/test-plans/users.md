# Users

**Endpoint:** `GET/POST /users` · `GET/PATCH/PUT/DELETE /users/{id}`

**Fields:**

- `name` — string (required)
- `email` — string (required, unique ทั้ง DB)
- `gender` — `male` | `female` (required)
- `status` — `active` | `inactive` (required)

**Auth:** ทุก write operation ต้องใส่ `Authorization: Bearer <token>` — ไม่ใส่ → 401

**Error format:**

- 401/404 → `{ "message": "..." }`
- 422 → array `[{ "field": "...", "message": "..." }]`

---

## Test cases

| TC     | สิ่งที่ test              | Request                              | Expected                                       |
| ------ | ------------------------- | ------------------------------------ | ---------------------------------------------- |
| TC-001 | list + จำกัด per_page     | GET /users?per_page=3                | 200, length ≤ 3                                |
| TC-002 | filter by status          | GET /users?status=inactive           | 200, ทุก item status = inactive                |
| TC-003 | get by id ที่มีอยู่       | GET /users/{id}                      | 200 + resource ตรง id                          |
| TC-004 | id ที่ไม่มีอยู่           | GET /users/999999999                 | 404 `{ message: "Resource not found" }`        |
| TC-005 | สร้าง user ถูกต้อง        | POST /users (body ครบ)               | 201 + resource กลับมา                          |
| TC-006 | ส่ง body เปล่า            | POST /users {}                       | 422 บอกทุก field ที่ขาด                        |
| TC-007 | email ซ้ำกับที่มีอยู่แล้ว | POST /users (email ซ้ำ)              | 422 `"has already been taken"`                 |
| TC-008 | ไม่มี token               | POST /users (no auth header)         | 401 `"Authentication failed"`                  |
| TC-009 | email format ผิด          | POST /users (email = "not-an-email") | 422 `"is invalid"`                             |
| TC-010 | update status             | PATCH /users/{id} {status}           | 200 + status อัปเดต                            |
| TC-011 | 🔴 update ไม่มี token     | PATCH /users/{id} (no auth)          | **ควร 401** — GoRest คืน 404 (ดู RED ด้านล่าง) |
| TC-012 | update id ที่ไม่มีอยู่    | PATCH /users/999999999               | 404 `{ message: "Resource not found" }`        |
| TC-013 | delete id ที่ไม่มีอยู่    | DELETE /users/999999999              | 404 `{ message: "Resource not found" }`        |
| TC-015 | CRUD flow ครบวงจร         | create → get → update → delete       | แต่ละขั้นผ่าน, หลัง delete → 404               |

### 🔴 TC-011 — RED-by-design (เคสตัวอย่างที่ตั้งใจให้ fail)

contract บอกว่า write ทุกตัวที่ไม่มี token → 401 (POST ทำตาม — TC-008) แต่ GoRest คืน **404**
สำหรับ PATCH/DELETE ที่ไม่มี token บน user ที่มีอยู่จริง (ซ่อน existence แทนที่จะบอกว่า unauthenticated)
test assert 401 ตาม contract แล้วปล่อยให้ RED — **ไม่ใส่ scope tag** จึงไม่บล็อก `pnpm test:regression`
แต่โผล่แดงใน `pnpm test` เต็ม (ดู `.claude/rules/testing.md` "Spec is the source of truth")

---

## หมายเหตุการทดสอบ

- GoRest เป็น shared DB — list response มี record ของคนอื่นด้วย อย่า assert จำนวนแน่นอน
- email ต้องไม่ซ้ำ ใช้ `autotestSlug()` เสมอ
- record ที่สร้างจะถูกลบใน teardown (provisioner) และ GoRest reset ทุก 24 ชม.
