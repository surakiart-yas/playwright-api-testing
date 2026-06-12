// NOTE: orders has no test-design artifact set yet (products carries the worked example
// under docs/examples/products/), so these tests carry no TC-ID annotations — adding the
// catalog + IDs end-to-end is docs/exercises.md exercise 4. check-consistency skips a
// feature with no TC-IDs in code.
import { test, expect, OrdersValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { OrderCode, OrderError } from '@services/orders/types'
import { randomUUID } from '@utils/random'

test.describe('POST /orders', { tag: ['@isolated', '@orders'] }, () => {
  test.describe('Positive Testing', () => {
    test(
      'should place an order for an existing product',
      { tag: ['@smoke', '@regression'] },
      async ({ ordersClient, productsProvisioner }) => {
        const product = await productsProvisioner.createDisposableProduct({
          price: 10,
          stock: 5,
        })
        const res = await ordersClient.createOrder({ productId: product.id, quantity: 2 })
        await OrdersValidator.expectCreateSuccess(res)
        const json = await res.json()
        expect(json.data).toMatchObject({
          productId: product.id,
          quantity: 2,
          total: 20, // price 10 × quantity 2
          status: 'placed',
        })
      },
    )
  })

  test.describe('Negative Testing', () => {
    test(
      'should reject an order for a non-existent product',
      { tag: ['@regression'] },
      async ({ ordersClient }) => {
        const res = await ordersClient.createOrder({ productId: randomUUID(), quantity: 1 })
        await OrdersValidator.expectOrderError(
          res,
          HttpStatus.UNPROCESSABLE,
          OrderCode.INVALID_DATA,
          OrderError.INVALID_DATA,
          [{ field: 'productId', tag: 'invalid' }],
        )
      },
    )

    test(
      'should reject an order exceeding available stock',
      { tag: ['@regression'] },
      async ({ ordersClient, productsProvisioner }) => {
        const product = await productsProvisioner.createDisposableProduct({ stock: 1 })
        const res = await ordersClient.createOrder({ productId: product.id, quantity: 2 })
        await OrdersValidator.expectOrderError(
          res,
          HttpStatus.UNPROCESSABLE,
          OrderCode.INVALID_DATA,
          OrderError.INVALID_DATA,
          [{ field: 'quantity', tag: 'invalid', reason: 'insufficient_stock' }],
        )
      },
    )
  })
})
