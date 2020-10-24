import { registry, CacheHandler } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'

class Carthage extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['Carthage']
    }

    async getKey(version?: string): Promise<string> {
        return `${runner.os}-${version}-carthage-${await hashFiles('**/Cartfile.resolved')}`
    }

    async getRestoreKeys(version?: string): Promise<string[]> {
        return [`${runner.os}-${version}-carthage-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/Cartfile.resolved')
    }
}

registry.add("carthage", new Carthage())