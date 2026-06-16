# Todos

**Endpoint:** `GET/PATCH/DELETE /todos/{id}` · `GET/POST /users/{user_id}/todos`

**Fields:**

- `user_id` — integer (กำหนดผ่าน endpoint path)
- `title` — string (required)
- `status` — `pending` | `completed` (required)
- `due_on` — ISO date string (optional, GoRest คืน `null` ถ้าไม่ได้ตั้ง)

**Auth:** write operations ต้องมี token → 401 ถ้าไม่ใส่

**Error format:**

- 401/404 → `{ "message": "..." }`
- 422 → array `[{ "field": "...", "message": "..." }]`

**Cross-resource:** todo nested ใต้ user — provisioner สร้าง user ก่อน (ดู `tests/todos/provisioner.ts`)

---

## Test cases

| TC     | สิ่งที่ test        | Request                                  | Expected                                     |
| ------ | ------------------- | ---------------------------------------- | -------------------------------------------- |
| TC-301 | list todos ของ user | GET /users/{id}/todos                    | 200, ทุก item `user_id` ตรงกับ user          |
| TC-302 | สร้าง todo ถูกต้อง  | POST /users/{id}/todos (title+status)    | 201 + resource                               |
| TC-303 | ขาด title           | POST /users/{id}/todos (status only)     | 422 field `title` "can't be blank"           |
| TC-304 | status ไม่ถูกต้อง   | POST (status: "done")                    | 422 field `status` "...pending or completed" |
| TC-305 | ไม่มี token         | POST /users/{id}/todos (no auth)         | 401 "Authentication failed"                  |
| TC-310 | CRUD flow           | create → complete → delete → verify gone | แต่ละขั้นผ่าน, หลัง delete → 404             |

---

## หมายเหตุการทดสอบ

- PATCH `{ status: "completed" }` → 200 + status อัปเดต (ใช้ใน flow)
- `due_on` เป็น optional — schema ต้องรับ `null` ได้ (`z.string().nullable()`)
