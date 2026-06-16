import { test, type APIRequestContext, type TestInfo } from '@playwright/test'
import { UsersClient } from '@services/users/UsersClient'
import { Gender, UserStatus } from '@services/users/types'
import type { CreateUserRequest, User } from '@services/users/types'
import type { ApiConfig } from '@core/types'
import { autotestSlug } from '@utils/test-data'
import { attachReusedSubject } from '@utils/reporting'

// Generous budget for provisioning over the public internet.
const PROVISION_MAX_RESPONSE_MS = 30_000

/**
 * Runtime provisioning สำหรับ GoRest users — ต้องการ token; ถ้าไม่มี tests skip
 * cleanup สำคัญมาก: GoRest เป็น shared public DB ทุก user ที่สร้างต้องถูกลบใน teardown
 */
export class UsersProvisioner {
  private readonly created: number[] = []

  // Worker-cached subject for READ-ONLY tests (duplicate-email checks, gets).
  private subjectUser?: User

  constructor(
    private readonly config: ApiConfig, // already gorest-based + token-bearing (helpers.gorestConfig)
    private readonly request: APIRequestContext,
  ) {}

  private step<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return test.step(name, fn, { box: true })
  }

  /** A user for read-only tests. Cached + reused across the worker's tests. */
  async getSubjectUser(): Promise<User> {
    if (this.subjectUser) {
      await attachReusedSubject('subject user', this.subjectUser)
      return this.subjectUser
    }
    return this.step('Precondition: provision subject user', async () => {
      this.subjectUser = await this.createTracked()
      return this.subjectUser
    })
  }

  /** A fresh user dedicated to a destructive test (it will be mutated or deleted). */
  async createDisposableUser(overrides: Partial<CreateUserRequest> = {}): Promise<User> {
    return this.step('Precondition: provision disposable user', () => this.createTracked(overrides))
  }

  /**
   * Register a user id this provisioner did NOT create, so worker teardown still
   * deletes it. ใช้กับ test ที่สร้าง user เองตรงๆ เพื่อ assert การ create (เช่น TC-005,
   * crud flow) — มันลบ inline ตอนจบอยู่แล้ว แต่ถ้า assertion ก่อนหน้า fail การ track
   * ไว้ทำให้ teardown เก็บตัวที่ค้างได้ (cleanup ลบซ้ำเป็น 404 = no-op)
   */
  track(id: number): void {
    if (!this.created.includes(id)) this.created.push(id)
  }

  /** Teardown: hard-delete every user we created (404 = a test already deleted it). */
  async cleanup(): Promise<void> {
    for (const id of this.created) {
      try {
        await this.client(true).deleteUser(id)
      } catch {
        // best-effort — a failed cleanup must not fail the run
      }
    }
  }

  // --- internals --------------------------------------------------------------

  private get activeTestInfo(): TestInfo | undefined {
    try {
      return test.info()
    } catch {
      return undefined
    }
  }

  private client(noAttach = false): UsersClient {
    return new UsersClient(
      {
        ...this.config,
        responseTargetMs: PROVISION_MAX_RESPONSE_MS,
        responseCeilingMs: PROVISION_MAX_RESPONSE_MS,
      },
      this.request,
      noAttach ? undefined : this.activeTestInfo,
    )
  }

  private async createTracked(overrides: Partial<CreateUserRequest> = {}): Promise<User> {
    // Email must be globally unique on GoRest's shared DB — the random slug handles it,
    // and the autotest prefix keeps our records recognisable.
    const slug = autotestSlug()
    const payload: CreateUserRequest = {
      name: slug,
      email: `${slug}@example.com`,
      gender: Gender.MALE,
      status: UserStatus.ACTIVE,
      ...overrides,
    }
    const res = await this.client().createUser(payload)
    const json = await res.json()
    // Setup failures THROW, never skip (docs/decisions.md §6).
    if (res.status() !== 201 || typeof json?.id !== 'number') {
      throw new Error(`Provisioning user failed: HTTP ${res.status()} body=${JSON.stringify(json)}`)
    }
    const user = json as User
    this.created.push(user.id)
    return user
  }
}
