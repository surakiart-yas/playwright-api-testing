import { test, expect, TodosValidator } from '../fixtures'
import { HttpStatus } from '@core/types'
import { TodoMessage, TodoStatus } from '@services/todos/types'
import { TOKEN_REQUIRED } from '../../helpers'
import { autotestSlug } from '@utils/test-data'

test(
  'Todo flow: create → complete → delete → verify gone',
  {
    tag: ['@flow', '@smoke', '@regression', '@todos'],
    annotation: [{ type: 'allure.label.tc', description: 'TC-310' }],
  },
  async ({ todosClient, todosProvisioner }) => {
    test.skip(!todosProvisioner, TOKEN_REQUIRED)
    const userId = await todosProvisioner!.getParentUserId()
    const slug = autotestSlug('todo')
    let id = 0

    await test.step('Create todo', async () => {
      const res = await todosClient!.createTodo(userId, { title: slug, status: TodoStatus.PENDING })
      await TodosValidator.expectTodoSuccess(res, HttpStatus.CREATED)
      id = (await res.json()).id
      todosProvisioner!.track(id)
    })

    await test.step('Mark completed', async () => {
      const res = await todosClient!.updateTodo(id, { status: TodoStatus.COMPLETED })
      await TodosValidator.expectTodoSuccess(res)
      expect((await res.json()).status).toBe(TodoStatus.COMPLETED)
    })

    await test.step('Delete todo', async () => {
      const res = await todosClient!.deleteTodo(id)
      await TodosValidator.expectDeleteSuccess(res)
    })

    await test.step('Verify todo is gone', async () => {
      const res = await todosClient!.getTodo(id)
      await TodosValidator.expectMessageError(res, HttpStatus.NOT_FOUND, TodoMessage.NOT_FOUND)
    })
  },
)
