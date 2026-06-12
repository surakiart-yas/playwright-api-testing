import { expect, type APIResponse } from '@playwright/test'
import { BaseValidator } from '@core/BaseValidator'
import { HttpStatus, type ErrorDataEntry } from '@core/types'
import { OrderCode } from './types'
import { OrdersSchemas } from './schemas'

/** STRUCTURAL assertions for the orders envelope — see ProductsValidator for the
 *  fully-commented reference. */
export class OrdersValidator extends BaseValidator {
  static async expectCreateSuccess(res: APIResponse): Promise<void> {
    await this.verify('create order success — 201 · OK · schema', async () => {
      BaseValidator.expectStatus(res, HttpStatus.CREATED)
      const json = await BaseValidator.expectSchema<{ code: string }>(res, OrdersSchemas.order)
      expect(json.code, 'business code should be OK').toBe(OrderCode.SUCCESS)
    })
  }

  static async expectOrderSuccess(res: APIResponse): Promise<void> {
    await this.verify('order success — 200 · OK · schema', async () => {
      BaseValidator.expectStatus(res, HttpStatus.OK)
      const json = await BaseValidator.expectSchema<{ code: string }>(res, OrdersSchemas.order)
      expect(json.code).toBe(OrderCode.SUCCESS)
    })
  }

  // delete success — code OK with an empty `data` object.
  static async expectEmptyDataSuccess(res: APIResponse): Promise<void> {
    await this.verify('success — 200 · OK · empty data', async () => {
      BaseValidator.expectStatus(res, HttpStatus.OK)
      const json = await BaseValidator.expectSchema<{ code: string }>(res, OrdersSchemas.emptyData)
      expect(json.code).toBe(OrderCode.SUCCESS)
    })
  }

  static async expectOrderError(
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
        }>(res, OrdersSchemas.error)
        expect(json.code, `expected business code ${code}`).toBe(code)
        if (error) expect(json.error, `expected error key ${error}`).toBe(error)
        if (expectedErrorData) BaseValidator.expectErrorData(json.errorData, expectedErrorData)
      },
    )
  }
}
