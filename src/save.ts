import * as core from '@actions/core'
import { registry } from './registry'

require('./handlers/all')

async function run() {
  let type = core.getInput('type')
  let version = core.getInput('version')
  let provider = core.getInput('provider')

  for (const handler of await registry.getAll(type)) {
    core.info(`Saving cache with ${handler.constructor.name} handler`)
    await handler.saveCache({ version, provider })
  }
}

run().catch((e) => {
  core.error(e)
  core.setFailed(e)
})
