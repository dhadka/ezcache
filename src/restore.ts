import * as core from '@actions/core'
import { registry } from './registry'

// Explicit list of all handlers so they are compiled by ncc.
require('./handlers/go/go')
require('./handlers/java/gradle')
require('./handlers/java/maven')
require('./handlers/node/npm')
require('./handlers/node/yarn')
require('./handlers/php/composer')
require('./handlers/python/pip')
require('./handlers/r/renv')
require('./handlers/ruby/bundler')
require('./handlers/rust/cargo')
require('./handlers/scala/sbt')
require('./handlers/swift/carthage')
require('./handlers/swift/cocoapods')
require('./handlers/swift/spm')

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