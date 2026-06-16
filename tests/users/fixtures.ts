import { test as base, expect } from '@fixtures/base'
import { loadApiConfig } from '@config/api-config'
import { UsersClient } from '@services/users/UsersClient'
import { UsersValidator } from '@services/users/UsersValidator'
import { UsersProvisioner } from './provisioner'
import { getGoRestToken, gorestConfig } from '../helpers'

export { expect, UsersValidator }

type UsersFixtures = {
  // Token-bearing client — undefined when GOREST_TOKEN is unset; every test gates on it
  // with test.skip (degrade gracefully: a missing credential must never produce red).
  usersClient: UsersClient | undefined
  // Tokenless client — drives the "no auth → 401" negative. Still only used in tests
  // that are token-gated, so the suite makes zero network calls when GoRest is off.
  publicClient: UsersClient
}

type UsersWorkerFixtures = {
  usersProvisioner: UsersProvisioner | undefined
}

export const test = base.extend<UsersFixtures, UsersWorkerFixtures>({
  usersClient: async ({ apiConfig, workerRequest }, use, testInfo) => {
    const token = getGoRestToken()
    await use(
      token ? new UsersClient(gorestConfig(apiConfig, token), workerRequest, testInfo) : undefined,
    )
  },

  publicClient: async ({ apiConfig, workerRequest }, use, testInfo) => {
    await use(new UsersClient(gorestConfig(apiConfig), workerRequest, testInfo))
  },

  usersProvisioner: [
    async ({ workerRequest }, use) => {
      const token = getGoRestToken()
      if (!token) {
        await use(undefined)
        return
      }
      const provisioner = new UsersProvisioner(gorestConfig(loadApiConfig(), token), workerRequest)
      await use(provisioner)
      await provisioner.cleanup()
    },
    { scope: 'worker' },
  ],
})
