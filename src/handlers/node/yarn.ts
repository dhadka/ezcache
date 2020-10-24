import { registry, CacheHandler } from '../../registry'
import { hashFiles, exec, matches, runner } from '../../expressions'

class Yarn extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return [await exec('yarn', 'cache', 'dir')]
    }

    async getKey(): Promise<string> {
        return `${runner.os}-yarn-${await hashFiles('**/yarn.lock')}`
    }

    async getRestoreKeys(): Promise<string[]> {
        return [`${runner.os}-yarn-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/yarn.lock')
    }
}

registry.add("yarn", new Yarn())