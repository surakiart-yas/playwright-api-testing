import { test, expect, UsersValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { UserMessage } from '@services/users/types'
import { TOKEN_REQUIRED } from '../helpers'

test.describe('GET /users/:id', { tag: ['@isolated', '@users'] }, () => {
  test.describe('Positive Testing', () => {
    test(
      'should fetch an existing user by id',
      {
        tag: ['@smoke', '@regression'],
        annotation: [{ type: 'allure.label.tc', description: 'TC-003' }],
      },
      async ({ usersClient, usersProvisioner }) => {
        test.skip(!usersProvisioner, TOKEN_REQUIRED)
        const subject = await usersProvisioner!.getSubjectUser()
        const res = await usersClient!.getUser(subject.id)
        await UsersValidator.expectUserSuccess(res)
        expect(await res.json()).toMatchObject({
          id: subject.id,
          name: subject.name,
          email: subject.email,
        })
      },
    )
  })

  test.describe('Negative Testing', () => {
    test(
      'should return 404 for a non-existent user',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-004' }] },
      async ({ usersClient }) => {
        test.skip(!usersClient, TOKEN_REQUIRED)
        const res = await usersClient!.getUser(999_999_999)
        await UsersValidator.expectMessageError(res, HttpStatus.NOT_FOUND, UserMessage.NOT_FOUND)
      },
    )
  })
})
