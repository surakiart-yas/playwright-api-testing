import { defineConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

const env = process.env.TEST_ENV ?? 'local'
dotenv.config({ path: path.resolve(process.cwd(), `.env.${env}`) })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Test-suite version (package.json) → surfaced in the Allure report metadata so every run records
// which suite version produced it, alongside the environment + node version.
const testVersion = (
  JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')) as {
    version: string
  }
).version

// Default = the bundled mock, so `pnpm test` is green on a fresh clone with no env file,
// no secrets and no network (docs/decisions.md §10/§15). Point BASE_URL at a real API via
// .env.<TEST_ENV> to leave the mock out — never commit a real host.
const MOCK_URL = 'http://localhost:8787'
const baseURL = process.env.BASE_URL ?? MOCK_URL
const useMock = baseURL.startsWith(MOCK_URL)

function discoverProjects(): { name: string; testDir: string }[] {
  const testsDir = path.resolve(__dirname, 'tests')
  if (!fs.existsSync(testsDir)) return [{ name: 'api', testDir: './tests' }]
  return fs
    .readdirSync(testsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name, testDir: `./tests/${d.name}` }))
}

const parsedWorkers = process.env.WORKERS ? Number(process.env.WORKERS) : NaN

export default defineConfig({
  globalSetup: './src/setup/global-setup.ts',
  globalTeardown: './src/setup/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: Number.isFinite(parsedWorkers) && parsedWorkers > 0 ? parsedWorkers : undefined,
  reporter: [
    process.env.CI ? ['github'] : ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    [
      'allure-playwright',
      {
        outputFolder: 'allure-results',
        // false → drop the full spec-file path from the Suites breadcrumb
        // (products › POST /products > Negative Testing › <test>), so it doesn't
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
  projects: discoverProjects(),
  // Boot the bundled mock only when the run targets it (BASE_URL unset or pointing at the
  // mock). External environments never start it. reuseExistingServer lets a manually-run
  // `pnpm mock:start` (debugging) be reused locally; CI always starts fresh.
  webServer: useMock
    ? {
        command: 'pnpm mock:start',
        url: `${MOCK_URL}/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      }
    : undefined,
})
