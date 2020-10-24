import { registry, CacheHandler } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'

class Cocoapods extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['Pods']
    }

    async getKey(): Promise<string> {
        return `${runner.os}-pods-${await hashFiles('**/Podfile.lock')}`
    }

    async getRestoreKeys(): Promise<string[]> {
        return [`${runner.os}-pods-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/Podfile.lock')
    }
}

registry.add("cocoapods", new Cocoapods())