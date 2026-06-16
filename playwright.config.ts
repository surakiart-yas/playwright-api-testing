import { defineConfig } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

const env = process.env.TEST_ENV ?? 'local'
// quiet: true ปิด tip banner ของ dotenv v17 (◇ injected env … tip: …)
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`), quiet: true })
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

// Test-suite version (package.json) → surfaced in the Allure report metadata so every run records
// which suite version produced it, alongside the environment + node version.
const testVersion = (
  JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')) as {
    version: string
  }
).version

// Default = the GoRest public practice API. Point BASE_URL at another env via .env.<TEST_ENV>
// when testing a different target. Never commit a company-internal host.
const GOREST_URL = 'https://gorest.co.in/public/v2'
const baseURL = process.env.BASE_URL ?? GOREST_URL

const parsedWorkers = process.env.WORKERS ? Number(process.env.WORKERS) : NaN

export default defineConfig({
  globalSetup: './src/setup/global-setup.ts',
  globalTeardown: './src/setup/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // GoRest เป็น shared public API — cap ไว้ที่ 2 เพื่อไม่กด rate limit
  // เพิ่มได้โดยตั้ง env: WORKERS=4 pnpm test
  workers: Number.isFinite(parsedWorkers) && parsedWorkers > 0 ? parsedWorkers : 2,
  reporter: [
    process.env.CI ? ['github'] : ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    [
      'allure-playwright',
      {
        outputFolder: 'allure-results',
        // false → drop the full spec-file path from the Suites breadcrumb
        // (Users › POST /users > Contract Tests › <test>), so it doesn't
        // truncate to "a..." in single-column view. The file:line is still shown in the
        // test-detail header. subSuite (describe blocks) is unaffected.
        suiteTitle: false,
        environmentInfo: {
          Test_Version: `v${testVersion}`,
          Environment: process.env.TEST_ENV ?? 'local',
          Base_URL: baseURL,
          Node_Version: process.version,
        },
        categories: [
          {
            // BaseValidator.expectSchema throws: "Schema validation failed:\n<zod errors>\n\nReceived:\n..."
            name: 'Schema Validation Failures',
            messageRegex: '.*Schema validation failed.*',
            matchedStatuses: ['failed'],
          },
          {
            // BaseValidator.expectStatus throws: "Expected HTTP <n>, got <n>"
            name: 'Unexpected HTTP Status',
            messageRegex: '.*Expected HTTP \\d+.*',
            matchedStatuses: ['failed'],
          },
          {
            // BaseValidator.expectResponseTime hard tier throws: "...exceeded the hang ceiling of <n>ms..."
            name: 'Response-Time Ceiling Violations',
            messageRegex: '.*exceeded the hang ceiling.*',
            matchedStatuses: ['failed'],
          },
          {
            // Network/infra errors: ECONNREFUSED, timeout, webServer startup failure
            name: 'Test Infrastructure Errors',
            messageRegex: '.*ECONNREFUSED.*|.*connect ETIMEDOUT.*|.*webServer.*|.*spawn.*ENOENT.*',
            matchedStatuses: ['failed', 'broken'],
          },
        ],
      },
    ],
  ],
  use: {
    baseURL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    trace: 'on-first-retry',
  },
  testDir: './tests',
})
