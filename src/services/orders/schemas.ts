// Orders response-envelope schemas (Zod) — same envelope conventions as products
// (looseObject, code 'OK', single source for response types). See
// src/services/products/schemas.ts for the fully-commented reference.
import { z } from 'zod'

function successEnvelope<T extends z.ZodType>(data: T) {
  return z.looseObject({
    code: z.literal('OK'),
    message: z.string(),
    requestId: z.string().optional(),
    data,
  })
}

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

export const orderData = z.looseObject({
  id: z.string(),
  productId: z.string(),
  quantity: z.number().int(),
  total: z.number(),
  status: z.enum(['placed', 'cancelled']),
  createdAt: z.string(),
})

export const OrdersSchemas = {
  order: successEnvelope(orderData),
  emptyData: successEnvelope(z.looseObject({})),
  error: errorEnvelope,
}
