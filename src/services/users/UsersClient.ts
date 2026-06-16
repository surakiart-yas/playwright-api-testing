import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test'
import { BaseClient } from '@core/BaseClient'
import type { ApiConfig } from '@core/types'
import type { CreateUserRequest, User, UpdateUserRequest, UserStatusValue } from './types'

export type ListUsersParams = {
  page?: number
  per_page?: number
  status?: UserStatusValue // GoRest filters server-side: ?status=inactive
}

/**
 * AOM client สำหรับ GoRest `users` resource — base URL + Bearer token inject ผ่าน config
 * (ดู tests/helpers.ts); writes ต้องการ personal token, tests skip เมื่อไม่มี token
 */
export class UsersClient extends BaseClient {
  constructor(config: ApiConfig, request: APIRequestContext, testInfo?: TestInfo) {
    super(config, request, testInfo)
  }

  async createUser(body: CreateUserRequest | Record<string, unknown>): Promise<APIResponse> {
    return this.post<User>('users', body, undefined, 'Create User')
  }

  async getUser(id: number): Promise<APIResponse> {
    return this.get<User>(`users/${id}`, undefined, undefined, 'Get User')
  }

  async listUsers(params?: ListUsersParams): Promise<APIResponse> {
    return this.get<User[]>('users', params, undefined, 'List Users')
  }

  async updateUser(
    id: number,
    body: UpdateUserRequest | Record<string, unknown>,
  ): Promise<APIResponse> {
    return this.patch<User>(`users/${id}`, body, undefined, 'Update User')
  }

  // 204 No Content on success.
  async deleteUser(id: number): Promise<APIResponse> {
    return this.del<never>(`users/${id}`, undefined, 'Delete User')
  }
}
