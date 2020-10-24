import * as core from '@actions/core'
import { registry } from './registry'

require('./handlers/all')

async function run() {
    try {
        let type = core.getInput('type', {required: true})

        if (type === 'auto') {
            for (const handler of registry.all()) {
                if (await handler.shouldCache()) {
                    console.log(`Saving cache with ${handler.constructor.name} handler`)
                    await handler.saveCache()
                }
            }
        } else {
            const handler = registry.get(type)

            if (handler) {
                await handler.saveCache()
            }
        }
    } catch (error) {
        console.error(error)
    }
}

run()