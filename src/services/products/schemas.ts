// Products response-envelope schemas (Zod).
//
// The envelope signals success with `code: 'OK'` (no `success` boolean); errors carry
// `code` + `error`. Envelopes AND `data` use `looseObject` so infra fields (requestId)
// and ANY LEAKED FIELD are kept on the parsed body without failing the contract — this
// is load-bearing: the list projection test asserts the internal `costPrice` key is
// ABSENT, and a stripping `z.object` would silently mask that leak (see
// .claude/rules/api-patterns.md + docs/decisions.md §13). These schemas are the SINGLE
// SOURCE: response types are inferred from them via `z.infer` in `types.ts`.
// Contract source: docs/openapi/openapi(products).yaml
import { z } from 'zod'
import { ProductStatus } from './types'

// Success envelope: code/message/data required. requestId is an infra field, optional + open.
// `data` shape is per-endpoint.
function successEnvelope<T extends z.ZodType>(data: T) {
  return z.looseObject({
    code: z.literal('OK'),
    message: z.string(),
    requestId: z.string().optional(),
    data,
  })
}

// Error envelope — code + error + message. No `data`, no `success` boolean.
// errorData locks the per-field error shape so a malformed entry is caught (field always
// present; reason/tag depend on the error code). See ErrorDataEntry in core/types.
const errorEnvelope = z.looseObject({
  code: z.string(),
  error: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
  errorData: z
    .array(
      z.looseObject({
        field: z.string(),
        tag: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .optional(),
})

export const productData = z.looseObject({
  id: z.string(),
  name: z.string(),
  sku: z.string(),
  price: z.number(),
  stock: z.number().int(),
  status: z.enum([ProductStatus.DRAFT, ProductStatus.PUBLISHED, ProductStatus.ARCHIVED]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const productListData = z.looseObject({
  items: z.array(productData),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})

export const ProductsSchemas = {
  product: successEnvelope(productData),
  list: successEnvelope(productListData),
  // delete returns `data: {}`
  emptyData: successEnvelope(z.looseObject({})),
  error: errorEnvelope,
}
