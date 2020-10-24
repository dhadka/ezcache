import * as core from '@actions/core'
import { registry } from './registry'
import { RestoreType } from './handler'

require('./handlers/all')

async function run() {
    let type = core.getInput('type', {required: true})
    let version = core.getInput('version')
    let isFullRestore = true

    for (const handler of registry.getAll(type)) {
        console.log(`Restoring cache with ${handler.constructor.name} handler`)
        await handler.setup()
        const result = await handler.restoreCache({ version })

        if (result.type != RestoreType.Full) {
            isFullRestore = false
        }
    }

    core.setOutput('cache-hit', isFullRestore)
}

run().catch(e => {
    console.error(e)
    core.setFailed(e)
})