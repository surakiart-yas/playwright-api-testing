import { test, expect, ProductsValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { ProductCode, ProductError } from '@services/products/types'
import { autotestSlug } from '@utils/test-data'
import { randomUUID } from '@utils/random'

test.describe('PATCH /products/:id', { tag: ['@isolated', '@products'] }, () => {
  test.describe('Positive Testing', () => {
    // TC-011 — FB-005: partial update mutates only the sent fields
    test(
      'should update name and price without touching other fields',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-011' }] },
      async ({ productsClient, productsProvisioner }) => {
        // Disposable subject — this test mutates it, so it must not share the cached one.
        const product = await productsProvisioner.createDisposableProduct({ stock: 7 })
        const newName = autotestSlug('renamed')

        const res = await productsClient.updateProduct(product.id, { name: newName, price: 99.5 })
        await ProductsValidator.expectProductSuccess(res)
        const json = await res.json()
        expect(json.data).toMatchObject({
          id: product.id,
          name: newName,
          price: 99.5,
          stock: 7, // untouched field survives the partial update
          sku: product.sku,
        })
      },
    )
  })

  test.describe('Negative Testing', () => {
    // TC-012 — FB-005: invalid stock value (negative) → 400 INVALID_DATA, nothing mutated
    test(
      'should reject a negative stock value',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-012' }] },
      async ({ productsClient, productsProvisioner }) => {
        const product = await productsProvisioner.createDisposableProduct({ stock: 5 })
        const res = await productsClient.updateProduct(product.id, { stock: -1 })
        await ProductsValidator.expectProductError(
          res,
          HttpStatus.BAD_REQUEST,
          ProductCode.INVALID_DATA,
          ProductError.INVALID_DATA,
          [{ field: 'stock', tag: 'invalid' }],
        )
        // The rejected update must not have partially applied.
        const after = await productsClient.getProduct(product.id)
        expect((await after.json()).data.stock, 'stock must be unchanged after a 400').toBe(5)
      },
    )

    // TC-013 — FB-005: unknown id → 404 NOT_FOUND
    test(
      'should return 404 when updating a non-existent product',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-013' }] },
      async ({ productsClient }) => {
        const res = await productsClient.updateProduct(randomUUID(), { price: 1 })
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
