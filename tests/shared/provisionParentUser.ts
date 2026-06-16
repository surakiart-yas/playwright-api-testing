import { UsersClient } from '@services/users/UsersClient'
import { Gender, UserStatus } from '@services/users/types'
import { autotestSlug } from '@utils/test-data'

/**
 * Create the parent `user` that posts/comments/todos all nest under. Shared by their
 * provisioners' `ensureParentUser()` (was duplicated identically in all three before this
 * extraction) — only the slug prefix differs per caller.
 */
export async function provisionParentUser(users: UsersClient, slugPrefix: string): Promise<number> {
  const slug = autotestSlug(slugPrefix)
  const res = await users.createUser({
    name: slug,
    email: `${slug}@example.com`,
    gender: Gender.MALE,
    status: UserStatus.ACTIVE,
  })
  const json = await res.json()
  if (res.status() !== 201 || typeof json?.id !== 'number') {
    throw new Error(`Provisioning parent user failed: HTTP ${res.status()} ${JSON.stringify(json)}`)
  }
  return json.id
}
