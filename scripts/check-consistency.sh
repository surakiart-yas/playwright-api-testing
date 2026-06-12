#!/usr/bin/env bash
# Deterministic test-plan consistency check (no agents, ~free).
# Catches the *mechanical* drift class: code <-> 07 <-> 08-rtm TC-id sets, duplicate TC-ids,
# and unsanctioned @tags. Semantic drift (stale prose, wrong expected) is out of scope — that
# is what a rare manual/agent review is for. See .claude/rules/traceability.md.
#
# Usage: pnpm check:consistency   (exit 1 on any issue → CI/pre-commit gate)
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
fail=0

# feature : tests dir : test-plan docs dir
# Add a row when a service gains a test-design artifact set (07-test-cases.md + 08-rtm.md).
# Services WITHOUT a docs dir (e.g. orders) simply don't use TC-ID annotations in code.
FEATURES=(
  "products:tests/products:docs/examples/products"
)

# real TC identities = `description: 'TC-xxx'` (literal) OR `tc: 'TC-xxx'` (data-driven arrays).
code_tcs() { grep -rhoE "(description|tc): '(TC-[0-9]+)'" "$1" 2>/dev/null | grep -oE "TC-[0-9]+"; }

echo "== code <-> 07-test-cases <-> 08-rtm (per feature) =="
for entry in "${FEATURES[@]}"; do
  IFS=: read -r name td dd <<<"$entry"
  code=$(code_tcs "$td" | sort -u)
  [ -z "$code" ] && { echo "  - $name: no code TCs yet (skip)"; continue; }
  c07=$(grep -oE 'TC-[0-9]+' "$dd/07-test-cases.md" 2>/dev/null | sort -u)
  rtm=$(grep -oE 'TC-[0-9]+' "$dd/08-rtm.md" 2>/dev/null | sort -u)
  miss07=$(comm -23 <(echo "$code") <(echo "$c07") | tr '\n' ' ')
  missrtm=$(comm -23 <(echo "$code") <(echo "$rtm") | tr '\n' ' ')
  dup=$(code_tcs "$td" | sort | uniq -d | tr '\n' ' ')
  if [ -n "${miss07// }" ] || [ -n "${missrtm// }" ] || [ -n "${dup// }" ]; then
    fail=1
    echo "  X $name:"
    [ -n "${miss07// }" ]  && echo "      in code, MISSING from 07:     $miss07"
    [ -n "${missrtm// }" ] && echo "      in code, MISSING from 08-rtm: $missrtm"
    [ -n "${dup// }" ]     && echo "      DUPLICATE TC-id in code:      $dup"
  else
    echo "  OK $name ($(echo "$code" | grep -c TC) TCs traced to 07 + 08-rtm)"
  fi
done

echo "== tag taxonomy (only @tags inside test \`tag: [...]\` arrays) =="
# allowed = the documented suites (testing.md). Add new @<service> tags here when a service is added.
ALLOWED='@isolated|@flow|@smoke|@regression|@products|@orders'
bad=$(grep -rhoE "tag: \[[^]]*\]" tests/ 2>/dev/null | grep -oE "@[a-z-]+" | sort -u | grep -vE "^(${ALLOWED})$" || true)
if [ -n "${bad// }" ]; then
  fail=1
  echo "  X unsanctioned @tag(s) not in testing.md: $(echo "$bad" | tr '\n' ' ')"
else
  echo "  OK no unsanctioned @tags"
fi

echo
if [ "$fail" = 0 ]; then
  echo "consistency OK"
else
  echo "consistency issues found (see above). 07-test-cases.md is the source of truth; sync 08-rtm + 07 counts in the same change."
  exit 1
fi
