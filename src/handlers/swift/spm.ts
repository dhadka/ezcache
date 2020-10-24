import { registry } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'
import { CacheHandler } from '../../handler'

class SPM extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['.build']
    }

    async getKey(version?: string): Promise<string> {
        return `${runner.os}-${version}-spm-${await hashFiles('**/Package.resolved')}`
    }

    async getRestoreKeys(version?: string): Promise<string[]> {
        return [`${runner.os}-${version}-spm-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/Package.resolved')
    }
}

registry.add("spm", new SPM())