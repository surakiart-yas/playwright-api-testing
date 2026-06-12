// Products domain types — /products CRUD + status state machine.
// Contract source: docs/openapi/openapi(products).yaml
//
// Request types + const catalogs (ProductCode/ProductError/ProductStatus) are hand-written
// here. Response data types are INFERRED from the Zod schemas (single source) — see
// `schemas.ts`. The `import type` below is erased at runtime, so there is no import cycle
// even though `schemas.ts` imports `ProductStatus` from this file as a value.
import type { z } from 'zod'
import type { productData, productListData } from './schemas'

export interface CreateProductRequest {
  name: string
  sku: string
  price: number
  stock?: number
}

export interface UpdateProductRequest {
  name?: string
  price?: number
  stock?: number
}

// State machine: draft → published → archived (archived is terminal).
export const ProductStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const

export type ProductStatusValue = (typeof ProductStatus)[keyof typeof ProductStatus]

// Response data types — inferred from the schemas (single source, can't drift).
export type ProductData = z.infer<typeof productData>
export type ProductListData = z.infer<typeof productListData>

// Business `code` values from the response envelope. `OK` = success; everything else is
// an error code the FE maps to application flow. Single source for assertions.
export const ProductCode = {
  SUCCESS: 'OK',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_DATA: 'INVALID_DATA',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
} as const

export type ProductCodeValue = (typeof ProductCode)[keyof typeof ProductCode]

// `error` key (FE i18n mapping) paired with each non-success code.
export const ProductError = {
  VALIDATION_FAILED: 'validation_failed',
  INVALID_DATA: 'invalid_data',
  NOT_FOUND: 'not_found',
  DUPLICATE: 'duplicate',
  INVALID_TRANSITION: 'invalid_transition',
} as const

export type ProductErrorValue = (typeof ProductError)[keyof typeof ProductError]
