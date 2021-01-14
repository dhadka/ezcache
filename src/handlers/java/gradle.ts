import { handlers } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'
import { CacheHandler } from '../../handler'

class Gradle extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return ['~/.gradle/caches', '~/.gradle/wrapper']
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-gradle-${await hashFiles(['**/*.gradle', '**/gradle-wrapper.properties'])}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-gradle-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches(['**/*.gradle', '**/gradle-wrapper.properties'])
  }
}

handlers.add('gradle', new Gradle())
