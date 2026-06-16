import { test, expect, UsersValidator } from './fixtures'
import { UserStatus } from '@services/users/types'
import { TOKEN_REQUIRED } from '../helpers'

test.describe('GET /users', { tag: ['@isolated', '@users'] }, () => {
  test.describe('Positive Testing', () => {
    test(
      'should honor the per_page limit',
      {
        tag: ['@smoke', '@regression'],
        annotation: [{ type: 'allure.label.tc', description: 'TC-001' }],
      },
      async ({ usersClient }) => {
        test.skip(!usersClient, TOKEN_REQUIRED)
        const res = await usersClient!.listUsers({ page: 1, per_page: 3 })
        await UsersValidator.expectUserListSuccess(res)
        const json = await res.json()
        // GoRest's shared DB always has data, but the contract only promises AT MOST
        // per_page — never assert exact contents of a list other people mutate live.
        expect(json.length, 'page must not exceed per_page').toBeLessThanOrEqual(3)
        expect(json.length, 'public DB should not be empty').toBeGreaterThan(0)
      },
    )

    test(
      'should filter by status',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-002' }] },
      async ({ usersClient }) => {
        test.skip(!usersClient, TOKEN_REQUIRED)
        const res = await usersClient!.listUsers({ status: UserStatus.INACTIVE, per_page: 5 })
        await UsersValidator.expectUserListSuccess(res)
        const json = await res.json()
        // Server-side filter: EVERY returned item must match (don't assert count —
        // shared DB). An empty page is acceptable, so guard before asserting.
        for (const user of json) {
          expect(user.status, `filtered list must be all-inactive`).toBe(UserStatus.INACTIVE)
        }
      },
    )
  })
})
