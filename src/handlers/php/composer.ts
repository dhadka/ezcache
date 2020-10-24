import { registry } from '../../registry'
import { hashFiles, exec, runner, matches } from '../../expressions'
import { CacheHandler } from '../../handler'

class Composer extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return [await exec('composer', 'config', 'cache-files-dir')]
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-composer-${await hashFiles('**/composer.lock')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-composer-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('**/composer.lock')
  }
}

registry.add('composer', new Composer())
