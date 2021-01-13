import * as core from '@actions/core'
import { registry } from './registry'
import { RestoreType } from './handler'

require('./handlers/all')

export async function run() {
  let type = core.getInput('type', { required: true })
  let version = core.getInput('version')
  let provider = core.getInput('provider')
  let isFullRestore = true

  for (const handler of await registry.getAll(type)) {
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
