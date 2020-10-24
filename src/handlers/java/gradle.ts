import { registry, CacheHandler } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'

class Gradle extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['~/.gradle/caches', '~/.gradle/wrapper']
    }

    async getKey(version?: string): Promise<string> {
        return `${runner.os}-${version}-gradle-${await hashFiles('**/*.gradle')}`
    }

    async getRestoreKeys(version?: string): Promise<string[]> {
        return [`${runner.os}-${version}-gradle-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/*.gradle')
    }
}

registry.add("gradle", new Gradle())