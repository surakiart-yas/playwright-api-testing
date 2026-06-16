# Traceability

## โครงสร้าง

```
docs/test-plans/<resource>.md  ←  source of truth ของ TC
tests/*.spec.ts                ←  code ต้องตรงกับ TC ใน doc
```

แต่ละ resource มีไฟล์เดียว เช่น `docs/test-plans/users.md` — ไม่มี 07/08 แยก

## กฎเมื่อมีการเปลี่ยนแปลง

| เปลี่ยนอะไร             | ต้องอัปเดตด้วย                             |
| ----------------------- | ------------------------------------------ |
| เพิ่ม TC ในโค้ด         | เพิ่มแถวใน `docs/test-plans/<resource>.md` |
| เปลี่ยน expected ของ TC | อัปเดตคอลัมน์ Expected ในไฟล์ doc ด้วย     |
| ลบ TC                   | ลบแถวออกจากไฟล์ doc ด้วย                   |

## ตรวจสอบ

```bash
pnpm check:consistency
```

Script ตรวจว่า TC-ID ที่อยู่ในโค้ด (`allure.label.tc: 'TC-xxx'`) มีอยู่ใน test-plan doc ด้วย
รันหลังทุกครั้งที่แก้ไข test plan หรือ spec file
