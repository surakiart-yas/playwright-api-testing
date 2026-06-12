#!/usr/bin/env bash
#
# Run one service's API tests locally — mirrors the runner dispatch inputs
# (service / scope / env / workers) so a local run matches what CI does.
#
# Usage:
#   scripts/run-service.sh <service> [scope] [env] [workers]
#   pnpm test:service <service> [scope] [env] [workers]
#
#   service : a folder under tests/ (products | orders | ...) or "all"
#   scope   : smoke | regression | all     (default: all)
#   env     : a TEST_ENV profile (.env.<env>) (default: local)
#   workers : positive integer             (default: playwright config)
#
# Examples:
#   scripts/run-service.sh products                  # all products tests, env=local (mock)
#   scripts/run-service.sh products smoke            # @smoke only
#   scripts/run-service.sh orders regression "" 4    # @regression, 4 workers
#   scripts/run-service.sh all                       # every service
#   REPORT=1 scripts/run-service.sh products smoke   # ...then generate+open Allure
#
# Notes:
#   - allure-results is cleaned first so the report reflects ONLY this run
#     (same as the `pretest` hook the plain `pnpm test` uses).
#   - The Allure report (REPORT=1) uses the same --group-by as CI so the local
#     tree matches the runner's (epic -> feature: Contract Tests / Business Flows).
#   - Exits with Playwright's exit code; the optional report still generates on
#     failure (like CI's `if: always()`).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SERVICE="${1:-}"
SCOPE="${2:-all}"
ENVIRONMENT="${3:-local}"
WORKERS="${4:-}"

# Discovered services = immediate subdirectories of tests/ (portable: no mapfile,
# works on the macOS stock bash 3.2).
SERVICES=()
for d in tests/*/; do
  [ -d "$d" ] && SERVICES+=("$(basename "$d")")
done

usage() {
  echo "Usage: scripts/run-service.sh <service> [scope] [env] [workers]"
  echo "  service : ${SERVICES[*]} | all"
  echo "  scope   : smoke | regression | all   (default: all)"
  echo "  env     : a TEST_ENV profile          (default: local)"
  echo "  workers : positive integer           (default: playwright config)"
}

if [ -z "$SERVICE" ]; then
  usage
  exit 1
fi

# Validate service against discovered projects.
if [ "$SERVICE" != "all" ]; then
  ok=0
  for s in "${SERVICES[@]}"; do [ "$s" = "$SERVICE" ] && ok=1; done
  if [ "$ok" -eq 0 ]; then
    echo "✗ Unknown service '$SERVICE'. Available: ${SERVICES[*]} | all"
    exit 1
  fi
fi

# Build the Playwright argument list.
ARGS=()
[ "$SERVICE" != "all" ] && ARGS+=(--project="$SERVICE")

case "$SCOPE" in
  smoke) ARGS+=(--grep "@smoke") ;;
  regression) ARGS+=(--grep "@regression") ;;
  all | "") ;;
  *) echo "✗ Unknown scope '$SCOPE' (smoke | regression | all)"; exit 1 ;;
esac

# Any TEST_ENV profile is allowed — it selects .env.<env> (see src/utils/env.ts).
[ -z "$ENVIRONMENT" ] && ENVIRONMENT="local"

if [ -n "$WORKERS" ]; then
  case "$WORKERS" in
    '' | *[!0-9]*) echo "✗ workers must be a positive integer, got '$WORKERS'"; exit 1 ;;
    *) ARGS+=(--workers="$WORKERS") ;;
  esac
fi

export TEST_ENV="$ENVIRONMENT"

echo "▶ service=$SERVICE  scope=$SCOPE  env=$ENVIRONMENT  workers=${WORKERS:-config}"
echo "  playwright test ${ARGS[*]}"

# Fresh report per run (mirror the `pretest` hook bypassed by calling playwright directly).
node -e "require('fs').rmSync('./allure-results',{recursive:true,force:true})"

RC=0
pnpm exec playwright test "${ARGS[@]}" || RC=$?

if [ "${REPORT:-}" = "1" ]; then
  echo "▶ generating Allure report (group-by epic,feature,story)"
  pnpm exec allure awesome allure-results -o allure-report \
    --name "API Test Report" --group-by "epic,feature,story" \
    --history-path allure-history.json || true
  pnpm exec allure open allure-report/awesome || true
fi

exit "$RC"
