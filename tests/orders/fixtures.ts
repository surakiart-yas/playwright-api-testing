import { test as base, expect } from '@fixtures/base'
import { loadApiConfig } from '@config/api-config'
import { OrdersClient } from '@services/orders/OrdersClient'
import { OrdersValidator } from '@services/orders/OrdersValidator'
import { ProductsClient } from '@services/products/ProductsClient'
import { ProductsValidator } from '@services/products/ProductsValidator'
import { ProductsProvisioner } from '../products/provisioner'

export { expect, OrdersValidator, ProductsValidator }

type OrdersFixtures = {
  ordersClient: OrdersClient
  // Orders tests also drive the products API directly in cross-service flows.
  productsClient: ProductsClient
}

type OrdersWorkerFixtures = {
  // Every order needs an existing product — REUSE the products provisioner rather than
  // re-implementing product creation here (provision the dependency, don't duplicate it).
  productsProvisioner: ProductsProvisioner
}

export const test = base.extend<OrdersFixtures, OrdersWorkerFixtures>({
  ordersClient: async ({ apiConfig, workerRequest }, use, testInfo) => {
    await use(new OrdersClient(apiConfig, workerRequest, testInfo))
  },

  productsClient: async ({ apiConfig, workerRequest }, use, testInfo) => {
    await use(new ProductsClient(apiConfig, workerRequest, testInfo))
  },

  productsProvisioner: [
    async ({ workerRequest }, use) => {
      const provisioner = new ProductsProvisioner(loadApiConfig(), workerRequest)
      await use(provisioner)
      await provisioner.cleanup()
    },
    { scope: 'worker' },
  ],
})
