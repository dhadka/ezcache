import { registry, CacheHandler } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'

class Go extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['~/go/pkg/mod']
    }

    async getKey(version?: string): Promise<string> {
        return `${runner.os}-${version}-go-${await hashFiles('**/go.sum')}`
    }

    async getRestoreKeys(version?: string): Promise<string[]> {
        return [`${runner.os}-${version}-go-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/go.sum')
    }
}

registry.add("go", new Go())