import * as core from '@actions/core'
import { handlers } from './registry'
import { RestoreType } from './handler'
import { combineRestoreType } from './utils'
import { inputs } from './settings'

require('./handlers/all')
require('./providers/all')

async function run() {
  let type = inputs.getString('type')
  let version = inputs.getString('version')
  let provider = inputs.getString('provider')
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
