// Every test gates on GOREST_TOKEN (helpers.getGoRestToken) so a run without the token
// makes zero network calls. Write assertions were authored against the live API.
import { test, expect, UsersValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { Gender, UserMessage, UserStatus, type CreateUserRequest } from '@services/users/types'
import { TOKEN_REQUIRED } from '../helpers'
import { autotestSlug } from '@utils/test-data'

// Same valid baseline reused by TC-005/007/009 below (Rule of 3) — each overrides only
// the field its assertion is actually about, so the override stays the visible diff.
function buildValidUserPayload(overrides: Partial<CreateUserRequest> = {}): CreateUserRequest {
  const slug = autotestSlug()
  return {
    name: slug,
    email: `${slug}@example.com`,
    gender: Gender.MALE,
    status: UserStatus.ACTIVE,
    ...overrides,
  }
}

test.describe('POST /users', { tag: ['@isolated', '@users'] }, () => {
  test.describe('Positive Testing', () => {
    test(
      'should create a user with valid fields',
      {
        tag: ['@smoke', '@regression'],
        annotation: [{ type: 'allure.label.tc', description: 'TC-005' }],
      },
      async ({ usersClient, usersProvisioner }) => {
        test.skip(!usersClient, TOKEN_REQUIRED)
        const payload = buildValidUserPayload({ gender: Gender.FEMALE })
        const res = await usersClient!.createUser(payload)
        const json = await res.json()
        // Safety net: track the id NOW so worker teardown cleans up even if an
        // assertion below throws before the inline delete runs.
        if (typeof json?.id === 'number') usersProvisioner!.track(json.id)
        await UsersValidator.expectUserSuccess(res, HttpStatus.CREATED)
        expect(json).toMatchObject({ ...payload })
        // GoRest is a shared public DB — remove what we created (the worker
        // teardown is only the fallback for a failed run).
        await usersClient!.deleteUser(json.id)
      },
    )
  })

  test.describe('Negative Testing', () => {
    test(
      'should reject creation without an authentication token',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-008' }] },
      async ({ usersClient, publicClient }) => {
        test.skip(!usersClient, TOKEN_REQUIRED) // gate = suite opt-in, not this test's input
        const slug = autotestSlug()
        const res = await publicClient.createUser({
          name: slug,
          email: `${slug}@example.com`,
          gender: Gender.MALE,
          status: UserStatus.ACTIVE,
        })
        await UsersValidator.expectMessageError(
          res,
          HttpStatus.UNAUTHORIZED,
          UserMessage.AUTH_FAILED,
        )
      },
    )

    test(
      'should reject creation when required fields are missing',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-006' }] },
      async ({ usersClient }) => {
        test.skip(!usersClient, TOKEN_REQUIRED)
        const res = await usersClient!.createUser({})
        // 422 body is a bare ARRAY of { field, message } — one entry per missing field.
        await UsersValidator.expectFieldErrors(res, [
          { field: 'email', messageContains: UserMessage.BLANK },
          { field: 'name', messageContains: UserMessage.BLANK },
          { field: 'gender', messageContains: UserMessage.BLANK },
          { field: 'status', messageContains: UserMessage.BLANK },
        ])
      },
    )

    test(
      'should reject an invalid email format',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-009' }] },
      async ({ usersClient }) => {
        test.skip(!usersClient, TOKEN_REQUIRED)
        const res = await usersClient!.createUser(buildValidUserPayload({ email: 'not-an-email' }))
        await UsersValidator.expectFieldErrors(res, [
          { field: 'email', messageContains: 'is invalid' },
        ])
      },
    )

    test(
      'should reject a duplicate email',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-007' }] },
      async ({ usersClient, usersProvisioner }) => {
        test.skip(!usersProvisioner, TOKEN_REQUIRED)
        const existing = await usersProvisioner!.getSubjectUser()
        const res = await usersClient!.createUser(buildValidUserPayload({ email: existing.email })) // taken
        await UsersValidator.expectFieldErrors(res, [
          { field: 'email', messageContains: UserMessage.EMAIL_TAKEN },
        ])
      },
    )
  })
})
