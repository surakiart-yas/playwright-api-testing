import type { ApiConfig } from '@core/types'

// Default endpoint = the bundled mock (mock/server.ts, auto-started by Playwright's
// webServer) so a fresh clone runs offline with zero configuration. Set BASE_URL in
// .env.<TEST_ENV> to target a real API — never commit a real host.
const MOCK_BASE_URL = 'http://localhost:8787'

/**
 * Loads infrastructure config from environment variables.
 *
 * Auth-token precedence (highest wins):
 *   1. A token minted by the service's own fixture / provisioner at runtime
 *   2. `undefined` — provisioning-dependent tests skip (see `tests/<svc>/fixtures.ts`)
 */
// ADAPT: add/remove required env vars for your project. If your API must never fall back
// to a default endpoint, make BASE_URL required again (throw when unset).
export function loadApiConfig(): ApiConfig {
  const baseUrl = process.env.BASE_URL ?? MOCK_BASE_URL

  // Two-tier response budget. RESPONSE_TARGET_MS (soft, warn) + RESPONSE_CEILING_MS (hard, fail).
  // RESPONSE_TARGET_MS falls back to the legacy MAX_RESPONSE_MS so old env files keep working; the
  // ceiling defaults well above it so only a true hang fails a functional test (see docs/decisions.md §20).
  const targetMs = parseInt(
    process.env.RESPONSE_TARGET_MS ?? process.env.MAX_RESPONSE_MS ?? '5000',
    10,
  )
  const ceilingMs = parseInt(process.env.RESPONSE_CEILING_MS ?? '15000', 10)

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    responseTargetMs: targetMs,
    // Guard against a misconfigured ceiling below the target (would make every warn a hard fail).
    responseCeilingMs: Math.max(ceilingMs, targetMs),
  }
}
