import { registry, CacheHandler } from '../../registry'
import { hashFiles, exec, runner, matches } from '../../expressions'

class NPM extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return [await exec('npm', 'config', 'get', 'cache')]
    }

    async getKey(): Promise<string> {
        return `${runner.os}-node-${await hashFiles('**/package-lock.json')}`
    }

    async getRestoreKeys(): Promise<string[]> {
        return [`${runner.os}-node-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/package-lock.json')
    }
}

registry.add("npm", new NPM())