import { expect, type APIResponse } from '@playwright/test'
import { BaseValidator } from '@core/BaseValidator'
import { HttpStatus, type ErrorDataEntry } from '@core/types'
import { ProductCode } from './types'
import { ProductsSchemas } from './schemas'

/**
 * STRUCTURAL assertions for the products envelope (HTTP status + schema + business
 * code) — field VALUES stay in the test body (docs/decisions.md §4). Each helper groups
 * its asserts under ONE `Verify: ...` report node (see BaseValidator.verify).
 */
export class ProductsValidator extends BaseValidator {
  static async expectCreateSuccess(res: APIResponse): Promise<void> {
    await this.verify('create success — 201 · OK · schema', async () => {
      BaseValidator.expectStatus(res, HttpStatus.CREATED)
      const json = await BaseValidator.expectSchema<{ code: string }>(res, ProductsSchemas.product)
      expect(json.code, 'business code should be OK').toBe(ProductCode.SUCCESS)
    })
  }

  static async expectProductSuccess(res: APIResponse): Promise<void> {
    await this.verify('product success — 200 · OK · schema', async () => {
      BaseValidator.expectStatus(res, HttpStatus.OK)
      const json = await BaseValidator.expectSchema<{ code: string }>(res, ProductsSchemas.product)
      expect(json.code).toBe(ProductCode.SUCCESS)
    })
  }

  static async expectListSuccess(res: APIResponse): Promise<void> {
    await this.verify('list success — 200 · OK · schema', async () => {
      BaseValidator.expectStatus(res, HttpStatus.OK)
      const json = await BaseValidator.expectSchema<{ code: string }>(res, ProductsSchemas.list)
      expect(json.code).toBe(ProductCode.SUCCESS)
    })
  }

  // delete success — code OK with an empty `data` object.
  static async expectEmptyDataSuccess(res: APIResponse): Promise<void> {
    await this.verify('success — 200 · OK · empty data', async () => {
      BaseValidator.expectStatus(res, HttpStatus.OK)
      const json = await BaseValidator.expectSchema<{ code: string }>(
        res,
        ProductsSchemas.emptyData,
      )
      expect(json.code).toBe(ProductCode.SUCCESS)
    })
  }

  /**
   * Assert an error envelope: HTTP status + business `code` + (optional) `error` key +
   * (optional) the per-field errorData entries, matched as an order-independent subset.
   */
  static async expectProductError(
    res: APIResponse,
    httpStatus: number,
    code: string,
    error?: string,
    expectedErrorData?: ErrorDataEntry[],
  ): Promise<void> {
    await this.verify(
      `error — ${httpStatus} · ${code}${error ? ` ${error}` : ''}${expectedErrorData ? ` · ${expectedErrorData.length} field(s)` : ''}`,
      async () => {
        BaseValidator.expectStatus(res, httpStatus)
        const json = await BaseValidator.expectSchema<{
          code: string
          error: string
          errorData?: unknown
        }>(res, ProductsSchemas.error)
        expect(json.code, `expected business code ${code}`).toBe(code)
        if (error) expect(json.error, `expected error key ${error}`).toBe(error)
        if (expectedErrorData) BaseValidator.expectErrorData(json.errorData, expectedErrorData)
      },
    )
  }
}
