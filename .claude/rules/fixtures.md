# Fixtures

## Fixture Scopes

| Fixture            | Scope  | Purpose                                      |
| ------------------ | ------ | -------------------------------------------- |
| `workerRequest`    | worker | Shared `APIRequestContext` — pre-warmed TCP  |
| `apiConfig`        | test   | Loaded from env vars                         |
| `usersClient`      | test   | Wired ใน `tests/users/fixtures.ts`           |
| `usersProvisioner` | worker | สร้าง/recycle test data; cleanup ใน teardown |

## Credentials

- ห้าม hardcode credentials ในโค้ด
- Token อยู่ใน env var `GOREST_TOKEN` เท่านั้น
- Fixture auto-skip เมื่อ token ไม่ได้ตั้งค่า — test ไม่ fail

## Provisioning

Test ต้องสร้าง resource เองตอน runtime ไม่ seed ข้อมูลตายตัวใน env:

- **recycle** — READ-ONLY tests ใช้ `getSubjectUser()` (worker-cached)
- **disposable** — tests ที่ mutate ใช้ `createDisposableUser()` แล้วลบทิ้งใน teardown
- **cleanup** — worker teardown (`provisioner.cleanup()`) ลบทุก id ที่ provisioner track ไว้
- **test ที่สร้าง resource เองตรงๆ** (เพื่อ assert การ create เช่น TC-005) ลบ inline ตอนจบ
  - เรียก `provisioner.track(id)` เป็นตาข่ายกันตก เผื่อ assertion ก่อนหน้า fail
- **ชื่อต้องขึ้นต้นด้วย `autotest-`** เสมอ — ใช้ `autotestSlug()` จาก `@utils/test-data`
- ไม่มี global prefix-sweep — leak ที่หลุดทั้งสองทางพึ่ง GoRest reset ทุก 24 ชม. เป็น backstop

ดูตัวอย่างจริง: `tests/users/provisioner.ts`
