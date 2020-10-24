import { registry, CacheHandler } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'

class SPM extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['.build']
    }

    async getKey(): Promise<string> {
        return `${runner.os}-spm-${await hashFiles('**/Package.resolved')}`
    }

    async getRestoreKeys(): Promise<string[]> {
        return [`${runner.os}-spm-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/Package.resolved')
    }
}

registry.add("spm", new SPM())