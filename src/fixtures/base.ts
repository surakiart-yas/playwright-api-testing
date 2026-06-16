import { test as base } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { loadApiConfig } from '@config/api-config'
import { loadEnv } from '@utils/env'
import { applyAllureFromTags } from '@utils/allure-meta'
import type { ApiConfig } from '@core/types'

loadEnv()

type TestFixtures = {
  apiConfig: ApiConfig
  _allureMeta: void
}

type WorkerFixtures = {
  workerRequest: APIRequestContext
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Shared, pre-warmed APIRequestContext — one per worker. Auth is NOT attached here;
  // each service fixture provides its own token when the API needs one (see
  // tests/users/fixtures.ts for the wiring reference).
  workerRequest: [
    async ({ playwright }, use) => {
      const config = loadApiConfig()
      const ctx = await playwright.request.newContext({
        baseURL: config.baseUrl,
        extraHTTPHeaders: { 'Content-Type': 'application/json', Accept: 'application/json' },
      })
      await use(ctx)
      await ctx.dispose()
    },
    { scope: 'worker' },
  ],

  apiConfig: async ({}, use) => {
    await use(loadApiConfig())
  },

  _allureMeta: [
    async ({}, use, testInfo) => {
      await applyAllureFromTags(testInfo)
      await use()
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
