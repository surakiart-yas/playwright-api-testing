import { test, expect, ProductsValidator } from './fixtures'
import { autotestSlug } from '@utils/test-data'

test.describe('GET /products', { tag: ['@isolated', '@products'] }, () => {
  test.describe('Positive Testing', () => {
    // TC-008 — FB-004: created products appear in a filtered list with pagination metadata
    test(
      'should list created products with pagination metadata',
      {
        tag: ['@smoke', '@regression'],
        annotation: [{ type: 'allure.label.tc', description: 'TC-008' }],
      },
      async ({ productsClient, productsProvisioner }) => {
        // A unique name prefix isolates this test's view of the shared list resource —
        // parallel workers create products too, so never assert on the UNFILTERED list.
        const prefix = autotestSlug('list')
        const a = await productsProvisioner.createDisposableProduct({ name: `${prefix}-a` })
        const b = await productsProvisioner.createDisposableProduct({ name: `${prefix}-b` })

        const res = await productsClient.listProducts({ q: prefix })
        await ProductsValidator.expectListSuccess(res)
        const json = await res.json()
        expect(json.data).toMatchObject({ total: 2, page: 1 })
        expect(json.data.items.map((i: { id: string }) => i.id).sort()).toEqual([a.id, b.id].sort())
      },
    )

    // TC-009 — FB-004: page beyond the last → 200 with an empty items array (boundary)
    test(
      'should return an empty page beyond the last page',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-009' }] },
      async ({ productsClient, productsProvisioner }) => {
        const subject = await productsProvisioner.getSubjectProduct()
        const res = await productsClient.listProducts({ q: subject.name, page: 99, pageSize: 20 })
        await ProductsValidator.expectListSuccess(res)
        const json = await res.json()
        expect(json.data).toMatchObject({ items: [], total: 1, page: 99 })
      },
    )

    // TC-010 — FB-004: internal fields are projected away from list items.
    //
    // RED BY DESIGN (seeded BUG #2 in mock/server.ts): the list currently leaks the
    // internal `costPrice` field on every item (get-by-id projects it correctly). The
    // contract omits costPrice from the resource, so this test asserts its ABSENCE and
    // stays RED until the backend fixes the projection — do NOT change the expected to
    // match the bug, and do NOT add scope tags while it is red. The schema being
    // `looseObject` is what makes this assertion possible: a stripping `z.object` would
    // remove the leaked key before the expect saw it (docs/decisions.md §13).
    test(
      'should not expose the internal costPrice field on list items',
      { annotation: [{ type: 'allure.label.tc', description: 'TC-010' }] },
      async ({ productsClient, productsProvisioner }) => {
        const subject = await productsProvisioner.getSubjectProduct()
        const res = await productsClient.listProducts({ q: subject.name })
        await ProductsValidator.expectListSuccess(res)
        const json = await res.json()
        expect(json.data.items.length, 'subject product should be listed').toBeGreaterThan(0)
        for (const item of json.data.items) {
          expect(item, `item ${item.id} must not leak internal costPrice`).not.toHaveProperty(
            'costPrice',
          )
        }
      },
    )
  })
})
