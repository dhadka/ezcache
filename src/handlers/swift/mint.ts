import { handlers } from '../../registry'
import { hashFiles, matches, runner } from '../../expressions'
import { CacheHandler } from '../../handler'

class Mint extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return ['mint']
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-mint-${await hashFiles('**/Mintfile')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-mint-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('**/Mintfile')
  }
}

handlers.add('mint', new Mint())
