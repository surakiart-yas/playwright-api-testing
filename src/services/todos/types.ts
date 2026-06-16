// GoRest todos domain — nested under users. POST at /users/{user_id}/todos;
// read/update/delete at /todos/{id}.
import type { z } from 'zod'
import type { todoData } from './schemas'

export const TodoStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
} as const
export type TodoStatusValue = (typeof TodoStatus)[keyof typeof TodoStatus]

export interface CreateTodoRequest {
  title: string
  status: TodoStatusValue
  due_on?: string // ISO date, optional
}

export interface UpdateTodoRequest {
  title?: string
  status?: TodoStatusValue
  due_on?: string
}

export type Todo = z.infer<typeof todoData>

export const TodoMessage = {
  AUTH_FAILED: 'Authentication failed',
  NOT_FOUND: 'Resource not found',
  BLANK: "can't be blank",
} as const
