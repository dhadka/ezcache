import * as core from '@actions/core'
import { registry } from './registry'

require('./handlers/all')

async function run() {
    let type = core.getInput('type', {required: true})
    let version = core.getInput('version')

    for (const handler of await registry.getAll(type)) {
        console.log(`Saving cache with ${handler.constructor.name} handler`)
        await handler.saveCache({ version })
    }
}

run().catch(e => {
    console.error(e)
    core.setFailed(e)
})