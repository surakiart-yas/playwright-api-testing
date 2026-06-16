import type { ApiConfig } from '@core/types'

// Default = GoRest public practice API. Override via BASE_URL in .env.<TEST_ENV>.
// ADAPT: replace with your own API base URL, or make BASE_URL required (throw when unset).
const DEFAULT_BASE_URL = 'https://gorest.co.in/public/v2'

/**
 * Loads infrastructure config from environment variables.
 *
 * Auth-token precedence (highest wins):
 *   1. A token minted by the service's own fixture / provisioner at runtime
 *   2. `undefined` — provisioning-dependent tests skip (see `tests/<svc>/fixtures.ts`)
 */
export function loadApiConfig(): ApiConfig {
  const baseUrl = process.env.BASE_URL ?? DEFAULT_BASE_URL

  // Two-tier response budget. RESPONSE_TARGET_MS (soft, warn) + RESPONSE_CEILING_MS (hard, fail).
  // RESPONSE_TARGET_MS falls back to the legacy MAX_RESPONSE_MS so old env files keep working; the
  // ceiling defaults well above it so only a true hang fails a functional test (see docs/decisions.md §18).
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
