import { registry, CacheHandler } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'

class Cocoapods extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['Pods']
    }

    async getKey(version?: string): Promise<string> {
        return `${runner.os}-${version}-pods-${await hashFiles('**/Podfile.lock')}`
    }

    async getRestoreKeys(version?: string): Promise<string[]> {
        return [`${runner.os}-${version}-pods-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/Podfile.lock')
    }
}

registry.add("cocoapods", new Cocoapods())