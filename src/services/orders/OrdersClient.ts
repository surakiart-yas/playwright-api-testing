import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test'
import { BaseClient } from '@core/BaseClient'
import type { ApiConfig } from '@core/types'
import type { CreateOrderRequest, OrderData } from './types'

/** AOM client for the orders domain — minimal second exemplar (see products for the
 *  fully-commented reference). Orders depend on products via `productId`. */
export class OrdersClient extends BaseClient {
  constructor(config: ApiConfig, request: APIRequestContext, testInfo?: TestInfo) {
    super(config, request, testInfo)
  }

  async createOrder(body: CreateOrderRequest | Record<string, unknown>): Promise<APIResponse> {
    return this.post<OrderData>('orders', body, undefined, 'Create Order')
  }

  async getOrder(id: string): Promise<APIResponse> {
    return this.get<OrderData>(`orders/${id}`, undefined, undefined, 'Get Order')
  }

  async deleteOrder(id: string): Promise<APIResponse> {
    return this.del<Record<string, never>>(`orders/${id}`, undefined, 'Delete Order')
  }
}
