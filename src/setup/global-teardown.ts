import { loadEnv } from '@utils/env'

/**
 * Global teardown — runs once after the whole test run.
 *
 * Test-data cleanup is handled per feature, not here: each service's worker-scoped
 * provisioner removes what it created (see tests/products/provisioner.ts — matched by
 * the `autotest-` prefix). Add a block here only for a service that creates data a
 * worker fixture cannot reliably remove (e.g. cross-worker orphans).
 */
export default async function globalTeardown(): Promise<void> {
  loadEnv()
  console.log(
    '[teardown] features self-clean (see tests/products/provisioner.ts) — no global cleanup configured',
  )
}
