import * as core from '@actions/core'
import { handlers } from './registry'
import { RestoreType } from './handler'
import { combineRestoreType } from './utils'

require('./handlers/all')
require('./providers/all')

async function run() {
  let type = core.getInput('type')
  let version = core.getInput('version')
  let provider = core.getInput('provider')
  let results = []

  for (const handler of await handlers.getAll(type)) {
    core.info(`Restoring cache with ${handler.constructor.name} handler`)
    await handler.setup()
    const result = await handler.restoreCache({ version, provider })

    results.push(result.type)
  }

  const finalResult = combineRestoreType(...results)
  core.setOutput('cache-restore-type', finalResult.toString().toLowerCase())
  core.setOutput('cache-hit', finalResult === RestoreType.Full)
}

run().catch((e) => {
  core.error(e)
  core.setFailed(e)
})
