// GoRest todos schemas (Zod) — bare resource. looseObject keeps unknown/leaked fields
// visible — see docs/decisions.md §3 + §12.
import { z } from 'zod'
import { TodoStatus } from './types'

export const todoData = z.looseObject({
  id: z.number().int(),
  user_id: z.number().int(),
  title: z.string(),
  status: z.enum([TodoStatus.PENDING, TodoStatus.COMPLETED]),
  due_on: z.string().nullable(), // GoRest returns null when no due date was set
})

const messageError = z.looseObject({ message: z.string() })
const fieldErrors = z.array(z.looseObject({ field: z.string(), message: z.string() }))

export const TodosSchemas = {
  todo: todoData,
  todoList: z.array(todoData),
  messageError,
  fieldErrors,
}
