import { test, type APIRequestContext, type TestInfo } from '@playwright/test'
import { UsersClient } from '@services/users/UsersClient'
import { Gender, UserStatus } from '@services/users/types'
import { TodosClient } from '@services/todos/TodosClient'
import { TodoStatus } from '@services/todos/types'
import type { Todo } from '@services/todos/types'
import type { ApiConfig } from '@core/types'
import { autotestSlug } from '@utils/test-data'
import { attachReusedSubject } from '@utils/reporting'

const PROVISION_MAX_RESPONSE_MS = 30_000

/**
 * Cross-resource provisioning: todo nested ใต้ user — สร้าง parent user หนึ่งตัว (cache)
 * แล้วสร้าง todo ใต้ user นั้น cleanup ลบ todo ก่อนแล้วค่อยลบ user
 */
export class TodosProvisioner {
  private parentUserId?: number
  private subjectTodo?: Todo
  private readonly createdTodos: number[] = []
  private readonly createdUsers: number[] = []

  constructor(
    private readonly config: ApiConfig,
    private readonly request: APIRequestContext,
  ) {}

  private step<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return test.step(name, fn, { box: true })
  }

  async getSubjectTodo(): Promise<Todo> {
    if (this.subjectTodo) {
      await attachReusedSubject('subject todo', this.subjectTodo)
      return this.subjectTodo
    }
    return this.step('Precondition: provision subject todo', async () => {
      this.subjectTodo = await this.createTrackedTodo()
      return this.subjectTodo
    })
  }

  async createDisposableTodo(): Promise<Todo> {
    return this.step('Precondition: provision disposable todo', () => this.createTrackedTodo())
  }

  async getParentUserId(): Promise<number> {
    await this.ensureParentUser()
    return this.parentUserId!
  }

  track(id: number): void {
    if (!this.createdTodos.includes(id)) this.createdTodos.push(id)
  }

  async cleanup(): Promise<void> {
    for (const id of this.createdTodos) await this.safeDelete(() => this.todos(true).deleteTodo(id))
    for (const id of this.createdUsers) await this.safeDelete(() => this.users(true).deleteUser(id))
  }

  // --- internals --------------------------------------------------------------

  private async safeDelete(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn()
    } catch {
      // best-effort
    }
  }

  private get activeTestInfo(): TestInfo | undefined {
    try {
      return test.info()
    } catch {
      return undefined
    }
  }

  private get provisionConfig(): ApiConfig {
    return {
      ...this.config,
      responseTargetMs: PROVISION_MAX_RESPONSE_MS,
      responseCeilingMs: PROVISION_MAX_RESPONSE_MS,
    }
  }

  private users(noAttach = false): UsersClient {
    return new UsersClient(
      this.provisionConfig,
      this.request,
      noAttach ? undefined : this.activeTestInfo,
    )
  }

  private todos(noAttach = false): TodosClient {
    return new TodosClient(
      this.provisionConfig,
      this.request,
      noAttach ? undefined : this.activeTestInfo,
    )
  }

  private async ensureParentUser(): Promise<number> {
    if (this.parentUserId) return this.parentUserId
    const slug = autotestSlug('todoowner')
    const res = await this.users().createUser({
      name: slug,
      email: `${slug}@example.com`,
      gender: Gender.MALE,
      status: UserStatus.ACTIVE,
    })
    const json = await res.json()
    if (res.status() !== 201 || typeof json?.id !== 'number') {
      throw new Error(
        `Provisioning parent user failed: HTTP ${res.status()} ${JSON.stringify(json)}`,
      )
    }
    this.parentUserId = json.id
    this.createdUsers.push(json.id)
    return json.id
  }

  private async createTrackedTodo(): Promise<Todo> {
    const userId = await this.ensureParentUser()
    const slug = autotestSlug('todo')
    const res = await this.todos().createTodo(userId, { title: slug, status: TodoStatus.PENDING })
    const json = await res.json()
    // Setup failures THROW, never skip (docs/decisions.md §6).
    if (res.status() !== 201 || typeof json?.id !== 'number') {
      throw new Error(`Provisioning todo failed: HTTP ${res.status()} ${JSON.stringify(json)}`)
    }
    this.createdTodos.push(json.id)
    return json as Todo
  }
}
