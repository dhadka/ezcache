import { handlers } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'
import { CacheHandler } from '../../handler'

class Nuget extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return ['~/.nuget/packages']
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-nuget-${await hashFiles('**/packages.lock.json')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-nuget-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('**/packages.lock.json')
  }
}

handlers.add('nuget', new Nuget())
