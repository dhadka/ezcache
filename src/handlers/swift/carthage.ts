import { registry, CacheHandler } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'

class Carthage extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['Carthage']
    }

    async getKey(): Promise<string> {
        return `${runner.os}-carthage-${await hashFiles('**/Cartfile.resolved')}`
    }

    async getRestoreKeys(): Promise<string[]> {
        return [`${runner.os}-carthage-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/Cartfile.resolved')
    }
}

registry.add("carthage", new Carthage())