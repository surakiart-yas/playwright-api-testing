import { test, expect, ProductsValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { ProductCode, ProductError, ProductStatus } from '@services/products/types'
import { autotestSlug } from '@utils/test-data'
import { randomAlphanumericCode } from '@utils/random'

test.describe('POST /products', { tag: ['@isolated', '@products'] }, () => {
  test.describe('Positive Testing', () => {
    // TC-001 — FB-001: all fields valid → 201, echoes the resource, status starts at draft
    test(
      'should create a product with valid fields',
      {
        tag: ['@smoke', '@regression'],
        annotation: [{ type: 'allure.label.tc', description: 'TC-001' }],
      },
      async ({ productsClient }) => {
        const name = autotestSlug()
        const sku = `AT-${randomAlphanumericCode(10)}`
        const res = await productsClient.createProduct({ name, sku, price: 49.99, stock: 10 })
        await ProductsValidator.expectCreateSuccess(res)
        const json = await res.json()
        expect(json.data).toMatchObject({
          name,
          sku,
          price: 49.99,
          stock: 10,
          status: ProductStatus.DRAFT,
        })
      },
    )

    // TC-002 — FB-001: stock omitted → defaults to 0 (documented default, not an error)
    test(
      'should default stock to 0 when omitted',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-002' }] },
      async ({ productsClient }) => {
        const res = await productsClient.createProduct({
          name: autotestSlug(),
          sku: `AT-${randomAlphanumericCode(10)}`,
          price: 15,
        })
        await ProductsValidator.expectCreateSuccess(res)
        expect((await res.json()).data.stock, 'omitted stock should default to 0').toBe(0)
      },
    )
  })

  test.describe('Negative Testing', () => {
    // TC-003 — FB-002: missing required name → 400 VALIDATION_FAILED naming the field
    test(
      'should reject creation when name is missing',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-003' }] },
      async ({ productsClient }) => {
        const res = await productsClient.createProduct({
          sku: `AT-${randomAlphanumericCode(10)}`,
          price: 10,
        })
        await ProductsValidator.expectProductError(
          res,
          HttpStatus.BAD_REQUEST,
          ProductCode.VALIDATION_FAILED,
          ProductError.VALIDATION_FAILED,
          [{ field: 'name', tag: 'body', reason: 'required' }],
        )
      },
    )

    // TC-004 — FB-002: present-but-INVALID value (negative price) → 400 INVALID_DATA.
    // Distinct from missing/empty → VALIDATION_FAILED (TC-003): two different error codes
    // for two different failure classes.
    test(
      'should reject a negative price',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-004' }] },
      async ({ productsClient }) => {
        const res = await productsClient.createProduct({
          name: autotestSlug(),
          sku: `AT-${randomAlphanumericCode(10)}`,
          price: -1,
        })
        await ProductsValidator.expectProductError(
          res,
          HttpStatus.BAD_REQUEST,
          ProductCode.INVALID_DATA,
          ProductError.INVALID_DATA,
          [{ field: 'price', tag: 'invalid' }],
        )
      },
    )

    // TC-005 — FB-002: sku must be unique → 409 DUPLICATE on the second create
    test(
      'should reject a duplicate SKU',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-005' }] },
      async ({ productsClient, productsProvisioner }) => {
        const existing = await productsProvisioner.getSubjectProduct()
        const res = await productsClient.createProduct({
          name: autotestSlug(),
          sku: existing.sku,
          price: 10,
        })
        await ProductsValidator.expectProductError(
          res,
          HttpStatus.CONFLICT,
          ProductCode.DUPLICATE,
          ProductError.DUPLICATE,
          [{ field: 'sku', tag: 'duplicate' }],
        )
      },
    )

    // TC-006 — FB-002: missing required price → 400 VALIDATION_FAILED.
    //
    // RED BY DESIGN (seeded BUG #1 in mock/server.ts): the API currently accepts a
    // missing price and creates the product with price 0. The contract
    // (docs/openapi/openapi(products).yaml) requires price, so this test asserts the
    // documented-correct 400 and stays RED until the backend fixes the validation —
    // do NOT change the expected to match the bug, and do NOT add scope tags
    // (@smoke/@regression) while it is red. See .claude/rules/testing.md "Spec is the
    // source of truth".
    test(
      'should reject creation when price is missing',
      { annotation: [{ type: 'allure.label.tc', description: 'TC-006' }] },
      async ({ productsClient }) => {
        const res = await productsClient.createProduct({
          name: autotestSlug(),
          sku: `AT-${randomAlphanumericCode(10)}`,
        })
        await ProductsValidator.expectProductError(
          res,
          HttpStatus.BAD_REQUEST,
          ProductCode.VALIDATION_FAILED,
          ProductError.VALIDATION_FAILED,
          [{ field: 'price', tag: 'body', reason: 'required' }],
        )
      },
    )
  })
})
