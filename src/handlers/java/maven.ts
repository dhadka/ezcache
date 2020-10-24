import { registry } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'
import { CacheHandler } from '../../handler'

class Maven extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return ['~/.m2/repository']
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-maven-${await hashFiles('**/pom.xml')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-maven-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('**/pom.xml')
  }
}

registry.add('maven', new Maven())
