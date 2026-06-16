import { randomAlphanumericCode } from './random'

/**
 * Prefix applied to every resource created by automation. The global teardown
 * (`src/setup/global-teardown.ts`) deletes any resource whose name starts with
 * this value, so it must be distinctive enough to never collide with real data.
 *
 * Change this in one place to rename the convention everywhere.
 */
export const TEST_PREFIX = 'autotest-'

/**
 * Generate a unique slug for test resources. Always starts with `TEST_PREFIX`.
 *
 * @example
 *   autotestSlug()          // "autotest-aBc12XyZ"
 *   autotestSlug('paging')  // "autotest-paging-aBc12XyZ"
 */
export function autotestSlug(descriptor?: string): string {
  const code = randomAlphanumericCode(8)
  return descriptor ? `${TEST_PREFIX}${descriptor}-${code}` : `${TEST_PREFIX}${code}`
}

/**
 * Hyphen-free variant for fields whose contract forbids the hyphenated `autotestSlug()`
 * (e.g. an alphanumeric-only username with a tight length limit). Keeps an `autotest`
 * marker so test records stay recognisable in the DB; cleanup is then by tracked id in
 * the provisioner (not the name-prefix sweep).
 *
 * @example autotestUsername() // "autotestaBc12XyZ" (16 chars, unique)
 */
export function autotestUsername(): string {
  return `autotest${randomAlphanumericCode(8)}`
}
