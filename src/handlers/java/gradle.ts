import { registry, CacheHandler } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'

class Gradle extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['~/.gradle/caches', '~/.gradle/wrapper']
    }

    async getKey(): Promise<string> {
        return `${runner.os}-gradle-${await hashFiles('**/*.gradle')}`
    }

    async getRestoreKeys(): Promise<string[]> {
        return [`${runner.os}-gradle-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/*.gradle')
    }
}

registry.add("gradle", new Gradle())