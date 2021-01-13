import { handlers } from '../../registry'
import { hashFiles, runner, matches } from '../../expressions'
import { CacheHandler } from '../../handler'

class Poetry extends CacheHandler {
  async getPaths(): Promise<string[]> {
    return ['~/.cache/pypoetry']
  }

  async getKey(version?: string): Promise<string> {
    return `${runner.os}-${version}-poetry-${await hashFiles('**/poetry.lock')}`
  }

  async getRestoreKeys(version?: string): Promise<string[]> {
    return [`${runner.os}-${version}-poetry-`]
  }

  async shouldCache(): Promise<boolean> {
    return await matches('**/poetry.lock')
  }
}

handlers.add('poetry', new Poetry())
