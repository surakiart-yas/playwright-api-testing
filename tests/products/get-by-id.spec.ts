import { test, ProductsValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { ProductCode, ProductError } from '@services/products/types'
import { randomUUID } from '@utils/random'

// Error cases only — the GET happy path is covered by the CRUD flow
// (flows/crud.spec.ts), so an isolated 200 here would be duplicate coverage.
test.describe('GET /products/:id — error cases', { tag: ['@isolated', '@products'] }, () => {
  test.describe('Negative Testing', () => {
    // TC-007 — FB-003: unknown id → 404 NOT_FOUND
    test(
      'should return 404 for a non-existent product',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-007' }] },
      async ({ productsClient }) => {
        const res = await productsClient.getProduct(randomUUID())
        await ProductsValidator.expectProductError(
          res,
          HttpStatus.NOT_FOUND,
          ProductCode.NOT_FOUND,
          ProductError.NOT_FOUND,
        )
      },
    )
  })
})
