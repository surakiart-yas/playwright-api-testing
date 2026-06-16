import { test, expect, type APIResponse } from '@playwright/test'
import { z } from 'zod'
import type { ErrorDataEntry } from './types'

export class BaseValidator {
  /**
   * Group a validator helper's STRUCTURAL assertions (HTTP status + schema + business code)
   * under one collapsible `Verify: ...` report node, so the test body reads as
   * `<call> → Verify: <expectation>` instead of three sibling assert lines per call.
   * Boxed: a pass is one green line; a failure attributes to the node and opens with the diff.
   * Behavioral expects (field values) stay in the test body — they are the test's point and
   * must stand out on their own. Outside a running test (ops scripts) runs un-stepped.
   */
  protected static async verify<T>(name: string, fn: () => Promise<T>): Promise<T> {
    try {
      test.info()
    } catch {
      return fn()
    }
    return test.step(`Verify: ${name}`, fn, { box: true })
  }

  static expectStatus(res: APIResponse, expected: number): void {
    expect(res.status(), `Expected HTTP ${expected}, got ${res.status()}`).toBe(expected)
  }

  /**
   * Assert the parsed error envelope's `errorData` CONTAINS each expected field-error, matched as
   * an order-independent SUBSET (extra entries the API also reports are allowed). Proves a
   * `VALIDATION_FAILED` / `INVALID_DATA` rejection flagged the RIGHT field(s) for the RIGHT
   * reason — e.g. an empty body must report every required field, not just return a generic
   * validation code. Only `field` + `reason` (+ optional `tag`) are matched, so unrelated entry
   * keys never make the check brittle.
   */
  static expectErrorData(errorData: unknown, expected: ErrorDataEntry[]): void {
    expect(
      Array.isArray(errorData) ? errorData : [],
      'errorData should contain the expected field error(s)',
    ).toEqual(
      expect.arrayContaining(
        expected.map((e) => expect.objectContaining({ ...e } as Record<string, unknown>)),
      ),
    )
  }

  /**
   * Validate a response body against a Zod schema. Returns the parsed body so callers
   * can run further assertions without re-parsing. The schema is the single source for
   * both validation AND the response types (see service `schemas.ts` + `z.infer` in
   * `types.ts`). Service envelopes use `z.looseObject` so unknown infra fields are KEPT
   * on the parsed body — field-absence assertions stay meaningful even if API adds fields.
   * The `T` generic documents the expected shape at each call site.
   */
  static async expectSchema<T = unknown>(res: APIResponse, schema: z.ZodType): Promise<T> {
    const json = await res.json()
    const result = schema.safeParse(json)
    if (!result.success) {
      throw new Error(
        `Schema validation failed:\n${z.prettifyError(result.error)}\n\nReceived:\n${JSON.stringify(json, null, 2)}`,
      )
    }
    return result.data as T
  }

  /**
   * Two-tier response-time guard (see docs/decisions.md). A quiet call (under target) adds no
   * report node — keeps the trace to one step + attachment per request.
   *
   * - `ms > ceilingMs` → HARD FAIL. The response is so slow it reads as a hang, not jitter; a
   *   functional contract test SHOULD break here.
   * - `targetMs < ms <= ceilingMs` → SOFT WARN. Emits a non-failing "Slow response" report step
   *   so the latency is visible, WITHOUT red'ing a functionally-correct test on shared-infra
   *   jitter (the failure mode that flaked the UAT runs: different endpoints slow each run).
   *
   * Async because the soft warn is a `test.step`; callers already `await` it. Safe outside a
   * running test (ops scripts) — the warn step is skipped, a real hang still throws via `expect`.
   */
  static async expectResponseTime(ms: number, targetMs: number, ceilingMs: number): Promise<void> {
    if (ms > ceilingMs) {
      expect(
        ms,
        `Response time ${ms}ms exceeded the hang ceiling of ${ceilingMs}ms (soft target ${targetMs}ms)`,
      ).toBeLessThanOrEqual(ceilingMs)
      return
    }
    if (ms > targetMs) {
      let inTest = true
      try {
        test.info()
      } catch {
        inTest = false
      }
      if (inTest) {
        await test.step(
          `⚠ Slow response: ${ms}ms over the ${targetMs}ms target (under ${ceilingMs}ms hang ceiling — not failed)`,
          async () => {},
          { box: true },
        )
      }
    }
  }
}
