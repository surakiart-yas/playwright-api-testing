import { expect, type APIResponse } from '@playwright/test'
import { BaseValidator } from '@core/BaseValidator'
import { HttpStatus } from '@core/types'
import { UsersSchemas } from './schemas'

/** STRUCTURAL assertions — HTTP status + bare-resource schema (GoRest has no envelope). */
export class UsersValidator extends BaseValidator {
  static async expectUserSuccess(res: APIResponse, status: number = HttpStatus.OK): Promise<void> {
    await this.verify(`user success — ${status} · bare-resource schema`, async () => {
      BaseValidator.expectStatus(res, status)
      await BaseValidator.expectSchema(res, UsersSchemas.user)
    })
  }

  static async expectUserListSuccess(res: APIResponse): Promise<void> {
    await this.verify('user list success — 200 · bare-array schema', async () => {
      BaseValidator.expectStatus(res, HttpStatus.OK)
      await BaseValidator.expectSchema(res, UsersSchemas.userList)
    })
  }

  static async expectDeleteSuccess(res: APIResponse): Promise<void> {
    await this.verify('delete success — 204 · no content', async () => {
      BaseValidator.expectStatus(res, HttpStatus.NO_CONTENT)
    })
  }

  /** 401 / 404 — `{ message }` body with a pinned message string. */
  static async expectMessageError(
    res: APIResponse,
    httpStatus: number,
    message: string,
  ): Promise<void> {
    await this.verify(`error — ${httpStatus} · "${message}"`, async () => {
      BaseValidator.expectStatus(res, httpStatus)
      const json = await BaseValidator.expectSchema<{ message: string }>(
        res,
        UsersSchemas.messageError,
      )
      expect(json.message, `expected error message "${message}"`).toBe(message)
    })
  }

  /**
   * 422 — the body is an ARRAY of `{ field, message }`. Asserts each expected entry is
   * CONTAINED (order-independent subset; `message` matched as substring because GoRest
   * concatenates hints, e.g. "can't be blank, can be male of female").
   */
  static async expectFieldErrors(
    res: APIResponse,
    expected: { field: string; messageContains?: string }[],
  ): Promise<void> {
    await this.verify(`validation error — 422 · ${expected.length} field(s)`, async () => {
      BaseValidator.expectStatus(res, HttpStatus.UNPROCESSABLE)
      const json = await BaseValidator.expectSchema<{ field: string; message: string }[]>(
        res,
        UsersSchemas.fieldErrors,
      )
      for (const e of expected) {
        const entry = json.find((j) => j.field === e.field)
        expect(entry, `422 body should flag field "${e.field}"`).toBeTruthy()
        if (e.messageContains) {
          expect(entry!.message, `field "${e.field}" message`).toContain(e.messageContains)
        }
      }
    })
  }
}
