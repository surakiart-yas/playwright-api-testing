import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test'
import { BaseClient } from '@core/BaseClient'
import type { ApiConfig } from '@core/types'
import type { CreateTodoRequest, Todo, UpdateTodoRequest } from './types'

export type ListTodosParams = {
  page?: number
  per_page?: number
}

/**
 * AOM client สำหรับ GoRest `todos` resource — nested under users.
 * create ที่ /users/{userId}/todos; read/update/delete ที่ /todos/{id}
 */
export class TodosClient extends BaseClient {
  constructor(config: ApiConfig, request: APIRequestContext, testInfo?: TestInfo) {
    super(config, request, testInfo)
  }

  async createTodo(
    userId: number,
    body: CreateTodoRequest | Record<string, unknown>,
  ): Promise<APIResponse> {
    return this.post<Todo>(`users/${userId}/todos`, body, undefined, 'Create Todo')
  }

  async getTodo(id: number): Promise<APIResponse> {
    return this.get<Todo>(`todos/${id}`, undefined, undefined, 'Get Todo')
  }

  async listUserTodos(userId: number, params?: ListTodosParams): Promise<APIResponse> {
    return this.get<Todo[]>(`users/${userId}/todos`, params, undefined, 'List User Todos')
  }

  async updateTodo(
    id: number,
    body: UpdateTodoRequest | Record<string, unknown>,
  ): Promise<APIResponse> {
    return this.patch<Todo>(`todos/${id}`, body, undefined, 'Update Todo')
  }

  // 204 No Content on success.
  async deleteTodo(id: number): Promise<APIResponse> {
    return this.del<never>(`todos/${id}`, undefined, 'Delete Todo')
  }
}
