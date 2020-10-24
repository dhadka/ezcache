import * as core from '@actions/core'
import { registry } from './registry'

require('./handlers/all')

async function run() {
    try {
        let type = core.getInput('type', {required: true})

        if (type === 'auto') {
            for (const handler of registry.all()) {
                if (await handler.shouldCache()) {
                    console.log(`Restoring cache with ${handler.constructor.name} handler`)
                    await handler.setup()
                    await handler.restoreCache()
                }
            }
        } else {
            const handler = registry.get(type)

            if (handler) {
                await handler.setup()
                await handler.restoreCache()
            }
        }
    } catch (error) {
        console.error(error)
    }
}

run()