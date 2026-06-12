import { test as base, expect } from '@fixtures/base'
import { loadApiConfig } from '@config/api-config'
import { ProductsClient } from '@services/products/ProductsClient'
import { ProductsValidator } from '@services/products/ProductsValidator'
import { ProductsProvisioner } from './provisioner'

export { expect, ProductsValidator }

type ProductsFixtures = {
  // Test-scoped client — carries the current test's TestInfo so every request attaches
  // its (masked) request/response to the report.
  productsClient: ProductsClient
}

type ProductsWorkerFixtures = {
  // Runtime provisioner (one per worker) — creates test products on demand and deletes
  // them on teardown. Always available against the bundled mock; for a protected API,
  // resolve credentials here and `use(undefined)` when unset so dependent tests skip
  // (see .claude/rules/fixtures.md "degrade gracefully").
  productsProvisioner: ProductsProvisioner
}

export const test = base.extend<ProductsFixtures, ProductsWorkerFixtures>({
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
