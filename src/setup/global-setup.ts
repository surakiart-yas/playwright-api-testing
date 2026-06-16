import { loadEnv } from '@utils/env'

/**
 * Global setup — runs once before the whole test run.
 *
 * Tests provision their own preconditions at runtime (see tests/users/provisioner.ts),
 * so there is no shared login or token to set up here. Add a block here only for state
 * that is genuinely global and deterministic (reference data every worker needs and no
 * test mutates) — see docs/decisions.md §17 for the seeded-reference-data pattern.
 */
export default async function globalSetup(): Promise<void> {
  loadEnv()
  console.log('[setup] tests provision their own preconditions at runtime')
}
