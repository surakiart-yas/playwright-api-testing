import { test, expect, UsersValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { UserMessage, UserStatus } from '@services/users/types'
import { TOKEN_REQUIRED } from '../helpers'

test.describe('PATCH /users/:id', { tag: ['@isolated', '@users'] }, () => {
  test.describe('Positive Testing', () => {
    test(
      'should update a user status',
      {
        tag: ['@smoke', '@regression'],
        annotation: [{ type: 'allure.label.tc', description: 'TC-010' }],
      },
      async ({ usersClient, usersProvisioner }) => {
        test.skip(!usersProvisioner, TOKEN_REQUIRED)
        // disposable subject — this test MUTATES it, so it must not be the shared one
        const user = await usersProvisioner!.createDisposableUser({ status: UserStatus.ACTIVE })
        const res = await usersClient!.updateUser(user.id, { status: UserStatus.INACTIVE })
        await UsersValidator.expectUserSuccess(res)
        expect(await res.json()).toMatchObject({ id: user.id, status: UserStatus.INACTIVE })
      },
    )
  })

  test.describe('Negative Testing', () => {
    // RED-by-design (.claude/rules/testing.md "Spec is the source of truth"): the documented
    // contract is "write without a token → 401"
    // (POST honors it — see TC-008). But GoRest returns 404 for an unauthenticated PATCH on a
    // user that EXISTS — it hides existence instead of saying "unauthenticated". We assert the
    // 401 the contract promises and leave this test RED. No scope tag → it never blocks the
    // gate; `pnpm test` stays honest. Do NOT weaken to 404 — if GoRest fixes the inconsistency
    // this turns green on its own.
    test(
      'should reject an update without a token',
      { annotation: [{ type: 'allure.label.tc', description: 'TC-011' }] },
      async ({ usersProvisioner, publicClient }) => {
        test.skip(!usersProvisioner, TOKEN_REQUIRED)
        const user = await usersProvisioner!.createDisposableUser()
        const res = await publicClient.updateUser(user.id, { status: UserStatus.INACTIVE })
        await UsersValidator.expectMessageError(
          res,
          HttpStatus.UNAUTHORIZED,
          UserMessage.AUTH_FAILED,
        )
      },
    )

    test(
      'should return 404 when updating a non-existent user',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-012' }] },
      async ({ usersClient }) => {
        test.skip(!usersClient, TOKEN_REQUIRED)
        const res = await usersClient!.updateUser(999_999_999, { status: UserStatus.INACTIVE })
        await UsersValidator.expectMessageError(res, HttpStatus.NOT_FOUND, UserMessage.NOT_FOUND)
      },
    )
  })
})
