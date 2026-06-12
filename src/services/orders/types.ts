// Orders domain types — /orders (depends on products: an order references a productId).
// Contract source: docs/openapi/openapi(products).yaml (orders section)
//
// Intentionally MINIMAL — the full reference shape lives in src/services/products/.
// Request types + const catalogs are hand-written; response data types are inferred
// from the Zod schemas (single source) — see `schemas.ts`.
import type { z } from 'zod'
import type { orderData } from './schemas'

export interface CreateOrderRequest {
  productId: string
  quantity: number
}

export type OrderData = z.infer<typeof orderData>

export const OrderCode = {
  SUCCESS: 'OK',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_DATA: 'INVALID_DATA',
  NOT_FOUND: 'NOT_FOUND',
} as const

export type OrderCodeValue = (typeof OrderCode)[keyof typeof OrderCode]

export const OrderError = {
  VALIDATION_FAILED: 'validation_failed',
  INVALID_DATA: 'invalid_data',
  NOT_FOUND: 'not_found',
} as const

export type OrderErrorValue = (typeof OrderError)[keyof typeof OrderError]
