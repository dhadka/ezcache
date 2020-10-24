import { registry, CacheHandler } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'

class Maven extends CacheHandler {
    async getPaths(): Promise<string[]> {
        return ['~/.m2/repository']
    }

    async getKey(): Promise<string> {
        return `${runner.os}-maven-${await hashFiles('**/pom.xml')}`
    }

    async getRestoreKeys(): Promise<string[]> {
        return [`${runner.os}-maven-`]
    }

    async shouldCache(): Promise<boolean> {
        return await matches('**/pom.xml')
    }
}

registry.add("maven", new Maven())