import { test, expect, TodosValidator } from './fixtures'
import { TOKEN_REQUIRED } from '../helpers'

test.describe('GET /users/:id/todos', { tag: ['@isolated', '@todos'] }, () => {
  test(
    "should list a user's todos",
    {
      tag: ['@smoke', '@regression'],
      annotation: [{ type: 'allure.label.tc', description: 'TC-301' }],
    },
    async ({ todosClient, todosProvisioner }) => {
      test.skip(!todosProvisioner, TOKEN_REQUIRED)
      const subject = await todosProvisioner!.getSubjectTodo()
      const res = await todosClient!.listUserTodos(subject.user_id)
      await TodosValidator.expectTodoListSuccess(res)
      const json = await res.json()
      for (const todo of json) {
        expect(todo.user_id, 'nested list must be scoped to the user').toBe(subject.user_id)
      }
    },
  )
})
