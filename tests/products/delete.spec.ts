import { test, ProductsValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { ProductCode, ProductError } from '@services/products/types'
import { randomUUID } from '@utils/random'

test.describe('DELETE /products/:id', { tag: ['@isolated', '@products'] }, () => {
  test.describe('Positive Testing', () => {
    // TC-014 — FB-006: delete removes the resource (verified by a follow-up 404)
    test(
      'should delete a product',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-014' }] },
      async ({ productsClient, productsProvisioner }) => {
        const product = await productsProvisioner.createDisposableProduct()
        const res = await productsClient.deleteProduct(product.id)
        await ProductsValidator.expectEmptyDataSuccess(res)

        const after = await productsClient.getProduct(product.id)
        await ProductsValidator.expectProductError(
          after,
          HttpStatus.NOT_FOUND,
          ProductCode.NOT_FOUND,
          ProductError.NOT_FOUND,
        )
      },
    )
  })

  test.describe('Negative Testing', () => {
    // TC-015 — FB-006: unknown id → 404 NOT_FOUND
    test(
      'should return 404 when deleting a non-existent product',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-015' }] },
      async ({ productsClient }) => {
        const res = await productsClient.deleteProduct(randomUUID())
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
