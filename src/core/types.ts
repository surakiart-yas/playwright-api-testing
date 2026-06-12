// ADAPT: add/remove fields to match your API's infrastructure config
export interface ApiConfig {
  baseUrl: string
  /**
   * Two-tier response-time budget (see BaseValidator.expectResponseTime + docs/decisions.md §20):
   * - `responseTargetMs` (soft): over this → a NON-failing "slow response" warning in the report.
   * - `responseCeilingMs` (hard): over this → the call FAILS (the response reads as a hang, not
   *   env jitter). Decoupled so a functional contract test is never red'd by a transient latency
   *   spike on shared infra, while a true hang still breaks. Provisioning sets both high so
   *   setup latency neither warns nor fails.
   */
  responseTargetMs: number
  responseCeilingMs: number
  authToken?: string
}

// ADAPT: change to match your API's response envelope shape.
// This template's envelope signals success with `code: 'OK'` — there is NO `success` boolean.
// Errors carry `{ code, error, message, errorData? }` instead (see the service schemas.ts).
// Many real APIs use a numeric sentinel (e.g. '0000') — adapt the literal, keep the pattern.
export interface ApiResponse<T = unknown> {
  code: string
  message: string
  data: T
  requestId?: string
}

export type EmptyResponse = ApiResponse<Record<string, never>>

/**
 * One entry in a validation error's `errorData` array (the per-field detail behind a
 * `VALIDATION_FAILED` / `INVALID_DATA` rejection). The shape is NOT uniform across error codes:
 *   - VALIDATION_FAILED required-field: `{ field, tag: 'body', reason: 'required' }`
 *   - INVALID_DATA invalid value:       `{ field, tag: 'invalid' }`  (no `reason` — `tag` carries it)
 * Only `field` is always present. Used as the `expectedErrorData` input to the
 * `*Validator.expect*Error` helpers to assert WHICH field(s) a rejection flagged — match on
 * `field` + whichever of `reason` / `tag` the error code actually uses (subset match).
 */
export interface ErrorDataEntry {
  field: string
  reason?: string
  tag?: string
}

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
} as const

export type HttpStatusValue = (typeof HttpStatus)[keyof typeof HttpStatus]
