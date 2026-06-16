#!/usr/bin/env bash
# ตรวจ TC-ID ใน code ว่ามีอยู่ใน test-plan docs ด้วยหรือเปล่า
# Usage: pnpm check:consistency   (exit 1 เมื่อมีปัญหา)
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
fail=0

# feature : tests-dir : test-plan-file
# เพิ่มแถวเมื่อ resource มี TC-ID annotations ใน code และมี test-plan .md
FEATURES=(
  "users:tests/users:docs/test-plans/users.md"
  "posts:tests/posts:docs/test-plans/posts.md"
  "comments:tests/comments:docs/test-plans/comments.md"
  "todos:tests/todos:docs/test-plans/todos.md"
)

code_tcs() { grep -rhoE "(description|tc): '(TC-[0-9]+)'" "$1" 2>/dev/null | grep -oE "TC-[0-9]+"; }

echo "== TC-IDs: code <-> test-plan =="
for entry in "${FEATURES[@]}"; do
  IFS=: read -r name td docfile <<<"$entry"
  code=$(code_tcs "$td" | sort -u)
  [ -z "$code" ] && { echo "  - $name: ยังไม่มี TC-ID ใน code (skip)"; continue; }
  plan=$(grep -oE 'TC-[0-9]+' "$docfile" 2>/dev/null | sort -u)
  missing=$(comm -23 <(echo "$code") <(echo "$plan") | tr '\n' ' ')
  dup=$(code_tcs "$td" | sort | uniq -d | tr '\n' ' ')
  if [ -n "${missing// }" ] || [ -n "${dup// }" ]; then
    fail=1
    echo "  X $name:"
    [ -n "${missing// }" ] && echo "      ใน code แต่ไม่มีใน $docfile: $missing"
    [ -n "${dup// }" ]     && echo "      TC-ID ซ้ำใน code: $dup"
  else
    echo "  OK $name ($(echo "$code" | grep -c TC) TCs)"
  fi
done

echo "== tag taxonomy =="
ALLOWED='@isolated|@flow|@smoke|@regression|@users|@posts|@comments|@todos'
bad=$(grep -rhoE "tag: \[[^]]*\]" tests/ 2>/dev/null | grep -oE "@[a-z-]+" | sort -u | grep -vE "^(${ALLOWED})$" || true)
if [ -n "${bad// }" ]; then
  fail=1
  echo "  X tag ที่ไม่ได้อยู่ใน testing.md: $(echo "$bad" | tr '\n' ' ')"
else
  echo "  OK ไม่มี tag ที่ไม่ได้กำหนด"
fi

echo
if [ "$fail" = 0 ]; then
  echo "consistency OK"
else
  echo "พบปัญหา — ดูด้านบน"
  exit 1
fi
