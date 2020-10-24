import { registry, CacheHandler } from '../../registry'
import { hashFiles, exec, runner, matches } from '../../expressions'
      
class Composer extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return [await exec('composer', 'config', 'cache-files-dir')]
  }
      
  async getKey(): Promise<string> {
    return `${runner.os}-composer-${await hashFiles('**/composer.lock')}`
  }
      
  async getRestoreKeys(): Promise<string[]> {
    return [`${runner.os}-composer-`]
  }
      
  async shouldCache(): Promise<boolean> {
    return await matches('**/composer.lock')
  }
}
      
registry.add("composer", new Composer())