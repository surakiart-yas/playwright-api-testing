import { test, expect, TodosValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { TodoMessage, TodoStatus } from '@services/todos/types'
import { TOKEN_REQUIRED } from '../helpers'
import { autotestSlug } from '@utils/test-data'

test.describe('POST /users/:id/todos', { tag: ['@isolated', '@todos'] }, () => {
  test.describe('Positive Testing', () => {
    test(
      'should create a todo for a user',
      {
        tag: ['@smoke', '@regression'],
        annotation: [{ type: 'allure.label.tc', description: 'TC-302' }],
      },
      async ({ todosClient, todosProvisioner }) => {
        test.skip(!todosProvisioner, TOKEN_REQUIRED)
        const userId = await todosProvisioner!.getParentUserId()
        const slug = autotestSlug('todo')
        const res = await todosClient!.createTodo(userId, {
          title: slug,
          status: TodoStatus.PENDING,
        })
        const json = await res.json()
        if (typeof json?.id === 'number') todosProvisioner!.track(json.id)
        await TodosValidator.expectTodoSuccess(res, HttpStatus.CREATED)
        expect(json).toMatchObject({ user_id: userId, title: slug, status: TodoStatus.PENDING })
      },
    )
  })

  test.describe('Negative Testing', () => {
    test(
      'should reject a todo without a title',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-303' }] },
      async ({ todosClient, todosProvisioner }) => {
        test.skip(!todosProvisioner, TOKEN_REQUIRED)
        const userId = await todosProvisioner!.getParentUserId()
        const res = await todosClient!.createTodo(userId, { status: TodoStatus.PENDING })
        await TodosValidator.expectFieldErrors(res, [
          { field: 'title', messageContains: TodoMessage.BLANK },
        ])
      },
    )

    test(
      'should reject an invalid status',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-304' }] },
      async ({ todosClient, todosProvisioner }) => {
        test.skip(!todosProvisioner, TOKEN_REQUIRED)
        const userId = await todosProvisioner!.getParentUserId()
        const res = await todosClient!.createTodo(userId, { title: autotestSlug(), status: 'done' })
        await TodosValidator.expectFieldErrors(res, [
          { field: 'status', messageContains: 'pending or completed' },
        ])
      },
    )

    test(
      'should reject a todo without a token',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-305' }] },
      async ({ publicClient, todosProvisioner }) => {
        test.skip(!todosProvisioner, TOKEN_REQUIRED)
        const userId = await todosProvisioner!.getParentUserId()
        const res = await publicClient.createTodo(userId, {
          title: autotestSlug(),
          status: TodoStatus.PENDING,
        })
        await TodosValidator.expectMessageError(
          res,
          HttpStatus.UNAUTHORIZED,
          TodoMessage.AUTH_FAILED,
        )
      },
    )
  })
})
