import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test'
import { BaseClient } from '@core/BaseClient'
import type { ApiConfig } from '@core/types'
import type {
  CreateProductRequest,
  ProductData,
  ProductListData,
  UpdateProductRequest,
} from './types'

// A type alias (not an interface) so it stays assignable to BaseClient's query-param
// record — interfaces lack the implicit index signature.
export type ListProductsParams = {
  q?: string
  status?: string
  page?: number
  pageSize?: number
}

/**
 * AOM client for the products domain — one client per SERVICE, not per story
 * (docs/decisions.md §18). All endpoints are public in the exemplar; for a protected
 * API, pass a minted token via `config.authToken` (BaseClient adds the Bearer header).
 */
export class ProductsClient extends BaseClient {
  constructor(config: ApiConfig, request: APIRequestContext, testInfo?: TestInfo) {
    super(config, request, testInfo)
  }

  async createProduct(body: CreateProductRequest | Record<string, unknown>): Promise<APIResponse> {
    return this.post<ProductData>('products', body, undefined, 'Create Product')
  }

  async getProduct(id: string): Promise<APIResponse> {
    return this.get<ProductData>(`products/${id}`, undefined, undefined, 'Get Product')
  }

  async listProducts(params?: ListProductsParams): Promise<APIResponse> {
    return this.get<ProductListData>('products', params, undefined, 'List Products')
  }

  async updateProduct(
    id: string,
    body: UpdateProductRequest | Record<string, unknown>,
  ): Promise<APIResponse> {
    return this.patch<ProductData>(`products/${id}`, body, undefined, 'Update Product')
  }

  async deleteProduct(id: string): Promise<APIResponse> {
    return this.del<Record<string, never>>(`products/${id}`, undefined, 'Delete Product')
  }
}
