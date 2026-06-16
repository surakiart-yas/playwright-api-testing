import { test as base, expect } from '@fixtures/base'
import { loadApiConfig } from '@config/api-config'
import { TodosClient } from '@services/todos/TodosClient'
import { TodosValidator } from '@services/todos/TodosValidator'
import { TodosProvisioner } from './provisioner'
import { getGoRestToken, gorestConfig } from '../helpers'

export { expect, TodosValidator }

type TodosFixtures = {
  todosClient: TodosClient | undefined
  publicClient: TodosClient
}

type TodosWorkerFixtures = {
  todosProvisioner: TodosProvisioner | undefined
}

export const test = base.extend<TodosFixtures, TodosWorkerFixtures>({
  todosClient: async ({ apiConfig, workerRequest }, use, testInfo) => {
    const token = getGoRestToken()
    await use(
      token ? new TodosClient(gorestConfig(apiConfig, token), workerRequest, testInfo) : undefined,
    )
  },

  publicClient: async ({ apiConfig, workerRequest }, use, testInfo) => {
    await use(new TodosClient(gorestConfig(apiConfig), workerRequest, testInfo))
  },

  todosProvisioner: [
    async ({ workerRequest }, use) => {
      const token = getGoRestToken()
      if (!token) {
        await use(undefined)
        return
      }
      const provisioner = new TodosProvisioner(gorestConfig(loadApiConfig(), token), workerRequest)
      await use(provisioner)
      await provisioner.cleanup()
    },
    { scope: 'worker' },
  ],
})
