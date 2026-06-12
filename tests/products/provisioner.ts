import { test, type APIRequestContext, type TestInfo } from '@playwright/test'
import { ProductsClient } from '@services/products/ProductsClient'
import type { CreateProductRequest, ProductData } from '@services/products/types'
import type { ApiConfig } from '@core/types'
import { autotestSlug } from '@utils/test-data'
import { attachReusedSubject } from '@utils/reporting'
import { randomAlphanumericCode } from '@utils/random'

// Generous budget for provisioning calls so setup never warns/fails on latency.
const PROVISION_MAX_RESPONSE_MS = 30_000

/**
 * Provisions product test data at runtime (provision-don't-seed — see
 * .claude/rules/fixtures.md "Provisioning stateful services"). Worker-scoped: one
 * instance per worker; created products are tracked and hard-deleted on teardown.
 *
 * This is the SIMPLE shape of the pattern (no credentials needed — the exemplar API is
 * public). For a protected, stateful API the same class grows an admin login + a
 * `test.skip` gate when credentials are unset; see the "advanced provisioning" appendix
 * in docs/exercises.md (exercise 5).
 */
export class ProductsProvisioner {
  private readonly created: string[] = []

  // Worker-cached reusable subject for READ-ONLY tests (get/list). Mutating tests must
  // use createDisposableProduct() instead — recycling a mutated subject breaks
  // order-independence.
  private subjectProduct?: ProductData

  constructor(
    private readonly config: ApiConfig,
    private readonly request: APIRequestContext,
  ) {}

  /**
   * Group a provisioning operation under a named, boxed report step so the Allure trace
   * reads Setup → Act → Assert: every create fired during setup nests (collapsed) under
   * one "Precondition: ..." box instead of sitting flat next to the test's own calls.
   */
  private step<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return test.step(name, fn, { box: true })
  }

  /** A product for read-only tests. Cached + reused across the worker's tests. */
  async getSubjectProduct(): Promise<ProductData> {
    if (this.subjectProduct) {
      await attachReusedSubject('subject product', this.subjectProduct)
      return this.subjectProduct
    }
    return this.step('Precondition: provision subject product', async () => {
      this.subjectProduct = await this.createTracked()
      return this.subjectProduct
    })
  }

  /** A fresh product dedicated to a destructive test (it will be mutated or deleted). */
  async createDisposableProduct(
    overrides: Partial<CreateProductRequest> = {},
  ): Promise<ProductData> {
    return this.step('Precondition: provision disposable product', () =>
      this.createTracked(overrides),
    )
  }

  /** Teardown: hard-delete every product we created (404 = a test already deleted it). */
  async cleanup(): Promise<void> {
    for (const id of this.created) {
      try {
        await this.client(true).deleteProduct(id)
      } catch {
        // best-effort — a failed cleanup must not fail the run
      }
    }
  }

  // --- internals --------------------------------------------------------------

  /** The running test's TestInfo (attaches setup requests to its report), or undefined
   *  outside a test (worker teardown) — those calls stay out of the report entirely. */
  private get activeTestInfo(): TestInfo | undefined {
    try {
      return test.info()
    } catch {
      return undefined
    }
  }

  private client(noAttach = false): ProductsClient {
    return new ProductsClient(
      {
        ...this.config,
        responseTargetMs: PROVISION_MAX_RESPONSE_MS,
        responseCeilingMs: PROVISION_MAX_RESPONSE_MS,
      },
      this.request,
      noAttach ? undefined : this.activeTestInfo,
    )
  }

  private async createTracked(overrides: Partial<CreateProductRequest> = {}): Promise<ProductData> {
    const payload: CreateProductRequest = {
      name: autotestSlug(), // TEST_PREFIX so global cleanup conventions hold
      sku: `AT-${randomAlphanumericCode(10)}`,
      price: 49.99,
      stock: 10,
      ...overrides,
    }
    const res = await this.client().createProduct(payload)
    const json = await res.json()
    // Setup failures THROW, never skip (docs/decisions.md §6) — a 500 here is a real bug.
    if (res.status() !== 201 || json?.code !== 'OK') {
      throw new Error(
        `Provisioning product failed: HTTP ${res.status()} code=${json?.code} message=${json?.message}`,
      )
    }
    const product = json.data as ProductData
    this.created.push(product.id)
    return product
  }
}
