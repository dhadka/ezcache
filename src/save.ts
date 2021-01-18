import * as core from '@actions/core'
import { handlers } from './registry'
import { inputs } from './settings'

require('./handlers/all')
require('./providers/all')

async function run() {
  let type = inputs.getString('type')
  let version = inputs.getString('version')
  let provider = inputs.getString('provider')

  for (const handler of await handlers.getAll(type)) {
    core.info(`Saving cache with ${handler.constructor.name} handler`)
    await handler.saveCache({ version, provider })
  }
}

run().catch((e) => {
  core.error(e)
  core.setFailed(e)
})
