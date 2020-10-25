import { registry } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'
import { CacheHandler } from '../../handler'

class Mix extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return ['deps']
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-mix-${await hashFiles('mix.lock')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-mix-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('mix.lock')
  }
}

registry.add('mix', new Mix())
