import { expect, type APIResponse } from '@playwright/test'
import { BaseValidator } from '@core/BaseValidator'
import { HttpStatus } from '@core/types'
import { TodosSchemas } from './schemas'

/** STRUCTURAL assertions — HTTP status + bare-resource schema (GoRest has no envelope). */
export class TodosValidator extends BaseValidator {
  static async expectTodoSuccess(res: APIResponse, status: number = HttpStatus.OK): Promise<void> {
    await this.verify(`todo success — ${status} · bare-resource schema`, async () => {
      BaseValidator.expectStatus(res, status)
      await BaseValidator.expectSchema(res, TodosSchemas.todo)
    })
  }

  static async expectTodoListSuccess(res: APIResponse): Promise<void> {
    await this.verify('todo list success — 200 · bare-array schema', async () => {
      BaseValidator.expectStatus(res, HttpStatus.OK)
      await BaseValidator.expectSchema(res, TodosSchemas.todoList)
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
        TodosSchemas.messageError,
      )
      expect(json.message, `expected error message "${message}"`).toBe(message)
    })
  }

  /** 422 — bare ARRAY of `{ field, message }`; asserts each expected entry is contained. */
  static async expectFieldErrors(
    res: APIResponse,
    expected: { field: string; messageContains?: string }[],
  ): Promise<void> {
    await this.verify(`validation error — 422 · ${expected.length} field(s)`, async () => {
      BaseValidator.expectStatus(res, HttpStatus.UNPROCESSABLE)
      const json = await BaseValidator.expectSchema<{ field: string; message: string }[]>(
        res,
        TodosSchemas.fieldErrors,
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
