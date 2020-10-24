import { registry } from '../../registry'
import { hashFiles, exec, runner, matches } from '../../expressions'
import { CacheHandler } from '../../handler'

class NPM extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return [await exec('npm', 'config', 'get', 'cache')]
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-node-${await hashFiles('**/package-lock.json')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-node-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('**/package-lock.json')
  }
}

registry.add('npm', new NPM())
