import { registry } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'
import { CacheHandler } from '../../handler'

class Sbt extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return ['~/.ivy2/cache', '~/.sbt']
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-sbt-${await hashFiles('**/build.sbt')}`
  }

  async shouldCache(): Promise<boolean> {
    return await matches('**/build.sbt')
  }
}

registry.add('sbt', new Sbt())
