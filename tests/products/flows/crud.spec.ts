import { test, expect, ProductsValidator } from '../fixtures'
import { HttpStatus } from '@core/types'
import { ProductCode, ProductError, ProductStatus } from '@services/products/types'
import { autotestSlug } from '@utils/test-data'
import { randomAlphanumericCode } from '@utils/random'

// TC-016 — FB-007: full lifecycle in one scenario. Flow tests verify the steps COMPOSE
// (state carries across calls); the per-endpoint contracts are already covered by the
// isolated specs (docs/test-strategy.md).
test(
  'Product CRUD flow: create → list → get → update → delete',
  {
    tag: ['@flow', '@products', '@smoke', '@regression'],
    annotation: [{ type: 'allure.label.tc', description: 'TC-016' }],
  },
  async ({ productsClient }) => {
    const name = autotestSlug('crud')
    const sku = `AT-${randomAlphanumericCode(10)}`
    let id = ''

    await test.step('Create product', async () => {
      const res = await productsClient.createProduct({ name, sku, price: 20, stock: 3 })
      await ProductsValidator.expectCreateSuccess(res)
      const json = await res.json()
      expect(json.data).toMatchObject({ name, sku, status: ProductStatus.DRAFT })
      id = json.data.id
    })

    await test.step('Verify product appears in list', async () => {
      const res = await productsClient.listProducts({ q: name })
      await ProductsValidator.expectListSuccess(res)
      const json = await res.json()
      expect(json.data.items.map((i: { id: string }) => i.id)).toContain(id)
    })

    await test.step('Get by id and verify field match', async () => {
      const res = await productsClient.getProduct(id)
      await ProductsValidator.expectProductSuccess(res)
      expect((await res.json()).data).toMatchObject({ id, name, sku, price: 20, stock: 3 })
    })

    await test.step('Update price', async () => {
      const res = await productsClient.updateProduct(id, { price: 25.5 })
      await ProductsValidator.expectProductSuccess(res)
      expect((await res.json()).data.price).toBe(25.5)
    })

    await test.step('Verify update via get', async () => {
      const res = await productsClient.getProduct(id)
      await ProductsValidator.expectProductSuccess(res)
      expect((await res.json()).data.price).toBe(25.5)
    })

    await test.step('Delete product', async () => {
      const res = await productsClient.deleteProduct(id)
      await ProductsValidator.expectEmptyDataSuccess(res)
    })

    await test.step('Verify product is gone', async () => {
      const res = await productsClient.getProduct(id)
      await ProductsValidator.expectProductError(
        res,
        HttpStatus.NOT_FOUND,
        ProductCode.NOT_FOUND,
        ProductError.NOT_FOUND,
      )
    })
  },
)
