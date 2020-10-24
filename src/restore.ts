import * as core from '@actions/core'
import { registry } from './registry'

require('./handlers/all')

async function run() {
    try {
        let type = core.getInput('type', {required: true})
        let version = core.getInput('version')

        if (type === 'auto') {
            for (const handler of registry.all()) {
                if (await handler.shouldCache()) {
                    console.log(`Restoring cache with ${handler.constructor.name} handler`)
                    await handler.setup()
                    await handler.restoreCache({ version })
                }
            }
        } else {
            const handler = registry.get(type)

            if (handler) {
                await handler.setup()
                await handler.restoreCache({ version })
            }
        }
    } catch (error) {
        console.error(error)
    }
}

run()