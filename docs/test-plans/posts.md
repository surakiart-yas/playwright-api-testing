# Posts

**Endpoint:** `GET /posts/{id}` · `DELETE /posts/{id}` · `GET/POST /users/{user_id}/posts`

**Fields:**

- `user_id` — integer (กำหนดผ่าน endpoint path ตอน create)
- `title` — string (required)
- `body` — string (required)

**Auth:** write operations ต้องมี token → 401 ถ้าไม่ใส่

**Error format:**

- 401/404 → `{ "message": "..." }`
- 422 → array `[{ "field": "...", "message": "..." }]`

**Cross-resource:** post nested ใต้ user — provisioner ต้องสร้าง user ก่อนเสมอ (ดู `tests/posts/provisioner.ts`)

---

## Test cases

| TC     | สิ่งที่ test        | Request                             | Expected                            |
| ------ | ------------------- | ----------------------------------- | ----------------------------------- |
| TC-101 | list posts ของ user | GET /users/{id}/posts               | 200, ทุก item `user_id` ตรงกับ user |
| TC-102 | สร้าง post ถูกต้อง  | POST /users/{id}/posts (title+body) | 201 + resource                      |
| TC-103 | ขาด title           | POST /users/{id}/posts (body only)  | 422 field `title` "can't be blank"  |
| TC-104 | ไม่มี token         | POST /users/{id}/posts (no auth)    | 401 "Authentication failed"         |
| TC-105 | id ที่ไม่มีอยู่     | GET /posts/999999999                | 404 "Resource not found"            |
| TC-110 | CRUD flow           | create → get → delete → verify gone | แต่ละขั้นผ่าน, หลัง delete → 404    |

---

## หมายเหตุการทดสอบ

- POST ไม่มี token → 401 (เหมือน users POST) แต่ PATCH/DELETE ไม่มี token GoRest คืน 404
- ลบ user → posts หายตาม (cascade) — แต่ provisioner ลบ post ก่อน user เพื่อความชัดเจน
