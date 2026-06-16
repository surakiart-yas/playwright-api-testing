import { epic, feature, story, layer, severity } from 'allure-js-commons'
import type { TestInfo } from '@playwright/test'

const STRUCTURAL_TAGS = new Set(['@isolated', '@flow', '@smoke', '@regression'])

/**
 * Auto-applied labels for every test (wired via `auto: true` fixture in base.ts).
 *
 * Behaviors tree in Allure (Service → Type → Endpoint — optimised for QA/Dev navigation):
 *   epic    ← @<service> tag (e.g. @users → "Users", @posts → "Posts")
 *                  Tests tagged with 2+ service tags → epic = "Cross-Service"
 *   feature ← @isolated → "Contract Tests"  |  @flow → "Business Flows"
 *   story   ← outermost `test.describe` title (e.g. "POST /users")
 *   (test)  ← leaf test title
 *
 * Rationale: QA and Dev navigate by service first, then drill into test type and
 * endpoint. Without the story level, all tests for one service land in a flat
 * list — you can't tell how many cover POST /users vs DELETE /users/:id.
 *
 * Cross-service tests (multiple service tags) get their own "Cross-Service" epic so
 * source location (tests/<svc>/flows/) matches report location — no first-tag-wins
 * surprise. (Forward-looking: this template ships ONE service, so it is not exercised
 * yet — it activates when a test carries 2+ service tags.) See docs/decisions.md §2.
 *
 * Layer (shown in test card sidebar):
 *   api ← always (this template is API-only)
 *
 * Severity:
 *   critical ← @smoke   |   normal ← @regression   |   minor ← untagged
 *
 * subSuite comes from the describe block(s). The spec-file path is intentionally NOT a
 * suite level (`suiteTitle: false` in playwright.config.ts) to keep the Suites breadcrumb
 * short — the file:line is shown in the test-detail header instead.
 */
export async function applyAllureFromTags(testInfo: TestInfo): Promise<void> {
  const tags = testInfo.tags

  const serviceTags = tags.filter((t) => !STRUCTURAL_TAGS.has(t))
  if (serviceTags.length >= 2) {
    // Tests touching multiple services → dedicated "Cross-Service" epic.
    // Mirrors `tests/flows/` folder location for source ↔ report alignment.
    await epic('Cross-Service')
  } else if (serviceTags[0]) {
    await epic(serviceTags[0].slice(1).replace(/^./, (c) => c.toUpperCase()))
  }

  if (tags.includes('@flow')) {
    await feature('Business Flows')
  } else if (tags.includes('@isolated')) {
    await feature('Contract Tests')
  }

  // titlePath structure: [file, ...describes, testTitle] — project name NOT included
  // length 2 → no describe (top-level flow test); length 3+ → index 1 is outermost describe
  if (testInfo.titlePath.length >= 3) {
    await story(testInfo.titlePath[1])
  }

  await layer('api')

  if (tags.includes('@smoke')) {
    await severity('critical')
  } else if (tags.includes('@regression')) {
    await severity('normal')
  } else {
    await severity('minor')
  }

  // TC-ID: the `allure.label.tc` annotation
  //   test('...', { annotation: [{ type: 'allure.label.tc', description: 'TC-001' }] }, fn)
  // is rendered by allure-playwright as a `tc` LABEL automatically (a plain `tc` type would
  // fall through to a redundant report STEP). The label already carries the TC-ID, so we do
  // NOT also set a description — it duplicated the Labels and hardcoded a single catalog path
  // that was wrong for any non-auth service.
}
