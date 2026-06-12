import { test, expect, OrdersValidator, ProductsValidator } from '../fixtures'

// Two service tags (@products + @orders) → grouped under the dedicated "Cross-Service"
// Allure epic (docs/decisions.md §2). The flow proves the cross-service INVARIANT
// (placing an order decrements the product's stock) — each side's contract is already
// covered by its own isolated specs.
test(
  'Cross-service flow: create product → place order → verify stock decrement',
  { tag: ['@flow', '@products', '@orders', '@smoke', '@regression'] },
  async ({ ordersClient, productsClient, productsProvisioner }) => {
    let orderId = ''
    const product = await productsProvisioner.createDisposableProduct({ price: 12.5, stock: 4 })

    await test.step('Place an order against the product', async () => {
      const res = await ordersClient.createOrder({ productId: product.id, quantity: 3 })
      await OrdersValidator.expectCreateSuccess(res)
      const json = await res.json()
      expect(json.data).toMatchObject({ quantity: 3, total: 37.5, status: 'placed' })
      orderId = json.data.id
    })

    await test.step('Verify the order is fetchable', async () => {
      const res = await ordersClient.getOrder(orderId)
      await OrdersValidator.expectOrderSuccess(res)
      expect((await res.json()).data).toMatchObject({ id: orderId, productId: product.id })
    })

    await test.step('Verify product stock was decremented', async () => {
      const res = await productsClient.getProduct(product.id)
      await ProductsValidator.expectProductSuccess(res)
      expect((await res.json()).data.stock, 'stock 4 − ordered 3 = 1').toBe(1)
    })

    await test.step('Clean up the order', async () => {
      const res = await ordersClient.deleteOrder(orderId)
      await OrdersValidator.expectEmptyDataSuccess(res)
    })
  },
)
