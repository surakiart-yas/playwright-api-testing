import { test, expect, UsersValidator } from '../fixtures'
import { HttpStatus } from '@core/types'
import { UserMessage, UserStatus } from '@services/users/types'
import { TOKEN_REQUIRED } from '../../helpers'
import { autotestSlug } from '@utils/test-data'

// CRUD flow กับ GoRest — ทดสอบว่า resource lifecycle ทำงานถูกต้องตั้งแต่ create จนถึง delete
test(
  'GoRest user CRUD flow: create → get → update → delete → verify gone',
  {
    tag: ['@flow', '@smoke', '@regression', '@users'],
    annotation: [{ type: 'allure.label.tc', description: 'TC-015' }],
  },
  async ({ usersClient, usersProvisioner }) => {
    test.skip(!usersClient, TOKEN_REQUIRED)
    const slug = autotestSlug('crud')
    let id = 0

    await test.step('Create user', async () => {
      const res = await usersClient!.createUser({
        name: slug,
        email: `${slug}@example.com`,
        gender: 'male',
        status: UserStatus.ACTIVE,
      })
      await UsersValidator.expectUserSuccess(res, HttpStatus.CREATED)
      id = (await res.json()).id
      // Safety net: track so worker teardown cleans up if a later step fails
      // before the delete step runs.
      usersProvisioner!.track(id)
    })

    await test.step('Get by id and verify field match', async () => {
      const res = await usersClient!.getUser(id)
      await UsersValidator.expectUserSuccess(res)
      expect(await res.json()).toMatchObject({ id, name: slug, email: `${slug}@example.com` })
    })

    await test.step('Update status to inactive', async () => {
      const res = await usersClient!.updateUser(id, { status: UserStatus.INACTIVE })
      await UsersValidator.expectUserSuccess(res)
      expect((await res.json()).status).toBe(UserStatus.INACTIVE)
    })

    await test.step('Delete user', async () => {
      const res = await usersClient!.deleteUser(id)
      await UsersValidator.expectDeleteSuccess(res)
    })

    await test.step('Verify user is gone', async () => {
      const res = await usersClient!.getUser(id)
      await UsersValidator.expectMessageError(res, HttpStatus.NOT_FOUND, UserMessage.NOT_FOUND)
    })
  },
)
