// Delete happy path is covered by the CRUD flow (TC-015); here we cover the error case.
import { test, UsersValidator } from './fixtures'
import { HttpStatus } from '@core/types'
import { UserMessage } from '@services/users/types'
import { TOKEN_REQUIRED } from '../helpers'

test.describe('DELETE /users/:id', { tag: ['@isolated', '@users'] }, () => {
  test.describe('Negative Testing', () => {
    test(
      'should return 404 when deleting a non-existent user',
      { tag: ['@regression'], annotation: [{ type: 'allure.label.tc', description: 'TC-013' }] },
      async ({ usersClient }) => {
        test.skip(!usersClient, TOKEN_REQUIRED)
        const res = await usersClient!.deleteUser(999_999_999)
        await UsersValidator.expectMessageError(res, HttpStatus.NOT_FOUND, UserMessage.NOT_FOUND)
      },
    )
  })
})
