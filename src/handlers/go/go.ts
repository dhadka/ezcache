import { registry, CacheHandler } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'

class Go extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['~/go/pkg/mod']
    }

    async getKey(): Promise<string> {
        return `${runner.os}-go-${await hashFiles('**/go.sum')}`
    }

    async getRestoreKeys(): Promise<string[]> {
        return [`${runner.os}-go-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/go.sum')
    }
}

registry.add("go", new Go())