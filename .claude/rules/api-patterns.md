# API Patterns

## Response Envelope

The template envelope signals success with `code: 'OK'` — there is NO `success` boolean:
`{ code, message, requestId, data }`. Errors carry `{ code, error, message, errorData }`.
(Many real APIs use a numeric sentinel like `'0000'` instead of `'OK'` — adapt the
literal, keep the pattern.)

- Build bespoke **Zod** schemas — copy `src/services/products/schemas.ts`. The success
  validator asserts `code === 'OK'`; the error validator asserts `code` + `error` (see
  `ProductsValidator`, `ProductCode` / `ProductError` in `products/types.ts`).
- Always assert HTTP status before schema.
- **The schema is the single source of truth for the shape.** Infer response data
  types from it with `z.infer` in `types.ts` — never hand-write a parallel interface
  (it drifts). Keep request types + const catalogs (`*Code` / `*Error` / enums)
  hand-written.
- **Use `z.looseObject`, not `z.object`, for envelopes and `data`** — it keeps unknown
  infra fields (and any leaked field) on the parsed body, matching the old
  `additionalProperties: true`. A stripping `z.object` would silently mask a leak that
  an absence/projection test must catch (see products TC-010, the `costPrice` leak).
- `types.ts` does `import type` from `schemas.ts`; `schemas.ts` imports the const
  catalogs from `types.ts` as values. The type-only import is erased at runtime → no
  import cycle.

> Rationale for Zod over AJV/JSON-Schema (single source, why `looseObject`, what we
> traded away): [docs/decisions.md §13](../../docs/decisions.md). The old template
> `@core/schemas` (`{ data, message, success: boolean }` envelope) was removed — no
> service ever used it.

## BaseClient Rules

`request` and `testInfo` are injected via constructor — never as method parameters:

```typescript
// ✅ Correct
async getProduct(id: string) {
  return this.get<ProductData>(`products/${id}`)
}

// ❌ Wrong — don't pass request as a parameter
async getProduct(request: APIRequestContext, id: string) { ... }
```

- Auth headers → override `getAuthHeaders()` in the subclass
- Optional per-call headers → last `headers` parameter
- The two-tier response-time check happens automatically after every request

## BaseValidator Rules

```typescript
// ✅ Correct — always static
await BaseValidator.expectSchema(res, ProductsSchemas.product)

// ❌ Wrong
await this.expectSchema(res, ProductsSchemas.product)
```

Always assert HTTP status before schema:

```typescript
expect(res.status()).toBe(200)
await BaseValidator.expectSchema(res, schema)
```

## Test Data

- Unique IDs/codes → `@utils/random` (`randomAlphanumericCode`) — never `Math.random()`
- Every created resource name must start with `TEST_PREFIX` (default `autotest-`) so cleanup can find it
- Use `autotestSlug()` from `@utils/test-data` — never hardcode the prefix string

```typescript
// ✅ Correct
import { autotestSlug } from '@utils/test-data'
const slug = autotestSlug()
await productsClient.createProduct({ name: slug, sku: `AT-${randomAlphanumericCode(10)}`, ... })

// ❌ Wrong — hardcoded prefix, fragile across renames
const name = `AutoTest_${randomAlphanumericCode(8)}`
```
