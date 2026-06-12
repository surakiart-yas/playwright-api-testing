import { test, type TestInfo } from '@playwright/test'
import { maskSensitive } from './logging'

export interface ApiInteraction {
  request: { method: string; url: string; headers: Record<string, string>; body?: unknown }
  response: { status: number; responseMs: number; body: unknown }
}

export async function attachApiInteraction(
  testInfo: TestInfo,
  name: string,
  interaction: ApiInteraction,
): Promise<void> {
  await testInfo.attach(name, {
    contentType: 'application/json',
    body: Buffer.from(JSON.stringify(interaction, null, 2)),
  })
}

/**
 * Record that a test reused a worker-cached precondition (a shared role, an ACTIVE/INACTIVE subject,
 * etc.) instead of re-provisioning it. Provisioning runs once per worker and caches the subject, so on
 * a cache hit there is no HTTP call to attach and the test report would otherwise show nothing about
 * the subject it acted on. This emits a boxed `Precondition: reuse <label> (cached)` step + attaches
 * the subject's identity so every test report stays self-contained (Allure debugging). No network I/O.
 * Sensitive fields (password / token) are masked, honouring MASK_SECRETS like every other attachment.
 * Safe to call from anywhere inside a running test; a no-op if there is no active TestInfo.
 */
export async function attachReusedSubject(label: string, subject: unknown): Promise<void> {
  await test.step(
    `Precondition: reuse ${label} (cached)`,
    async () => {
      let testInfo: TestInfo | undefined
      try {
        testInfo = test.info()
      } catch {
        testInfo = undefined
      }
      await testInfo?.attach(`${label} (cached)`, {
        contentType: 'application/json',
        body: Buffer.from(JSON.stringify(maskSensitive(subject), null, 2)),
      })
    },
    { box: true },
  )
}
