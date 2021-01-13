import * as core from '@actions/core'
import { handlers } from './registry'
import { RestoreType } from './handler'

require('./handlers/all')
require('./providers/all')

async function run() {
  let type = core.getInput('type')
  let version = core.getInput('version')
  let provider = core.getInput('provider')
  let isFullRestore = true

  for (const handler of await handlers.getAll(type)) {
    core.info(`Restoring cache with ${handler.constructor.name} handler`)
    await handler.setup()
    const result = await handler.restoreCache({ version, provider })

    if (result.type != RestoreType.Full) {
      isFullRestore = false
    }
  }

  core.setOutput('cache-hit', isFullRestore)
}

run().catch((e) => {
  core.error(e)
  core.setFailed(e)
})
