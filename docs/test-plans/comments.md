# Comments

**Endpoint:** `GET /comments/{id}` · `DELETE /comments/{id}` · `GET/POST /posts/{post_id}/comments`

**Fields:**

- `post_id` — integer (กำหนดผ่าน endpoint path)
- `name` — string (required, ชื่อผู้ comment)
- `email` — string (required)
- `body` — string (required)

**Auth:** write operations ต้องมี token → 401 ถ้าไม่ใส่

**Error format:**

- 401/404 → `{ "message": "..." }`
- 422 → array `[{ "field": "...", "message": "..." }]`

**Cross-resource:** comment ต้อง chain `user → post → comment` — provisioner ลึกสุดในเทมเพลต (ดู `tests/comments/provisioner.ts`)

---

## Test cases

| TC     | สิ่งที่ test           | Request                                     | Expected                            |
| ------ | ---------------------- | ------------------------------------------- | ----------------------------------- |
| TC-201 | list comments ของ post | GET /posts/{id}/comments                    | 200, ทุก item `post_id` ตรงกับ post |
| TC-202 | สร้าง comment ถูกต้อง  | POST /posts/{id}/comments (name+email+body) | 201 + resource                      |
| TC-203 | ขาด body               | POST /posts/{id}/comments (name+email)      | 422 field `body` "can't be blank"   |
| TC-204 | ไม่มี token            | POST /posts/{id}/comments (no auth)         | 401 "Authentication failed"         |
| TC-210 | CRUD flow              | create → get → delete → verify gone         | แต่ละขั้นผ่าน, หลัง delete → 404    |

---

## หมายเหตุการทดสอบ

- provisioner ต้องสร้าง user ก่อน → post → แล้วถึง comment (chain 3 ชั้น)
- cleanup ลบย้อนลำดับ: comment → post → user
