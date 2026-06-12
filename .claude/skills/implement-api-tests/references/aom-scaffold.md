# AOM scaffold — contract to `src/services/<svc>/`

Build the service layer from the OpenAPI contract. Read the spec first; the envelope and
the error-code table drive every schema and validator. The products service is the template:
`src/services/products/{types,schemas,ProductsClient,ProductsValidator}.ts`.

## Step 1 — Harvest the contract with jq

Set `F` to the spec, then pull what you need (for a YAML spec, convert once with
`yq -o=json` or use `yq` directly with the same paths).

```bash
F='docs/openapi/openapi(products).json'

# Paths for the service + method + summary
jq -r '.paths | to_entries[] | select(.key|test("<svc>";"i")) | .key as $p
  | (.value|to_entries[] | "\($p) [\(.key|ascii_upcase)] \(.value.summary // "-")")' "$F"

# Per endpoint: request body schema + response statuses
jq -c '.paths["/<svc>/<op>"].post.requestBody.content["application/json"].schema' "$F"
jq -r '.paths["/<svc>/<op>"].post.responses | keys[]' "$F"

# The gold: every response example's code / error / message (success AND error envelopes)
jq -r '.paths["/<svc>/<op>"].post.responses | to_entries[] | .key as $st
  | (.value.content["application/json"].examples // {} | to_entries[]
     | "\($st) | \(.key) | code=\(.value.value.code) | error=\(.value.value.error // "-")")' "$F"

# Shared error examples often $ref into another path — resolve them
jq -r '.paths["/<svc>/<op>"].get.responses | to_entries[] | .key as $st
  | (.value.content["application/json"].examples // {} | to_entries[]
     | "\($st) \(.key) code=\(.value.value.code) error=\(.value.value.error)")' "$F"
```

Produce one artifact before coding: a table of `code -> error -> http -> meaning`. The
products one looks like `VALIDATION_FAILED validation_failed 400`, `DUPLICATE duplicate
409`, `NOT_FOUND not_found 404`, ... `OK success`. Put these in `types.ts` as named
constants. (Numeric catalogs — `1001 unauthorized 401`, `0000 success` — are common in
real APIs; same pattern.)

## Step 2 — Decide the envelope (the #1 gotcha)

Never assume the envelope — different orgs (and different services in one org) differ.
Confirm from the spec examples which envelope you have:

- **code-sentinel envelope (this template, many real APIs):** success is
  `{ code: 'OK' | '0000', message, requestId, data }` — there is NO `success` boolean.
  Errors are `{ code, error, message, errorData }`. Build bespoke schemas (copy
  `src/services/products/schemas.ts`).
- **boolean envelope:** `{ data, message, success: true }`. Same scaffold, different
  literal — the validator asserts `success === true` instead of a code.

When unsure, the example bodies in the spec settle it.

## Step 3 — Write the four files (in this order)

`types.ts` → `schemas.ts` → `Client.ts` → `Validator.ts`. Each imports the previous.

### `types.ts`

Request/response interfaces + `const` enums + the code/error catalog. Pattern:

```typescript
export interface CreateXRequest {
  /* required fields from the request schema */
}
export const XStatus = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' } as const
export type XStatusValue = (typeof XStatus)[keyof typeof XStatus]

// Single source for assertions — every code/error pair from Step 1.
export const XCode = { SUCCESS: 'OK', NOT_FOUND: 'NOT_FOUND' /* ... */ } as const
export const XError = { NOT_FOUND: 'not_found' /* ... */ } as const
```

Named constants beat string literals scattered across specs: one place to fix, readable
assertions (`XCode.DUPLICATE` not `'DUPLICATE'` scattered as a raw string).

### `schemas.ts`

A `successEnvelope(dataSchema)` helper locking `code` to the success sentinel, plus an
error schema.
Keep envelopes `additionalProperties: true` (infra adds `requestId` etc.); keep the data
shape as open as the spec actually is — if the OpenAPI `data` does not declare
`additionalProperties`, do NOT set `false` (you would reject a validly-extended response).
Enforce tight contracts (like "no refreshToken here") with an inline assertion in the
validator instead, where a wrong shape gives a readable failure. See
`src/services/products/schemas.ts` for the exact helper.

### `<Svc>Client.ts`

Extends `BaseClient`. One method per operation. `request` + `testInfo` are injected via
the constructor, never passed as method args. Pass a label (shows in logs/Allure):

```typescript
async createX(body: CreateXRequest): Promise<APIResponse> {
  return this.post<XData>('<svc>/create', body, undefined, 'Create X')
}
```

Public endpoints take no bearer; protected ones read the token from `config.authToken`
(supply it by constructing the client with `{ ...apiConfig, authToken }` — see
`tests/<svc>/helpers.ts`). Do not override `getAuthHeaders` unless the scheme differs.

### `<Svc>Validator.ts`

Extends `BaseValidator`, all methods `static`. Structural assertions only (HTTP status +
schema + the success/error envelope) — field values belong in the test, not here.

```typescript
static async expectXSuccess(res: APIResponse): Promise<void> {
  BaseValidator.expectStatus(res, HttpStatus.OK)
  const json = await BaseValidator.expectSchema<{ code: string }>(res, XSchemas.x)
  expect(json.code, 'business code should be OK').toBe(XCode.SUCCESS)
}

static async expectXError(res, httpStatus, code, error?): Promise<void> {
  BaseValidator.expectStatus(res, httpStatus)
  const json = await BaseValidator.expectSchema<{ code: string; error: string }>(res, XSchemas.error)
  expect(json.code).toBe(code)
  if (error) expect(json.error).toBe(error)
}
```

Always assert HTTP status before schema, so a 500 fails on status (clear) rather than on a
confusing schema mismatch.

## Step 4 — Register

Add a row to the Service Registry in `CLAUDE.md` and the `@<svc>` tag to the `ALLOWED`
list in `scripts/check-consistency.sh`. If the service is used only to provision another
feature's preconditions, say so in the `tests/` column.
